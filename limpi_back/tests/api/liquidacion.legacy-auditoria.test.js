/**
 * RNF-SEC-02 — Tests legacy de liquidacion (L1/L2/L3): transaccion + auditoria.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../modelos/sistema_base/Liquidacion', () => ({ create: jest.fn(), update: jest.fn(), findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ belongsTo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Salude', () => ({}));
jest.mock('../../modelos/sistema_base/Instituto_previsione', () => ({}));
jest.mock('../../modelos/sistema_base/Seguro', () => ({}));
jest.mock('../../modelos/sistema_base/Centro_costo', () => ({ belongsTo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Cliente', () => ({}));
jest.mock('../../modelos/sistema_base/Centro_costo_trabajadore', () => ({ belongsTo: jest.fn(), update: jest.fn(), findOne: jest.fn(), findAll: jest.fn() }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));

const db = require('../../database/database');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const CentroCostoTrabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const { auditar } = require('../../services/auditoria');
const logica = require('../../api/apartado_base/liquidacion/logica');

function liqInst(data) {
  const o = Object.assign({}, data);
  o.get = jest.fn(() => Object.assign({}, o));
  o.update = jest.fn((c) => { Object.assign(o, c); return Promise.resolve(o); });
  return o;
}

const t = { LOCK: { UPDATE: 'L' } };
const ctxToken = { usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1', motivoSinToken: null };
const ctxLegacy = { usuario: { id: null, contexto: 'sistema' }, ip: null, motivoSinToken: 'LEGACY_SIN_TOKEN' };

beforeEach(() => {
  jest.clearAllMocks();
  db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb(t)));
  auditar.mockResolvedValue({});
});

describe('liquidacion: L1 crearLiquidacion', () => {
  it('crea liquidacion, vincula centro-trabajador y audita CREAR en una tx', async () => {
    const creada = liqInst({ id: 40, sueldo_base: 100 });
    Liquidacion.create.mockResolvedValue(creada);
    CentroCostoTrabajador.update.mockResolvedValue([1]);
    const r = await logica.crearLiquidacionDB({ sueldo_base: 100 }, 55, ctxToken);
    expect(r).toBe(creada);
    expect(Liquidacion.create).toHaveBeenCalledWith({ sueldo_base: 100 }, { transaction: t });
    expect(CentroCostoTrabajador.update).toHaveBeenCalledWith({ liquidacioneId: 40 }, { where: { id: 55 }, transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, usuario: ctxToken.usuario, entidad: 'liquidaciones', entidad_id: 40, accion: 'CREAR', despues: creada
    }));
  });

  it('legacy sin token audita con sistema y motivo LEGACY_SIN_TOKEN', async () => {
    Liquidacion.create.mockResolvedValue(liqInst({ id: 41 }));
    CentroCostoTrabajador.update.mockResolvedValue([1]);
    await logica.crearLiquidacionDB({}, 55, ctxLegacy);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      usuario: { id: null, contexto: 'sistema' }, motivo: 'LEGACY_SIN_TOKEN'
    }));
  });

  it('si auditar falla la promesa rechaza (rollback)', async () => {
    Liquidacion.create.mockResolvedValue(liqInst({ id: 42 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.crearLiquidacionDB({}, 55, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('liquidacion: L2 editarLiquidacion', () => {
  it('audita EDITAR con antes/despues y lock', async () => {
    const existente = liqInst({ id: 60, sueldo_base: 100 });
    const despues = liqInst({ id: 60, sueldo_base: 120 });
    Liquidacion.findById.mockResolvedValueOnce(existente).mockResolvedValueOnce(despues);
    Liquidacion.update.mockResolvedValue([1]);
    const r = await logica.editarLiquidacionDB(60, { sueldo_base: 120 }, ctxToken);
    expect(r).toEqual([1]);
    expect(Liquidacion.findById).toHaveBeenCalledWith(60, { transaction: t, lock: t.LOCK.UPDATE });
    expect(Liquidacion.update).toHaveBeenCalledWith({ sueldo_base: 120 }, { where: { id: 60 }, transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'liquidaciones', entidad_id: 60, accion: 'EDITAR',
      antes: expect.objectContaining({ sueldo_base: 100 }), despues: expect.objectContaining({ sueldo_base: 120 })
    }));
  });

  it('fila inexistente no audita', async () => {
    Liquidacion.findById.mockResolvedValue(null);
    Liquidacion.update.mockResolvedValue([0]);
    await logica.editarLiquidacionDB(60, { sueldo_base: 120 }, ctxToken);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si auditar falla la promesa rechaza', async () => {
    Liquidacion.findById.mockResolvedValue(liqInst({ id: 60, sueldo_base: 100 }));
    Liquidacion.update.mockResolvedValue([1]);
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.editarLiquidacionDB(60, { sueldo_base: 120 }, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('liquidacion: L3 cerrarLiquidacion', () => {
  it('audita EDITAR con motivo CIERRE_LIQUIDACION_LEGACY y estado en antes/despues', async () => {
    const existente = liqInst({ id: 70, estado: 1 });
    const despues = liqInst({ id: 70, estado: 0 });
    Liquidacion.findById.mockResolvedValueOnce(existente).mockResolvedValueOnce(despues);
    Liquidacion.update.mockResolvedValue([1]);
    const r = await logica.cerrarLiquidacionDB(70, ctxToken);
    expect(r).toEqual([1]);
    expect(Liquidacion.update).toHaveBeenCalledWith({ estado: 0 }, { where: { id: 70 }, transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'liquidaciones', entidad_id: 70, accion: 'EDITAR', motivo: 'CIERRE_LIQUIDACION_LEGACY',
      antes: expect.objectContaining({ estado: 1 }), despues: expect.objectContaining({ estado: 0 })
    }));
  });

  it('legacy sin token anade LEGACY_SIN_TOKEN al motivo', async () => {
    Liquidacion.findById.mockResolvedValue(liqInst({ id: 71, estado: 1 }));
    Liquidacion.update.mockResolvedValue([1]);
    await logica.cerrarLiquidacionDB(71, ctxLegacy);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      motivo: 'CIERRE_LIQUIDACION_LEGACY LEGACY_SIN_TOKEN'
    }));
  });

  it('si auditar falla la promesa rechaza', async () => {
    Liquidacion.findById.mockResolvedValue(liqInst({ id: 72, estado: 1 }));
    Liquidacion.update.mockResolvedValue([1]);
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.cerrarLiquidacionDB(72, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});
