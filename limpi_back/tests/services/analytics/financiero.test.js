/**
 * RF-BI-01 — Tests de services/analytics/financiero.js: funciones puras (promedio movil, regresion,
 * proyeccion, alerta) y resumen (utilidad = caja del mes, pendientes fuera de la utilidad).
 * BD y saldo mockeados; fecha.hoySantiago fijada a 2026-11-20 (mes actual 2026-11).
 */
const AppError = require('../../../libs/app-error');
const fecha = require('../../../libs/fecha');
const db = require('../../../database/database');

jest.mock('../../../services/caja/saldo', () => ({
  ...jest.requireActual('../../../services/caja/saldo'),
  calcularSaldo: jest.fn()
}));
jest.mock('../../../services/facturas/pendientes', () => ({
  resumenPendientes: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Configuracion', () => ({
  findOne: jest.fn()
}));

const { calcularSaldo } = require('../../../services/caja/saldo');
const { resumenPendientes } = require('../../../services/facturas/pendientes');
const Configuracion = require('../../../modelos/sistema_base/Configuracion');
const financiero = require('../../../services/analytics/financiero');

const CERRADA = 0;
const ABIERTA = 1;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(fecha, 'hoySantiago').mockReturnValue('2026-11-20');
  jest.spyOn(db.sequelize, 'query').mockResolvedValue([]);
  Configuracion.findOne.mockResolvedValue({ valor: '100000' });
  resumenPendientes.mockResolvedValue({
    por_cobrar: { cantidad: 0, monto_total: 0 },
    por_pagar: { cantidad: 0, monto_total: 0 }
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function fila(periodo, ingresos, egresos) {
  return { periodo: periodo, ingresos: ingresos, egresos: egresos };
}

describe('promedioMovil', () => {
  it('usa las ultimas 3 filas y redondea a CLP entero', () => {
    const historia = [fila('2026-01', 1, 1), fila('2026-02', 100, 0), fila('2026-03', 101, 0), fila('2026-04', 101, 1)];
    // ultimas 3: ingresos (100+101+101)/3=100.67 -> 101; egresos (0+0+1)/3=0.33 -> 0
    const p = financiero.promedioMovil(historia);
    expect(p).toEqual({ ingresos: 101, egresos: 0, utilidad: 101 });
    expect(Number.isInteger(p.ingresos) && Number.isInteger(p.egresos) && Number.isInteger(p.utilidad)).toBe(true);
  });
});

describe('regresionLineal', () => {
  it('serie exacta y = 100x + 1000 predice el valor exacto', () => {
    const base = financiero.periodoAIndice('2026-01');
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    const historia = meses.map(function (p) {
      const x = financiero.periodoAIndice(p) - base;
      return fila(p, 100 * x + 1000, 500);
    });
    const r = financiero.regresionLineal(historia, '2026-07');
    expect(r.periodo).toBe('2026-07');
    expect(r.ingresos).toBe(1600);
    expect(r.egresos).toBe(500);
    expect(r.utilidad).toBe(1100);
  });

  it('tolera hueco calendario (x = indice de mes, no posicion)', () => {
    // y = 100x + 1000 con x de calendario; falta 2026-03
    const base = financiero.periodoAIndice('2026-01');
    const meses = ['2026-01', '2026-02', '2026-04', '2026-05', '2026-06', '2026-07'];
    const historia = meses.map(function (p) {
      return fila(p, 100 * (financiero.periodoAIndice(p) - base) + 1000, 0);
    });
    expect(financiero.regresionLineal(historia, '2026-08').ingresos).toBe(1700);
  });
});

describe('calcularProyeccion', () => {
  [0, 1, 2].forEach(function (n) {
    it('con ' + n + ' meses de historia -> insuficiente, sin numeros', () => {
      const historia = [];
      for (let i = 0; i < n; i++) historia.push(fila('2026-0' + (i + 1), 1000, 500));
      const p = financiero.calcularProyeccion(historia, '2026-11');
      expect(p.insuficiente).toBe(true);
      expect(p.promedio_movil).toBeNull();
      expect(p.regresion).toBeNull();
      expect(p.estimacion).toBe(true);
    });
  });

  it('con 3 meses -> promedio movil, sin regresion', () => {
    const historia = [fila('2026-08', 100, 10), fila('2026-09', 200, 20), fila('2026-10', 300, 30)];
    const p = financiero.calcularProyeccion(historia, '2026-11');
    expect(p.insuficiente).toBe(false);
    expect(p.promedio_movil).toEqual({ ingresos: 200, egresos: 20, utilidad: 180 });
    expect(p.regresion).toBeNull();
  });

  it('con 6 meses -> promedio movil y regresion para el mes siguiente', () => {
    const historia = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map(function (p, i) {
      return fila(p, 100000 * (i + 1), 0);
    });
    const p = financiero.calcularProyeccion(historia, '2026-11');
    expect(p.regresion.periodo).toBe('2026-12');
    // 2026-11 (mes abierto) queda como hueco: 2026-12 esta 2 meses despues de 2026-10 -> 100000*8
    expect(p.regresion.ingresos).toBe(800000);
    expect(p.promedio_movil.ingresos).toBe(500000);
  });
});

describe('evaluarAlerta', () => {
  const suficiente = function (utilidadProm) {
    return { insuficiente: false, promedio_movil: { ingresos: 0, egresos: 0, utilidad: utilidadProm }, regresion: null };
  };
  const insuficiente = { insuficiente: true, promedio_movil: null, regresion: null };

  it('utilidad real bajo el umbral -> UTILIDAD_REAL_BAJA', () => {
    expect(financiero.evaluarAlerta(50000, suficiente(500000), 100000)).toEqual({ activa: true, umbral: 100000, motivo: 'UTILIDAD_REAL_BAJA' });
  });

  it('proyectada bajo el umbral (real ok) -> UTILIDAD_PROYECTADA_BAJA', () => {
    expect(financiero.evaluarAlerta(500000, suficiente(50000), 100000)).toEqual({ activa: true, umbral: 100000, motivo: 'UTILIDAD_PROYECTADA_BAJA' });
  });

  it('ninguna bajo el umbral -> sin alerta', () => {
    expect(financiero.evaluarAlerta(500000, suficiente(500000), 100000)).toEqual({ activa: false, umbral: 100000, motivo: null });
  });

  it('real igual al umbral no activa la alerta', () => {
    expect(financiero.evaluarAlerta(100000, insuficiente, 100000).activa).toBe(false);
  });

  it('sin historia suficiente solo evalua la utilidad real', () => {
    expect(financiero.evaluarAlerta(50000, insuficiente, 100000).motivo).toBe('UTILIDAD_REAL_BAJA');
    expect(financiero.evaluarAlerta(500000, insuficiente, 100000).activa).toBe(false);
  });
});

describe('proyeccion (consulta)', () => {
  it('pide solo cajas cerradas con periodo < mes actual y usa los ultimos 3 meses cronologicos', async () => {
    // la consulta vuelve en orden DESC (LIMIT 6); 2026-05..2026-10 con ingresos 100k..600k
    const desc = ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05'].map(function (p, i) {
      return { periodo: p, total_ingreso: String(100000 * (6 - i)), total_egreso: '100000' };
    });
    db.sequelize.query.mockResolvedValue(desc);

    const p = await financiero.proyeccion();

    expect(db.sequelize.query.mock.calls[0][1].replacements).toEqual({ cerrada: CERRADA, actual: '2026-11' });
    expect(p.meses_historia).toBe(6);
    expect(p.promedio_movil).toEqual({ ingresos: 500000, egresos: 100000, utilidad: 400000 });
    expect(p.regresion.periodo).toBe('2026-12');
  });

  it('con menos de 3 cajas cerradas -> insuficiente', async () => {
    db.sequelize.query.mockResolvedValue([
      { periodo: '2026-10', total_ingreso: '1000', total_egreso: '0' },
      { periodo: '2026-09', total_ingreso: '1000', total_egreso: '0' }
    ]);
    const p = await financiero.proyeccion();
    expect(p.insuficiente).toBe(true);
    expect(p.promedio_movil).toBeNull();
  });
});

