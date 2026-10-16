/**
 * Tests unitarios de services/caja/cierre.js (modelos, db y auditoria mockeados, sin BD).
 * TASK_PLAN §1/§7 P8: cerrarMes (errores, rollback si auditar falla), reabrirMes, recalcularCascada
 * (cadena de 3 meses), reintentarTransaccion (1213/1205 -> un reintento -> CONFLICTO_CONCURRENCIA).
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_base/Caja', () => ({
  max: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({
  count: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));
jest.mock('../../../services/caja/saldo', () => ({
  calcularSaldo: jest.fn(),
  aEnteroCLP: jest.fn((v) => (v === null || v === undefined ? 0 : Number(v)))
}));

const db = require('../../../database/database');
const Caja = require('../../../modelos/sistema_base/Caja');
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo');
const { auditar } = require('../../../services/auditoria');
const { calcularSaldo } = require('../../../services/caja/saldo');

const { cerrarMes, reabrirMes, recalcularCascada, reintentarTransaccion } = require('../../../services/caja/cierre');

function instanciaCaja(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => {
    Object.assign(inst, cambios);
    return Promise.resolve(inst);
  });
  return inst;
}

function fakeTransaction() {
  const t = { LOCK: { UPDATE: 'LOCK_UPDATE', SHARE: 'LOCK_SHARE' } };
  db.sequelize.transaction.mockImplementation((opciones, callback) => {
    const cb = typeof opciones === 'function' ? opciones : callback;
    return Promise.resolve().then(() => cb(t));
  });
  return t;
}

describe('services/caja/cierre', () => {
  const usuario = { id: 1, contexto: 'usuarios' };

  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
  });

  describe('cerrarMes', () => {
    it('lanza CAJA_NO_EXISTE si el periodo no tiene caja', async () => {
      fakeTransaction();
      Caja.findAll.mockResolvedValue([]);
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({ code: 'CAJA_NO_EXISTE' });
    });

    it('lanza MES_YA_CERRADO si la caja del periodo ya está cerrada', async () => {
      fakeTransaction();
      Caja.findAll.mockResolvedValue([instanciaCaja({ id: 1, periodo: '2026-10', estado: 0 })]);
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({ code: 'MES_YA_CERRADO' });
    });

    it('lanza MES_ANTERIOR_ABIERTO si la caja N-1 sigue abierta', async () => {
      fakeTransaction();
      Caja.findAll.mockResolvedValue([
        instanciaCaja({ id: 1, periodo: '2026-09', estado: 1 }),
        instanciaCaja({ id: 2, periodo: '2026-10', estado: 1 })
      ]);
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({
        code: 'MES_ANTERIOR_ABIERTO',
        details: { periodo: '2026-09' }
      });
    });

    it('lanza CENTROS_ABIERTOS si quedan centros de costo con estado=1', async () => {
      fakeTransaction();
      Caja.findAll.mockResolvedValue([
        instanciaCaja({ id: 1, periodo: '2026-09', estado: 0, saldo_final: 50000 }),
        instanciaCaja({ id: 2, periodo: '2026-10', estado: 1 })
      ]);
      CentroCosto.count.mockResolvedValue(3);
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({
        code: 'CENTROS_ABIERTOS',
        details: { cantidad: 3 }
      });
    });

    it('cierra el mes, encadena saldo_inicial del mes siguiente nuevo y audita CIERRE + CREAR', async () => {
      fakeTransaction();
      const cajaAnterior = instanciaCaja({ id: 1, periodo: '2026-09', estado: 0, saldo_final: 50000 });
      const cajaActual = instanciaCaja({ id: 2, periodo: '2026-10', estado: 1, saldo_inicial: 0 });
      Caja.findAll.mockResolvedValue([cajaAnterior, cajaActual]);
      CentroCosto.count.mockResolvedValue(0);
      calcularSaldo.mockResolvedValue({ ingresos: 200000, egresos: { total: 80000 } });
      Caja.max.mockResolvedValue(2);
      const cajaNueva = instanciaCaja({ id: 3, periodo: '2026-11', estado: 1 });
      Caja.create.mockResolvedValue(cajaNueva);

      const resultado = await cerrarMes('2026-10', { usuario, ip: '1.1.1.1' });

      expect(cajaActual.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 0, saldo_inicial: 50000, saldo_final: 170000, total_ingreso: 200000, total_egreso: 80000 }),
        expect.anything()
      );
      expect(Caja.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 3, periodo: '2026-11', saldo_inicial: 170000 }),
        expect.anything()
      );
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'cajas', accion: 'CIERRE' }));
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'cajas', accion: 'CREAR' }));
      expect(resultado.recalculados).toEqual([]);
      expect(resultado.siguiente).toBe(cajaNueva);
    });

    it('si auditar(CIERRE) falla, propaga el error y no llega a crear/auditar el mes siguiente (rollback)', async () => {
      fakeTransaction();
      const cajaActual = instanciaCaja({ id: 2, periodo: '2026-10', estado: 1, saldo_inicial: 0 });
      Caja.findAll.mockResolvedValue([cajaActual]);
      CentroCosto.count.mockResolvedValue(0);
      calcularSaldo.mockResolvedValue({ ingresos: 1000, egresos: { total: 0 } });
      const errorAuditoria = Object.assign(new Error('fallo auditoria'), { code: 'AUDITORIA_SIN_TRANSACCION' });
      auditar.mockRejectedValueOnce(errorAuditoria);

      await expect(cerrarMes('2026-10', { usuario })).rejects.toBe(errorAuditoria);
      expect(Caja.create).not.toHaveBeenCalled();
      expect(auditar).toHaveBeenCalledTimes(1);
    });
  });

  describe('reabrirMes', () => {
    it('lanza MOTIVO_REQUERIDO sin abrir transaccion si falta motivo', async () => {
      await expect(reabrirMes('2026-10', { usuario })).rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO' });
      expect(db.sequelize.transaction).not.toHaveBeenCalled();
    });

    it('lanza MES_NO_CERRADO si la caja está abierta', async () => {
      fakeTransaction();
      Caja.findAll.mockResolvedValue([instanciaCaja({ id: 1, periodo: '2026-10', estado: 1 })]);
      await expect(reabrirMes('2026-10', { usuario, motivo: 'correccion' })).rejects.toMatchObject({ code: 'MES_NO_CERRADO' });
    });

    it('reabre la caja cerrada y audita REAPERTURA con motivo', async () => {
      fakeTransaction();
      const caja = instanciaCaja({ id: 1, periodo: '2026-10', estado: 0, saldo_final: 100, fecha_cierre: new Date(), cerrada_por: 9 });
      Caja.findAll.mockResolvedValue([caja]);

      const resultado = await reabrirMes('2026-10', { usuario, motivo: 'correccion manual' });

      expect(caja.update).toHaveBeenCalledWith(
        { estado: 1, saldo_final: null, fecha_cierre: null, cerrada_por: null },
        expect.anything()
      );
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'REAPERTURA', motivo: 'correccion manual' }));
      expect(resultado.caja).toBe(caja);
    });
  });

  describe('recalcularCascada', () => {
    it('lanza TRANSACCION_REQUERIDA si no recibe transaction', async () => {
      await expect(recalcularCascada('2026-10', { usuario })).rejects.toMatchObject({ code: 'TRANSACCION_REQUERIDA' });
    });

    it('encadena saldo_inicial en una cadena de 3 meses (cerrado, cerrado, abierto)', async () => {
      const t = { LOCK: { UPDATE: 'LOCK_UPDATE' } };
      const anclaAnterior = instanciaCaja({ id: 0, periodo: '2026-09', estado: 0, saldo_final: 1000 }); // periodo anterior

      // El movimiento congelado de una cerrada es total_ingreso - total_egreso (no saldo_final - saldo_inicial).
      const mesA = instanciaCaja({ id: 1, periodo: '2026-10', estado: 0, saldo_inicial: 500, saldo_final: 1500, total_ingreso: 1000, total_egreso: 0 }); // movimiento congelado +1000
      const mesB = instanciaCaja({ id: 2, periodo: '2026-11', estado: 0, saldo_inicial: 1500, saldo_final: 1300, total_ingreso: 0, total_egreso: 200 }); // movimiento congelado -200
      const mesC = instanciaCaja({ id: 3, periodo: '2026-12', estado: 1, saldo_inicial: 1300 }); // abierto, solo saldo_inicial

      Caja.findAll.mockResolvedValue([anclaAnterior, mesA, mesB, mesC]);
      calcularSaldo.mockResolvedValue({ ingresos: 0, egresos: { total: 0 } }); // mesC (abierto): movimiento en vivo sin impacto en la aserción

      const resultado = await recalcularCascada('2026-10', { transaction: t, usuario });

      // mesA: saldo_inicial pasa de 500 a 1000 (saldoPrevio = saldo_final del ancla), conserva movimiento +1000 -> saldo_final 2000
      expect(mesA.update).toHaveBeenCalledWith({ saldo_provisional: false, saldo_final: 2000, saldo_inicial: 1000 }, { transaction: t });
      // mesB: encadena desde el saldo_final de mesA (2000), conserva movimiento -200 -> 1800
      expect(mesB.update).toHaveBeenCalledWith({ saldo_provisional: false, saldo_final: 1800, saldo_inicial: 2000 }, { transaction: t });
      // mesC: abierto, solo saldo_inicial = saldo_final de mesB (1800), queda provisional=false (ninguna caja previa quedó abierta)
      expect(mesC.update).toHaveBeenCalledWith({ saldo_provisional: false, saldo_inicial: 1800 }, { transaction: t });

      expect(resultado).toHaveLength(3);
      expect(resultado[0]).toMatchObject({ periodo: '2026-10', saldo_inicial: 1000, saldo_final: 2000 });
      expect(resultado[2]).toMatchObject({ periodo: '2026-12', saldo_inicial: 1800, saldo_final: null });
      // los 3 meses cambiaron -> RECALCULO x3 + un resumen RECALCULO_CASCADA = 4 llamadas a auditar
      expect(auditar).toHaveBeenCalledTimes(4);
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'RECALCULO_CASCADA' }));
    });

    it('tras el backfill conserva el movimiento congelado (saldo_final - saldo_inicial) aunque total_egreso conserve el doble conteo', async () => {
      const t = { LOCK: { UPDATE: 'LOCK_UPDATE' } };
      const ancla = instanciaCaja({ id: 0, periodo: '2026-09', estado: 0, saldo_inicial: 0, saldo_final: 600, total_ingreso: 600, total_egreso: 0 });
      // La migracion dejo saldo_final = 600 + 1000 - (700 - 300) = 1200; total_egreso sigue en 700 (incluye 300 de liquidacion doble contada).
      const mes = instanciaCaja({ id: 1, periodo: '2026-10', estado: 0, saldo_inicial: 600, saldo_final: 1200, total_ingreso: 1000, total_egreso: 700 });
      Caja.findAll.mockResolvedValue([ancla, mes]);
      // Cambia el saldo final del ancla (p. ej. reapertura/recierre): 600 -> 800
      ancla.saldo_final = 800;

      await recalcularCascada('2026-10', { transaction: t, usuario });

      // movimiento congelado = +600 (no +300 que saldria de total_ingreso - total_egreso)
      expect(mes.update).toHaveBeenCalledWith({ saldo_provisional: false, saldo_final: 1400, saldo_inicial: 800 }, { transaction: t });
    });

    it('cierre legacy sin saldo_final usa total_ingreso - total_egreso como movimiento', async () => {
      const t = { LOCK: { UPDATE: 'LOCK_UPDATE' } };
      const ancla = instanciaCaja({ id: 0, periodo: '2026-09', estado: 0, saldo_inicial: 0, saldo_final: 100, total_ingreso: 100, total_egreso: 0 });
      const mes = instanciaCaja({ id: 1, periodo: '2026-10', estado: 0, saldo_inicial: 0, saldo_final: null, total_ingreso: 1000, total_egreso: 400 });
      Caja.findAll.mockResolvedValue([ancla, mes]);

      await recalcularCascada('2026-10', { transaction: t, usuario });

      expect(mes.update).toHaveBeenCalledWith({ saldo_provisional: false, saldo_final: 700, saldo_inicial: 100 }, { transaction: t });
    });

    it('no audita una caja si su saldo no cambió', async () => {
      const t = { LOCK: { UPDATE: 'LOCK_UPDATE' } };
      // sin caja anterior en la lista -> ancla null -> saldoPrevio = null -> conserva saldo_inicial
      const mesSinCambio = instanciaCaja({ id: 1, periodo: '2026-10', estado: 1, saldo_inicial: 0 });
      Caja.findAll.mockResolvedValue([mesSinCambio]);

      await recalcularCascada('2026-10', { transaction: t, usuario });

      expect(auditar).not.toHaveBeenCalled();
    });
  });

  describe('cerrarMes: cadena de 3 meses encadenados vía cierres sucesivos', () => {
    it('encadena saldo_inicial/saldo_final de mes A (negativo), B y C sin intervencion manual', async () => {
      CentroCosto.count.mockResolvedValue(0);

      // --- Mes A: 2025-01, primer mes (sin ancla), cierra en -2.000.000 exacto ---
      fakeTransaction();
      const cajaA = instanciaCaja({ id: 1, periodo: '2025-01', estado: 1, saldo_inicial: 0 });
      Caja.findAll.mockResolvedValueOnce([cajaA]);
      calcularSaldo.mockResolvedValueOnce({ ingresos: 500000, egresos: { total: 2500000 } });
      Caja.max.mockResolvedValueOnce(1);
      const cajaB = instanciaCaja({ id: 2, periodo: '2025-02', estado: 1, saldo_inicial: 0 });
      Caja.create.mockResolvedValueOnce(cajaB);

      const resultadoA = await cerrarMes('2025-01', { usuario });

      expect(cajaA.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 0, saldo_inicial: 0, saldo_final: -2000000, total_ingreso: 500000, total_egreso: 2500000 }),
        expect.anything()
      );
      expect(Caja.create).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2025-02', saldo_inicial: -2000000 }), expect.anything());
      expect(resultadoA.siguiente).toBe(cajaB);

      // --- Mes B: 2025-02, hereda -2.000.000, movimiento distinto, cierra en -500.000 ---
      fakeTransaction();
      Caja.findAll.mockResolvedValueOnce([cajaA, cajaB]);
      calcularSaldo.mockResolvedValueOnce({ ingresos: 1800000, egresos: { total: 300000 } });
      Caja.max.mockResolvedValueOnce(2);
      const cajaC = instanciaCaja({ id: 3, periodo: '2025-03', estado: 1, saldo_inicial: 0 });
      Caja.create.mockResolvedValueOnce(cajaC);

      const resultadoB = await cerrarMes('2025-02', { usuario });

      expect(cajaB.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 0, saldo_inicial: -2000000, saldo_final: -500000, total_ingreso: 1800000, total_egreso: 300000 }),
        expect.anything()
      );
      expect(Caja.create).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2025-03', saldo_inicial: -500000 }), expect.anything());
      expect(resultadoB.siguiente).toBe(cajaC);

      // --- Mes C: 2025-03, hereda -500.000, movimiento distinto, cierra en +100.000 (vuelve a positivo) ---
      fakeTransaction();
      Caja.findAll.mockResolvedValueOnce([cajaB, cajaC]);
      calcularSaldo.mockResolvedValueOnce({ ingresos: 700000, egresos: { total: 100000 } });
      Caja.max.mockResolvedValueOnce(3);
      const cajaD = instanciaCaja({ id: 4, periodo: '2025-04', estado: 1, saldo_inicial: 0 });
      Caja.create.mockResolvedValueOnce(cajaD);

      const resultadoC = await cerrarMes('2025-03', { usuario });

      expect(cajaC.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 0, saldo_inicial: -500000, saldo_final: 100000, total_ingreso: 700000, total_egreso: 100000 }),
        expect.anything()
      );
      expect(Caja.create).toHaveBeenCalledWith(expect.objectContaining({ periodo: '2025-04', saldo_inicial: 100000 }), expect.anything());
      expect(resultadoC.siguiente).toBe(cajaD);
    });
  });

  describe('cerrarMes: mes cerrado con posteriores exige reapertura y el recierre recalcula la cascada', () => {
    it('rechaza cerrar sin reabrir, y tras reabrirMes el recierre actualiza los posteriores con auditoria', async () => {
      CentroCosto.count.mockResolvedValue(0);

      const cajaA = instanciaCaja({ id: 1, periodo: '2025-01', estado: 0, saldo_final: 1000000 });
      const cajaB = instanciaCaja({ id: 2, periodo: '2025-02', estado: 0, saldo_final: 500000, saldo_inicial: 1000000, total_ingreso: 300000, total_egreso: 800000 });
      const cajaC = instanciaCaja({ id: 3, periodo: '2025-03', estado: 0, saldo_inicial: 900000, saldo_final: 1000000, total_ingreso: 200000, total_egreso: 100000 });
      const cajaD = instanciaCaja({ id: 4, periodo: '2025-04', estado: 1, saldo_inicial: 1000000 });

      // 1) Intentar cerrar el mes ya cerrado (sin reabrir) -> MES_YA_CERRADO
      fakeTransaction();
      Caja.findAll.mockResolvedValueOnce([cajaA, cajaB, cajaC, cajaD]);
      await expect(cerrarMes('2025-02', { usuario })).rejects.toMatchObject({ code: 'MES_YA_CERRADO' });
      expect(auditar).not.toHaveBeenCalled();

      // 2) Reabrir el mes con motivo
      jest.clearAllMocks();
      auditar.mockResolvedValue({ id: 1 });
      fakeTransaction();
      Caja.findAll.mockResolvedValueOnce([cajaB]);

      const resultadoReapertura = await reabrirMes('2025-02', { usuario, motivo: 'correccion de egresos de febrero' });

      expect(cajaB.update).toHaveBeenCalledWith({ estado: 1, saldo_final: null, fecha_cierre: null, cerrada_por: null }, expect.anything());
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'REAPERTURA', motivo: 'correccion de egresos de febrero' }));
      expect(resultadoReapertura.caja).toBe(cajaB);
      expect(cajaB.estado).toBe(1);

      // 3) Recierre: cerrarMes recalcula en cascada los posteriores (C y D) y lo reporta en `recalculados`
      jest.clearAllMocks();
      const t = fakeTransaction();
      CentroCosto.count.mockResolvedValue(0);
      Caja.findAll.mockResolvedValueOnce([cajaA, cajaB, cajaC, cajaD]);
      calcularSaldo.mockImplementation((periodo) => {
        if (periodo === '2025-02') return Promise.resolve({ ingresos: 300000, egresos: { total: 50000 } });
        if (periodo === '2025-04') return Promise.resolve({ ingresos: 0, egresos: { total: 0 } });
        return Promise.resolve({ ingresos: 0, egresos: { total: 0 } });
      });

      const resultadoRecierre = await cerrarMes('2025-02', { usuario });

      // Mes B se recierra: hereda saldo_final de A (1.000.000) + su propio movimiento (300.000 - 50.000)
      expect(cajaB.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 0, saldo_inicial: 1000000, saldo_final: 1250000, total_ingreso: 300000, total_egreso: 50000 }),
        expect.anything()
      );
      // Mes C (cerrado posterior): re-encadena desde el nuevo saldo_final de B, conserva su movimiento propio congelado (200.000 - 100.000)
      expect(cajaC.update).toHaveBeenCalledWith(
        { saldo_provisional: false, saldo_final: 1350000, saldo_inicial: 1250000 },
        { transaction: t }
      );
      // Mes D (abierto posterior): solo saldo_inicial, encadenado desde el nuevo saldo_final de C
      expect(cajaD.update).toHaveBeenCalledWith(
        { saldo_provisional: false, saldo_inicial: 1350000 },
        { transaction: t }
      );

      expect(resultadoRecierre.recalculados).toEqual(['2025-03', '2025-04']);
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'cajas', entidad_id: cajaB.id, accion: 'CIERRE' }));
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'cajas', entidad_id: cajaC.id, accion: 'RECALCULO' }));
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'cajas', entidad_id: cajaD.id, accion: 'RECALCULO' }));
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'RECALCULO_CASCADA' }));
    });
  });

  describe('reintentarTransaccion', () => {
    it('ejecuta sin reintentar si no hay error', async () => {
      const ejecutar = jest.fn().mockResolvedValue('ok');
      await expect(reintentarTransaccion(ejecutar)).resolves.toBe('ok');
      expect(ejecutar).toHaveBeenCalledTimes(1);
    });

    it('reintenta una vez ante deadlock (1213) y tiene éxito en el segundo intento', async () => {
      const errorDeadlock = Object.assign(new Error('deadlock'), { original: { errno: 1213 } });
      const ejecutar = jest.fn().mockRejectedValueOnce(errorDeadlock).mockResolvedValueOnce('ok-reintento');
      await expect(reintentarTransaccion(ejecutar)).resolves.toBe('ok-reintento');
      expect(ejecutar).toHaveBeenCalledTimes(2);
    });

    it('lanza CONFLICTO_CONCURRENCIA tras un segundo fallo por lock wait timeout (1205)', async () => {
      const err1 = Object.assign(new Error('lock wait'), { original: { errno: 1205 } });
      const err2 = Object.assign(new Error('lock wait otra vez'), { parent: { errno: 1205 } });
      const ejecutar = jest.fn().mockRejectedValueOnce(err1).mockRejectedValueOnce(err2);
      await expect(reintentarTransaccion(ejecutar)).rejects.toMatchObject({ code: 'CONFLICTO_CONCURRENCIA' });
      expect(ejecutar).toHaveBeenCalledTimes(2);
    });

    it('no reintenta errores que no son 1213/1205', async () => {
      const errorNegocio = Object.assign(new Error('otro'), { code: 'MES_YA_CERRADO' });
      const ejecutar = jest.fn().mockRejectedValue(errorNegocio);
      await expect(reintentarTransaccion(ejecutar)).rejects.toBe(errorNegocio);
      expect(ejecutar).toHaveBeenCalledTimes(1);
    });
  });
});
