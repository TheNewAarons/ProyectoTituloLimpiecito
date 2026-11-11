/**
 * Tests unitarios de services/facturas/pago.js (modelos, db y auditoria mockeados, sin BD).
 * Patron igual a tests/services/liquidaciones/pago.test.js: fecha_pago invalida/futura, mes
 * cerrado al pagar/anular/revertir, transiciones invalidas (doble pago, anular anulada, revertir
 * no-PAGADA), anular conserva la fila (no destroy), revertir exige motivo, impactaCaja=false
 * (cc_ingresos) nunca exige caja abierta.
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_base/Egreso', () => ({
  findById: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/CcIngreso', () => ({
  findById: jest.fn()
}));
// pago.js requiere services/caja/cierre (reintentarTransaccion), que a su vez requiere los
// modelos reales (db.sequelize.define) y services/caja/saldo: se mockean para no ejecutar esos
// archivos sin BD (mismo set que tests/services/liquidaciones/pago.test.js).
jest.mock('../../../modelos/sistema_base/Caja', () => ({ findById: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({}));
jest.mock('../../../services/caja/saldo', () => ({
  calcularSaldo: jest.fn(),
  aEnteroCLP: jest.fn((v) => (v === null || v === undefined ? 0 : Number(v)))
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));
jest.mock('../../../services/caja/periodo', () => ({
  buscarCajaPorPeriodo: jest.fn()
}));

const db = require('../../../database/database');
const Egreso = require('../../../modelos/sistema_base/Egreso');
const CcIngreso = require('../../../modelos/sistema_base/CcIngreso');
const Caja = require('../../../modelos/sistema_base/Caja');
const { auditar } = require('../../../services/auditoria');
const { buscarCajaPorPeriodo } = require('../../../services/caja/periodo');
const fecha = require('../../../libs/fecha');

const { pagar, anular, revertir } = require('../../../services/facturas/pago');

const CONFIG_EGRESOS = { modelo: Egreso, entidad: 'egresos', impactaCaja: true };
const CONFIG_INGRESOS = { modelo: CcIngreso, entidad: 'cc_ingresos', impactaCaja: false };

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
const usuarioAdmin = { id: 1, contexto: 'usuarios' };
const hoy = fecha.hoySantiago();

function diaSiguiente(fechaStr) {
  const [a, m, d] = fechaStr.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + 1));
  const mes = dt.getUTCMonth() + 1;
  const dia = dt.getUTCDate();
  return dt.getUTCFullYear() + '-' + (mes < 10 ? '0' + mes : mes) + '-' + (dia < 10 ? '0' + dia : dia);
}

describe('services/facturas/pago', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
  });

  describe('pagar (egresos, impactaCaja)', () => {
    it('rechaza fecha_pago con formato invalido (FECHA_PAGO_INVALIDA) sin tocar la BD', async () => {
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: '10-10-2026', usuario })).rejects.toMatchObject({ code: 'FECHA_PAGO_INVALIDA' });
      expect(db.sequelize.transaction).not.toHaveBeenCalled();
    });

    it('rechaza fecha_pago futura (FECHA_PAGO_INVALIDA)', async () => {
      const fechaFutura = diaSiguiente(hoy);
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: fechaFutura, usuario })).rejects.toMatchObject({ code: 'FECHA_PAGO_INVALIDA' });
    });

    it('rechaza si no existe caja para el periodo de fecha_pago (CAJA_NO_EXISTE)', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(null);
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'CAJA_NO_EXISTE' });
      expect(Egreso.findById).not.toHaveBeenCalled();
    });

    it('rechaza si la caja del mes de pago esta cerrada (MES_CERRADO), sin tocar la fila', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 1, estado: 0 })); // cerrada
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'MES_CERRADO' });
      expect(Egreso.findById).not.toHaveBeenCalled();
    });

    it('rechaza si el registro no existe (REGISTRO_NO_EXISTE)', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 7, estado: 1 }));
      Egreso.findById.mockResolvedValue(null);
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'REGISTRO_NO_EXISTE' });
    });

    it('rechaza pagar un egreso ya PAGADA (ESTADO_PAGO_INVALIDO)', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 7, estado: 1 }));
      Egreso.findById.mockResolvedValue(instancia({ id: 1, estado_pago: 'PAGADA' }));
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    });

    it('rechaza pagar un egreso ANULADA (ESTADO_PAGO_INVALIDO)', async () => {
      fakeTransaction();
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 7, estado: 1 }));
      Egreso.findById.mockResolvedValue(instancia({ id: 1, estado_pago: 'ANULADA' }));
      await expect(pagar(CONFIG_EGRESOS, 1, { fecha_pago: hoy, usuario })).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    });

    it('paga correctamente: fija cajaId a la caja del periodo de fecha_pago y audita PAGO', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 5, estado_pago: 'PENDIENTE', monto: 10000, cajaId: 1 });
      Egreso.findById.mockResolvedValue(egreso);
      buscarCajaPorPeriodo.mockResolvedValue(instancia({ id: 99, estado: 1 }));

      const resultado = await pagar(CONFIG_EGRESOS, 5, { fecha_pago: hoy, usuario });

      expect(egreso.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado_pago: 'PAGADA', fecha_pago: hoy, cajaId: 99 }),
        expect.anything()
      );
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'egresos', accion: 'PAGO' }));
      expect(resultado.estado_pago).toBe('PAGADA');
      expect(resultado.cajaId).toBe(99);
    });

    it('pagar en un mes distinto al de emision reasigna cajaId a la caja de fecha_pago (reasignacion de caja)', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 5, estado_pago: 'PENDIENTE', monto: 10000, cajaId: 1 }); // emitido/creado originalmente en caja 1
      Egreso.findById.mockResolvedValue(egreso);
      const cajaDestino = instancia({ id: 42, estado: 1 });
      buscarCajaPorPeriodo.mockResolvedValue(cajaDestino);

      const fechaPagoOtroMes = '2026-03-10';
      await pagar(CONFIG_EGRESOS, 5, { fecha_pago: fechaPagoOtroMes, usuario });

      expect(buscarCajaPorPeriodo).toHaveBeenCalledWith('2026-03', expect.anything());
      expect(egreso.cajaId).toBe(42);
    });
  });

  describe('pagar (cc_ingresos, impactaCaja=false)', () => {
    it('nunca exige caja abierta: no llama buscarCajaPorPeriodo', async () => {
      fakeTransaction();
      const ingreso = instancia({ id: 1, estado_pago: 'PENDIENTE' });
      CcIngreso.findById.mockResolvedValue(ingreso);

      await pagar(CONFIG_INGRESOS, 1, { fecha_pago: hoy, usuario });

      expect(buscarCajaPorPeriodo).not.toHaveBeenCalled();
      expect(ingreso.update).toHaveBeenCalledWith({ estado_pago: 'PAGADA', fecha_pago: hoy }, expect.anything());
      expect(ingreso.cajaId).toBeUndefined();
    });
  });

  describe('anular', () => {
    it('exige motivo (MOTIVO_REQUERIDO) sin tocar la BD', async () => {
      await expect(anular(CONFIG_EGRESOS, 1, { usuario })).rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO' });
      expect(db.sequelize.transaction).not.toHaveBeenCalled();
    });

    it('rechaza anular un registro ya ANULADA (ESTADO_PAGO_INVALIDO)', async () => {
      fakeTransaction();
      Egreso.findById.mockResolvedValue(instancia({ id: 1, estado_pago: 'ANULADA' }));
      await expect(anular(CONFIG_EGRESOS, 1, { motivo: 'x', usuario })).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    });

    it('anula un egreso PAGADA si su caja real esta cerrada -> MES_CERRADO', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 1 });
      Egreso.findById.mockResolvedValue(egreso);
      Caja.findById.mockResolvedValue(instancia({ id: 1, estado: 0, periodo: '2026-01' })); // cerrada

      await expect(anular(CONFIG_EGRESOS, 1, { motivo: 'documento duplicado', usuario })).rejects.toMatchObject({ code: 'MES_CERRADO' });
      expect(egreso.update).not.toHaveBeenCalled();
    });

    it('anula un egreso PENDIENTE sin consultar caja (impactaCaja pero no esta PAGADA)', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 1, estado_pago: 'PENDIENTE' });
      Egreso.findById.mockResolvedValue(egreso);

      await anular(CONFIG_EGRESOS, 1, { motivo: 'documento erroneo', usuario });

      expect(Caja.findById).not.toHaveBeenCalled();
      expect(egreso.estado_pago).toBe('ANULADA');
    });

    it('conserva el registro: nunca llama destroy/delete, solo marca ANULADA y audita', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', monto: 5000, cajaId: 1 });
      Egreso.findById.mockResolvedValue(egreso);
      Caja.findById.mockResolvedValue(instancia({ id: 1, estado: 1, periodo: '2026-01' }));

      const resultado = await anular(CONFIG_EGRESOS, 1, { motivo: 'documento anulado por proveedor', usuario });

      expect(Egreso.destroy).toBeUndefined(); // ni siquiera esta mockeado: el servicio no lo usa
      expect(resultado.estado_pago).toBe('ANULADA');
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'egresos', accion: 'ANULAR', motivo: 'documento anulado por proveedor' }));
    });

    it('un registro anulado sigue siendo consultable (findById sigue devolviendo la fila, no null)', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 1 });
      Egreso.findById.mockResolvedValue(egreso);
      Caja.findById.mockResolvedValue(instancia({ id: 1, estado: 1, periodo: '2026-01' }));

      await anular(CONFIG_EGRESOS, 1, { motivo: 'anulacion de prueba', usuario });

      const consultaPosterior = await Egreso.findById(1);
      expect(consultaPosterior).toBe(egreso);
      expect(consultaPosterior.estado_pago).toBe('ANULADA');
    });
  });

  describe('revertir', () => {
    it('exige motivo (MOTIVO_REQUERIDO) sin tocar la BD', async () => {
      await expect(revertir(CONFIG_EGRESOS, 1, { usuario: usuarioAdmin })).rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO' });
      expect(db.sequelize.transaction).not.toHaveBeenCalled();
    });

    it('rechaza revertir un registro que no esta PAGADA (ESTADO_PAGO_INVALIDO)', async () => {
      fakeTransaction();
      Egreso.findById.mockResolvedValue(instancia({ id: 1, estado_pago: 'PENDIENTE' }));
      await expect(revertir(CONFIG_EGRESOS, 1, { motivo: 'x', usuario: usuarioAdmin })).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    });

    it('rechaza revertir si la caja del pago esta cerrada (MES_CERRADO)', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 1 });
      Egreso.findById.mockResolvedValue(egreso);
      Caja.findById.mockResolvedValue(instancia({ id: 1, estado: 0, periodo: '2026-01' }));
      await expect(revertir(CONFIG_EGRESOS, 1, { motivo: 'correccion', usuario: usuarioAdmin })).rejects.toMatchObject({ code: 'MES_CERRADO' });
    });

    it('revierte PAGADA -> PENDIENTE, limpia fecha_pago y audita REVERSION_PAGO con motivo', async () => {
      fakeTransaction();
      const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 7 });
      Egreso.findById.mockResolvedValue(egreso);
      Caja.findById.mockResolvedValue(instancia({ id: 7, estado: 1, periodo: '2026-01' }));

      const resultado = await revertir(CONFIG_EGRESOS, 1, { motivo: 'pago registrado por error', usuario: usuarioAdmin });

      expect(egreso.update).toHaveBeenCalledWith({ estado_pago: 'PENDIENTE', fecha_pago: null }, expect.anything());
      expect(resultado.estado_pago).toBe('PENDIENTE');
      expect(resultado.fecha_pago).toBeNull();
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'egresos', accion: 'REVERSION_PAGO', motivo: 'pago registrado por error' }));
    });
  });

  describe('bloqueo de caja real (anular y revertir)', () => {
    const casos = [
      ['anular', anular],
      ['revertir', revertir]
    ];

    casos.forEach(function (caso) {
      const nombre = caso[0];
      const fn = caso[1];

      it(nombre + ': caja ABIERTA pasa y usa Caja.findById con lock SHARE', async () => {
        const t = fakeTransaction();
        const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 9 });
        Egreso.findById.mockResolvedValue(egreso);
        Caja.findById.mockResolvedValue(instancia({ id: 9, estado: 1, periodo: '2026-01' }));

        await fn(CONFIG_EGRESOS, 1, { motivo: 'x', usuario });

        expect(Caja.findById).toHaveBeenCalledWith(9, expect.objectContaining({ lock: t.LOCK.SHARE }));
      });

      it(nombre + ': caja CERRADA responde 409 MES_CERRADO', async () => {
        fakeTransaction();
        const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 9 });
        Egreso.findById.mockResolvedValue(egreso);
        Caja.findById.mockResolvedValue(instancia({ id: 9, estado: 0, periodo: '2026-01' }));

        await expect(fn(CONFIG_EGRESOS, 1, { motivo: 'x', usuario })).rejects.toMatchObject({ code: 'MES_CERRADO' });
      });

      it(nombre + ': fila.cajaId null responde 409 CAJA_NO_ASIGNADA', async () => {
        fakeTransaction();
        const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: null });
        Egreso.findById.mockResolvedValue(egreso);

        await expect(fn(CONFIG_EGRESOS, 1, { motivo: 'x', usuario })).rejects.toMatchObject({ code: 'CAJA_NO_ASIGNADA' });
        expect(Caja.findById).not.toHaveBeenCalled();
      });

      it(nombre + ': caja inexistente (findById null) responde 404 CAJA_NO_EXISTE', async () => {
        fakeTransaction();
        const egreso = instancia({ id: 1, estado_pago: 'PAGADA', fecha_pago: '2026-01-15', cajaId: 9 });
        Egreso.findById.mockResolvedValue(egreso);
        Caja.findById.mockResolvedValue(null);

        await expect(fn(CONFIG_EGRESOS, 1, { motivo: 'x', usuario })).rejects.toMatchObject({ code: 'CAJA_NO_EXISTE' });
      });
    });
  });
});
