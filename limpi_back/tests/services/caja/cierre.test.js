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
jest.mock('../../../services/caja/periodo', () => ({
  buscarCajaPorPeriodo: jest.fn()
}));
jest.mock('../../../services/caja/saldo', () => ({
  calcularSaldo: jest.fn(),
  aEnteroCLP: jest.fn((v) => (v === null || v === undefined ? 0 : Number(v)))
}));

const db = require('../../../database/database');
const Caja = require('../../../modelos/sistema_base/Caja');
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo');
const { auditar } = require('../../../services/auditoria');
const { buscarCajaPorPeriodo } = require('../../../services/caja/periodo');
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
      buscarCajaPorPeriodo.mockResolvedValue(null);
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({ code: 'CAJA_NO_EXISTE' });
    });

    it('lanza MES_YA_CERRADO si la caja del periodo ya está cerrada', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValueOnce(instanciaCaja({ id: 1, estado: 0 }));
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({ code: 'MES_YA_CERRADO' });
    });

    it('lanza MES_ANTERIOR_ABIERTO si la caja N-1 sigue abierta', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockImplementation((periodo) => {
        if (periodo === '2026-10') return Promise.resolve(instanciaCaja({ id: 2, estado: 1 }));
        if (periodo === '2026-09') return Promise.resolve(instanciaCaja({ id: 1, estado: 1 }));
        return Promise.resolve(null);
      });
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({
        code: 'MES_ANTERIOR_ABIERTO',
        details: { periodo: '2026-09' }
      });
    });

    it('lanza CENTROS_ABIERTOS si quedan centros de costo con estado=1', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockImplementation((periodo) => {
        if (periodo === '2026-10') return Promise.resolve(instanciaCaja({ id: 2, estado: 1 }));
        if (periodo === '2026-09') return Promise.resolve(instanciaCaja({ id: 1, estado: 0, saldo_final: 50000 }));
        return Promise.resolve(null);
      });
      CentroCosto.count.mockResolvedValue(3);
      await expect(cerrarMes('2026-10', { usuario })).rejects.toMatchObject({
        code: 'CENTROS_ABIERTOS',
        details: { cantidad: 3 }
      });
    });

    it('cierra el mes, encadena saldo_inicial del mes siguiente nuevo y audita CIERRE + CREAR', async () => {
      fakeTransaction();
      const cajaActual = instanciaCaja({ id: 2, estado: 1, saldo_inicial: 0 });
      buscarCajaPorPeriodo.mockImplementation((periodo) => {
        if (periodo === '2026-10') return Promise.resolve(cajaActual);
        if (periodo === '2026-09') return Promise.resolve(instanciaCaja({ id: 1, estado: 0, saldo_final: 50000 }));
        if (periodo === '2026-11') return Promise.resolve(null);
        return Promise.resolve(null);
      });
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
      const cajaActual = instanciaCaja({ id: 2, estado: 1, saldo_inicial: 0 });
      buscarCajaPorPeriodo.mockImplementation((periodo) => {
        if (periodo === '2026-10') return Promise.resolve(cajaActual);
        if (periodo === '2026-09') return Promise.resolve(null);
        return Promise.resolve(null);
      });
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
      buscarCajaPorPeriodo.mockResolvedValue(instanciaCaja({ id: 1, estado: 1 }));
      await expect(reabrirMes('2026-10', { usuario, motivo: 'correccion' })).rejects.toMatchObject({ code: 'MES_NO_CERRADO' });
    });

    it('reabre la caja cerrada y audita REAPERTURA con motivo', async () => {
      fakeTransaction();
      const caja = instanciaCaja({ id: 1, estado: 0, saldo_final: 100, fecha_cierre: new Date(), cerrada_por: 9 });
      buscarCajaPorPeriodo.mockResolvedValue(caja);

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
      buscarCajaPorPeriodo.mockResolvedValue(instanciaCaja({ id: 0, estado: 0, saldo_final: 1000 })); // periodo anterior

      const mesA = instanciaCaja({ id: 1, periodo: '2026-10', estado: 0, saldo_inicial: 500, saldo_final: 1500 }); // movimiento congelado +1000
      const mesB = instanciaCaja({ id: 2, periodo: '2026-11', estado: 0, saldo_inicial: 1500, saldo_final: 1300 }); // movimiento congelado -200
      const mesC = instanciaCaja({ id: 3, periodo: '2026-12', estado: 1, saldo_inicial: 1300 }); // abierto, solo saldo_inicial

      Caja.findAll.mockResolvedValue([mesA, mesB, mesC]);

      const resultado = await recalcularCascada('2026-10', { transaction: t, usuario });

      // mesA: saldo_inicial pasa de 500 a 1000 (saldoPrevio inicial), conserva movimiento +1000 -> saldo_final 2000
      expect(mesA.update).toHaveBeenCalledWith({ saldo_inicial: 1000, saldo_final: 2000 }, { transaction: t });
      // mesB: encadena desde el saldo_final de mesA (2000), conserva movimiento -200 -> 1800
      expect(mesB.update).toHaveBeenCalledWith({ saldo_inicial: 2000, saldo_final: 1800 }, { transaction: t });
      // mesC: abierto, solo saldo_inicial = saldo_final de mesB (1800), queda provisional
      expect(mesC.update).toHaveBeenCalledWith({ saldo_inicial: 1800, saldo_provisional: true }, { transaction: t });

      expect(resultado).toHaveLength(3);
      expect(resultado[0]).toMatchObject({ periodo: '2026-10', saldo_inicial: 1000, saldo_final: 2000 });
      expect(resultado[2]).toMatchObject({ periodo: '2026-12', saldo_inicial: 1800, saldo_final: null });
      // los 3 meses cambiaron -> se audita RECALCULO 3 veces
      expect(auditar).toHaveBeenCalledTimes(3);
    });

    it('no audita una caja si su saldo no cambió', async () => {
      const t = { LOCK: { UPDATE: 'LOCK_UPDATE' } };
      buscarCajaPorPeriodo.mockResolvedValue(null); // sin caja anterior -> saldoPrevio = 0
      const mesSinCambio = instanciaCaja({ id: 1, periodo: '2026-10', estado: 1, saldo_inicial: 0 });
      Caja.findAll.mockResolvedValue([mesSinCambio]);

      await recalcularCascada('2026-10', { transaction: t, usuario });

      expect(auditar).not.toHaveBeenCalled();
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
