/**
 * Tests unitarios de services/liquidaciones/pago.js (modelos, db y auditoria mockeados, sin BD).
 * TASK_PLAN §2/§7 P8: pagar (fecha futura, mes cerrado, doble pago, liquidacion no cerrada),
 * pagarLote (atomico, limite 500, dedupe), revertirPago (normal, historico bloqueado, motivo
 * requerido, egreso anulado logicamente sin destroy), reintento 1213/1205 -> CONFLICTO_CONCURRENCIA.
 *
 * NOTA: services/caja/cierre.js NO se mockea (solo sus dependencias: db, modelos, auditoria,
 * caja/periodo, caja/saldo) para reutilizar la implementacion real de reintentarTransaccion.
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_base/Liquidacion', () => ({
  findById: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Egreso', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  destroy: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Centro_costo_trabajadore', () => ({
  findOne: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({
  findById: jest.fn(),
  count: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => ({
  findById: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Caja', () => ({
  max: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));
jest.mock('../../../services/caja/periodo', () => ({
  buscarCajaPorPeriodo: jest.fn()
}));
jest.mock('../../../services/caja/saldo', () => ({
  calcularSaldo: jest.fn(),
  aEnteroCLP: jest.fn((v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    if (!Number.isSafeInteger(n)) throw new (require('../../../libs/app-error'))('MONTO_INVALIDO', 'monto invalido', 422, { valor: v });
    return n;
  })
}));

const db = require('../../../database/database');
const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const Egreso = require('../../../modelos/sistema_base/Egreso');
const CentroCostoTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');
const { auditar } = require('../../../services/auditoria');
const { buscarCajaPorPeriodo } = require('../../../services/caja/periodo');
const fecha = require('../../../libs/fecha');

const { pagar, pagarLote, revertirPago } = require('../../../services/liquidaciones/pago');

function instancia(data) {
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

const usuario = { id: 1, contexto: 'usuarios' };
const hoy = fecha.hoySantiago();

function diaSiguiente(fechaStr) {
  const [a, m, d] = fechaStr.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + 1));
  const mes = dt.getUTCMonth() + 1;
  const dia = dt.getUTCDate();
  return dt.getUTCFullYear() + '-' + (mes < 10 ? '0' + mes : mes) + '-' + (dia < 10 ? '0' + dia : dia);
}

describe('services/liquidaciones/pago', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
    CentroCostoTrabajador.findOne.mockResolvedValue(null); // comentario genérico por defecto
  });

  describe('pagar', () => {
    it('rechaza fecha_pago futura (FECHA_PAGO_INVALIDA)', async () => {
      fakeTransaction();
      Liquidacion.findById.mockResolvedValue(instancia({ id: 1, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'EN_ESPERA', liquido_pagar: 10000 }));
      const fechaFutura = diaSiguiente(hoy);
      await expect(pagar(1, { fecha_pago: fechaFutura, usuario })).rejects.toMatchObject({ code: 'FECHA_PAGO_INVALIDA' });
    });

    it('rechaza si la caja del mes de pago esta cerrada (MES_CERRADO)', async () => {
      fakeTransaction();
      Liquidacion.findById.mockResolvedValue(instancia({ id: 1, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'EN_ESPERA', liquido_pagar: 10000 }));
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 0 })); // cerrada
      await expect(pagar(1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'MES_CERRADO' });
    });

    it('rechaza si la liquidacion no esta cerrada (LIQUIDACION_NO_CERRADA)', async () => {
      fakeTransaction();
      Liquidacion.findById.mockResolvedValue(instancia({ id: 1, fecha_creacion: '2026-01-01', estado: 1, estado_pago: 'EN_ESPERA', liquido_pagar: 10000 }));
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));
      await expect(pagar(1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'LIQUIDACION_NO_CERRADA' });
    });

    it('rechaza el doble pago de una liquidacion ya PAGADA (ESTADO_PAGO_INVALIDO)', async () => {
      fakeTransaction();
      Liquidacion.findById.mockResolvedValue(instancia({ id: 1, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'PAGADA', liquido_pagar: 10000 }));
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));
      await expect(pagar(1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    });

    it('paga correctamente: crea egreso, actualiza liquidacion y audita PAGO + CREAR', async () => {
      fakeTransaction();
      const liquidacion = instancia({ id: 1, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'EN_ESPERA', liquido_pagar: 50000 });
      Liquidacion.findById.mockResolvedValue(liquidacion);
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 7, estado: 1 }));
      Egreso.create.mockResolvedValue(instancia({ id: 99, monto: 50000 }));

      const resultado = await pagar(1, { fecha_pago: hoy, usuario });

      expect(Egreso.create).toHaveBeenCalledWith(
        expect.objectContaining({ monto: 50000, cajaId: 7, estado: 1 }),
        expect.anything()
      );
      expect(liquidacion.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado_pago: 'PAGADA', egreso_id: 99, pagada_por: 1 }),
        expect.anything()
      );
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'liquidaciones', accion: 'PAGO' }));
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'egresos', accion: 'CREAR' }));
      expect(resultado.egreso.id).toBe(99);
    });
  });

  describe('pagarLote', () => {
    it('rechaza lote vacio (LOTE_INVALIDO)', async () => {
      await expect(pagarLote([], { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'LOTE_INVALIDO' });
    });

    it('rechaza lote con mas de 500 ids (LOTE_INVALIDO, limite)', async () => {
      const idsLargos = Array.from({ length: 501 }, (_, i) => i + 1);
      await expect(pagarLote(idsLargos, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'LOTE_INVALIDO' });
    });

    it('deduplica ids repetidos antes de procesar', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));
      Liquidacion.findById.mockImplementation((id) =>
        Promise.resolve(instancia({ id, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'EN_ESPERA', liquido_pagar: 1000 }))
      );
      Egreso.create.mockImplementation(() => Promise.resolve(instancia({ id: Math.random(), monto: 1000 })));

      const resultado = await pagarLote([3, 1, 3, 2, 1], { fecha_pago: hoy, usuario });

      expect(resultado.pagadas.sort()).toEqual([1, 2, 3]);
      // findById con lock se llama una vez por id unico (mas la lectura previa sin lock) = 2 veces por id
      expect(Liquidacion.findById).toHaveBeenCalledTimes(6);
    });

    it('es atomico: si falla el 3er pago, rechaza todo el lote (0 pagadas) y no continua con el resto', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));
      Liquidacion.findById.mockImplementation((id) => {
        if (id === 3) {
          return Promise.resolve(instancia({ id, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'PAGADA', liquido_pagar: 1000 }));
        }
        return Promise.resolve(instancia({ id, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'EN_ESPERA', liquido_pagar: 1000 }));
      });
      Egreso.create.mockImplementation(() => Promise.resolve(instancia({ id: Math.random(), monto: 1000 })));

      let errorCapturado;
      try {
        await pagarLote([1, 2, 3, 4], { fecha_pago: hoy, usuario });
      } catch (err) {
        errorCapturado = err;
      }

      expect(errorCapturado).toMatchObject({ code: 'ESTADO_PAGO_INVALIDO', details: { liquidacion_id: 3 } });
      // el id 4 (posterior al que falla) nunca se intenta pagar: no se le crea egreso
      expect(Egreso.create).toHaveBeenCalledTimes(2); // solo ids 1 y 2
    });
  });

  describe('revertirPago', () => {
    it('exige motivo (MOTIVO_REQUERIDO) sin tocar la BD', async () => {
      await expect(revertirPago(1, { usuario })).rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO' });
      expect(Liquidacion.findById).not.toHaveBeenCalled();
    });

    it('bloquea la reversion de un pago historico (PAGO_HISTORICO_NO_REVERSIBLE, egreso_id null)', async () => {
      fakeTransaction();
      const liquidacion = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', egreso_id: null });
      Liquidacion.findById.mockResolvedValue(liquidacion);
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));

      await expect(revertirPago(1, { motivo: 'error de carga', usuario })).rejects.toMatchObject({ code: 'PAGO_HISTORICO_NO_REVERSIBLE' });
    });

    it('revierte un pago normal: anula el egreso logicamente (estado=-1) sin destroy y limpia la liquidacion', async () => {
      fakeTransaction();
      const liquidacion = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', egreso_id: 55 });
      Liquidacion.findById.mockResolvedValue(liquidacion);
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));
      const egreso = instancia({ id: 55, estado: 1, monto: 1000 });
      Egreso.findById.mockResolvedValue(egreso);

      const resultado = await revertirPago(1, { motivo: 'pago duplicado', usuario });

      expect(egreso.update).toHaveBeenCalledWith({ estado: -1 }, expect.anything());
      expect(Egreso.destroy).not.toHaveBeenCalled();
      expect(liquidacion.update).toHaveBeenCalledWith(
        { estado_pago: 'EN_ESPERA', fecha_pago: null, egreso_id: null, pagada_por: null },
        expect.anything()
      );
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'liquidaciones', accion: 'REVERSION_PAGO', motivo: 'pago duplicado' }));
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'egresos', accion: 'REVERSION_PAGO' }));
      expect(resultado.egreso_anulado).toBe(egreso);
    });

    it('rechaza revertir una liquidacion que no esta PAGADA (ESTADO_PAGO_INVALIDO)', async () => {
      const liquidacion = instancia({ id: 1, estado_pago: 'EN_ESPERA', fecha_pago: null });
      Liquidacion.findById.mockResolvedValue(liquidacion);
      await expect(revertirPago(1, { motivo: 'x', usuario })).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    });
  });

  describe('concurrencia: reintento unico ante 1213/1205', () => {
    it('pagar reintenta una vez tras un deadlock (1213) de la transaccion y luego lanza CONFLICTO_CONCURRENCIA si vuelve a fallar', async () => {
      const errorDeadlock = Object.assign(new Error('deadlock'), { original: { errno: 1213 } });
      db.sequelize.transaction.mockRejectedValue(errorDeadlock);

      await expect(pagar(1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'CONFLICTO_CONCURRENCIA' });
      expect(db.sequelize.transaction).toHaveBeenCalledTimes(2);
    });

    it('pagar tiene exito en el segundo intento tras un lock wait timeout (1205) en el primero', async () => {
      const errorLockWait = Object.assign(new Error('lock wait timeout'), { original: { errno: 1205 } });
      const liquidacion = instancia({ id: 1, fecha_creacion: '2026-01-01', estado: 0, estado_pago: 'EN_ESPERA', liquido_pagar: 1000 });
      Liquidacion.findById.mockResolvedValue(liquidacion);
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 1 }));
      Egreso.create.mockResolvedValue(instancia({ id: 10, monto: 1000 }));

      let primeraLlamada = true;
      db.sequelize.transaction.mockImplementation((opciones, callback) => {
        if (primeraLlamada) {
          primeraLlamada = false;
          return Promise.reject(errorLockWait);
        }
        const cb = typeof opciones === 'function' ? opciones : callback;
        const t = { LOCK: { UPDATE: 'LOCK_UPDATE', SHARE: 'LOCK_SHARE' } };
        return Promise.resolve().then(() => cb(t));
      });

      const resultado = await pagar(1, { fecha_pago: hoy, usuario });
      expect(resultado.egreso.id).toBe(10);
      expect(db.sequelize.transaction).toHaveBeenCalledTimes(2);
    });
  });
});
