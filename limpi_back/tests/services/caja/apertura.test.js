/**
 * Tests unitarios de services/caja/apertura.js (modelos, db y auditoria mockeados, sin BD).
 * TASK_PLAN §3 K7: cron/abrirMesAutomatico ejecutado dos veces (y "concurrente" via 1062) no
 * duplica caja ni auditoría; saldo_provisional=true si el mes anterior está ABIERTO.
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_base/Caja', () => ({
  max: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));
// services/caja/cierre.js (requerido por apertura.js para bloquearCajas/buscarAncla/saldoArrastre)
// importa Centro_costo para la validación de centros abiertos de cerrarMes; se mockea igual que en
// cierre.test.js para no cargar el modelo real (Sequelize.define contra una conexión inexistente).
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({
  count: jest.fn()
}));
// services/caja/cierre.js (saldoArrastre) depende de calcularSaldo cuando el ancla está ABIERTA;
// se mockea para no arrastrar los modelos reales de Centro_costo/Egreso/Liquidacion aquí.
jest.mock('../../../services/caja/saldo', () => ({
  calcularSaldo: jest.fn(),
  aEnteroCLP: jest.fn((v) => (v === null || v === undefined ? 0 : Number(v)))
}));

const db = require('../../../database/database');
const Caja = require('../../../modelos/sistema_base/Caja');
const { auditar } = require('../../../services/auditoria');
const { calcularSaldo } = require('../../../services/caja/saldo');
const fecha = require('../../../libs/fecha');

const { abrirMesAutomatico, jobAperturaMensual } = require('../../../services/caja/apertura');

function instanciaCaja(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  return inst;
}

function fakeTransaction() {
  const t = { LOCK: { UPDATE: 'LOCK_UPDATE', SHARE: 'LOCK_SHARE' } };
  let intentos = 0;
  db.sequelize.transaction.mockImplementation((opciones, callback) => {
    const cb = typeof opciones === 'function' ? opciones : callback;
    intentos += 1;
    return Promise.resolve().then(() => cb(t));
  });
  return { t: t, intentos: function () { return intentos; } };
}

describe('services/caja/apertura', () => {
  let spyHoy;

  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
    spyHoy = jest.spyOn(fecha, 'hoySantiago').mockReturnValue('2026-10-15');
  });

  afterEach(() => {
    spyHoy.mockRestore();
  });

  it('crea la caja del mes si no existe, audita CREAR y usuario/contexto = sistema', async () => {
    fakeTransaction();
    Caja.findAll.mockResolvedValue([]); // sin cajas previas (sin ancla)
    Caja.max.mockResolvedValue(0);
    const cajaCreada = instanciaCaja({ id: 1, periodo: '2026-10', estado: 1 });
    Caja.create.mockResolvedValue(cajaCreada);

    const resultado = await abrirMesAutomatico();

    expect(resultado).toMatchObject({ creada: true, periodo: '2026-10', caja: cajaCreada });
    expect(Caja.create).toHaveBeenCalledWith(
      expect.objectContaining({ periodo: '2026-10', saldo_inicial: 0, saldo_provisional: false }),
      expect.anything()
    );
    expect(auditar).toHaveBeenCalledWith(
      expect.objectContaining({ usuario: { id: null, contexto: 'sistema' }, accion: 'CREAR', motivo: 'APERTURA_AUTOMATICA' })
    );
    expect(calcularSaldo).not.toHaveBeenCalled();
  });

  it('saldo_provisional=true si el mes anterior (ancla) sigue ABIERTO; saldo_inicial = su saldo en vivo', async () => {
    fakeTransaction();
    const mesAnteriorAbierto = instanciaCaja({ id: 1, periodo: '2026-09', estado: 1, saldo_inicial: 100 });
    Caja.findAll.mockResolvedValue([mesAnteriorAbierto]);
    Caja.max.mockResolvedValue(1);
    calcularSaldo.mockResolvedValue({ ingresos: 500, egresos: { total: 100 } });
    const cajaCreada = instanciaCaja({ id: 2, periodo: '2026-10', estado: 1 });
    Caja.create.mockResolvedValue(cajaCreada);

    const resultado = await abrirMesAutomatico();

    expect(resultado.creada).toBe(true);
    // saldo_inicial = 100 (saldo_inicial del ancla) + 500 (ingresos) - 100 (egresos) = 500
    expect(Caja.create).toHaveBeenCalledWith(
      expect.objectContaining({ periodo: '2026-10', saldo_inicial: 500, saldo_provisional: true }),
      expect.anything()
    );
  });

  it('idempotente: si la caja del periodo ya existe no crea ni audita (ejecución repetida/cron x2)', async () => {
    fakeTransaction();
    const existente = instanciaCaja({ id: 1, periodo: '2026-10', estado: 1 });
    Caja.findAll.mockResolvedValue([existente]);

    const resultado = await abrirMesAutomatico();

    expect(resultado).toEqual({ creada: false, periodo: '2026-10', caja: existente });
    expect(Caja.create).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('colisión 1062 (dos transacciones concurrentes): reintenta y en el 2do intento la caja ya existe (no duplica)', async () => {
    const control = fakeTransaction();
    const existenteTrasColision = instanciaCaja({ id: 1, periodo: '2026-10', estado: 1 });
    let llamada = 0;
    Caja.findAll.mockImplementation(function () {
      llamada += 1;
      // 1er intento: no ve la caja (otra transacción la crea justo antes del commit) -> create falla 1062.
      // 2do intento (reintentarTransaccion): la caja ya existe -> rama idempotente, sin nuevo create/auditar.
      return Promise.resolve(llamada === 1 ? [] : [existenteTrasColision]);
    });
    Caja.max.mockResolvedValue(0);
    const errorDuplicado = Object.assign(new Error('Duplicate entry'), { original: { errno: 1062 } });
    Caja.create.mockRejectedValueOnce(errorDuplicado);

    const resultado = await abrirMesAutomatico();

    expect(resultado).toEqual({ creada: false, periodo: '2026-10', caja: existenteTrasColision });
    expect(Caja.create).toHaveBeenCalledTimes(1);
    expect(auditar).not.toHaveBeenCalled();
    expect(control.intentos()).toBe(2);
  });

  it('jobAperturaMensual nunca lanza: si el servicio falla, loguea y devuelve null', async () => {
    db.sequelize.transaction.mockImplementation(function () {
      return Promise.reject(new Error('fallo inesperado de BD'));
    });
    const spyError = jest.spyOn(console, 'error').mockImplementation(function () {});

    const resultado = await jobAperturaMensual();

    expect(resultado).toBeNull();
    expect(spyError).toHaveBeenCalled();
    spyError.mockRestore();
  });

  it('jobAperturaMensual devuelve {creada, periodo} cuando el servicio tiene éxito', async () => {
    fakeTransaction();
    Caja.findAll.mockResolvedValue([]);
    Caja.max.mockResolvedValue(0);
    Caja.create.mockResolvedValue(instanciaCaja({ id: 1, periodo: '2026-10', estado: 1 }));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(function () {});

    const resultado = await jobAperturaMensual();

    expect(resultado).toEqual({ creada: true, periodo: '2026-10' });
    spyLog.mockRestore();
  });
});