describe('resumen', () => {
  function saldoCerrada(ingresos, egresosTotal, saldoInicial, saldoFinal) {
    return {
      periodo: '2026-03',
      cajaId: 7,
      estado: CERRADA,
      saldo_inicial: saldoInicial,
      ingresos: ingresos,
      egresos: { generales: null, centros: null, liquidaciones_historicas: null, total: egresosTotal },
      saldo_final: saldoFinal,
      provisional: false,
      pendientes: { cantidad: 0, monto: 0 }
    };
  }

  it('mes cerrado: utilidad_real.utilidad == saldo_final - saldo_inicial de la caja', async () => {
    calcularSaldo.mockResolvedValue(saldoCerrada(500000, 200000, 100000, 400000));
    const r = await financiero.resumen('2026-03');
    expect(r.utilidad_real.utilidad).toBe(400000 - 100000);
    expect(r.utilidad_real.cerrada).toBe(true);
    expect(r.saldo_acumulado).toEqual({ saldo: 400000, provisional: false });
  });

  it('mes abierto: utilidad == ingresos - egresos de calcularSaldo', async () => {
    calcularSaldo.mockResolvedValue({
      periodo: '2026-11',
      cajaId: 9,
      estado: ABIERTA,
      saldo_inicial: 100000,
      ingresos: 750000,
      egresos: { generales: 1, centros: 2, liquidaciones_historicas: 3, total: 300000 },
      saldo_final: 550000,
      provisional: true,
      pendientes: { cantidad: 0, monto: 0 }
    });
    const r = await financiero.resumen('2026-11');
    expect(r.utilidad_real.utilidad).toBe(750000 - 300000);
    expect(r.utilidad_real.cerrada).toBe(false);
    expect(r.saldo_acumulado.provisional).toBe(true);
  });

  it('sin caja del periodo -> ceros y sin error', async () => {
    calcularSaldo.mockRejectedValue(new AppError('CAJA_NO_EXISTE', 'no existe caja', 404, {}));
    const r = await financiero.resumen('2026-02');
    expect(r.utilidad_real).toEqual({ ingresos: 0, egresos: 0, utilidad: 0, cerrada: null });
    expect(r.liquidaciones_pendientes).toEqual({ cantidad: 0, monto: 0 });
  });

  it('pendientes (liquidaciones EN_ESPERA y facturas PENDIENTE) no cambian la utilidad', async () => {
    const base = saldoCerrada(500000, 200000, 100000, 400000);
    calcularSaldo.mockResolvedValue(Object.assign({}, base, { pendientes: { cantidad: 0, monto: 0 } }));
    resumenPendientes.mockResolvedValue({
      por_cobrar: { cantidad: 0, monto_total: 0 },
      por_pagar: { cantidad: 0, monto_total: 0 }
    });
    const sinPendientes = await financiero.resumen('2026-03');

    calcularSaldo.mockResolvedValue(Object.assign({}, base, { pendientes: { cantidad: 3, monto: 450000 } }));
    resumenPendientes.mockResolvedValue({
      por_cobrar: { cantidad: 2, monto_total: 800000 },
      por_pagar: { cantidad: 4, monto_total: 600000 }
    });
    const conPendientes = await financiero.resumen('2026-03');

    expect(conPendientes.utilidad_real.utilidad).toBe(sinPendientes.utilidad_real.utilidad);
    expect(conPendientes.utilidad_real.utilidad).toBe(300000);
    expect(conPendientes.liquidaciones_pendientes).toEqual({ cantidad: 3, monto: 450000 });
    expect(conPendientes.por_cobrar.monto).toBe(800000);
    expect(conPendientes.por_pagar.monto).toBe(600000);
  });

  it('expone los 7 bloques de KPI', async () => {
    calcularSaldo.mockResolvedValue(saldoCerrada(500000, 200000, 100000, 400000));
    const r = await financiero.resumen('2026-03');
    ['utilidad_real', 'saldo_acumulado', 'proyeccion', 'alerta_utilidad', 'liquidaciones_pendientes', 'por_cobrar', 'por_pagar'].forEach(function (k) {
      expect(r).toHaveProperty(k);
    });
  });
});
