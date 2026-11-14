/**
 * RNF-SEC-02 — Tests legacy de caja (C6/C7): transaccion + auditoria CREAR/EDITAR.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../modelos/sistema_base/Caja', () => ({ create: jest.fn(), update: jest.fn(), findById: jest.fn(), hasMany: jest.fn() }));
jest.mock('../../modelos/sistema_base/Centro_costo', () => ({ hasMany: jest.fn(), belongsTo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Centro_costo_trabajadore', () => ({ belongsTo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Cliente', () => ({}));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({}));
jest.mock('../../modelos/sistema_base/Lista_insumo', () => ({ hasMany: jest.fn() }));
jest.mock('../../modelos/sistema_base/Linea_insumo', () => ({ belongsTo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Producto', () => ({}));
jest.mock('../../modelos/sistema_base/CcEgreso', () => ({}));
jest.mock('../../modelos/sistema_base/Liquidacion', () => ({}));
jest.mock('../../modelos/sistema_base/Egreso', () => ({}));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));

const db = require('../../database/database');
const Caja = require('../../modelos/sistema_base/Caja');
const { auditar } = require('../../services/auditoria');
const logica = require('../../api/apartado_base/caja/logica');

function cajaInst(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((c) => { Object.assign(inst, c); return Promise.resolve(inst); });
  return inst;
}

const t = { LOCK: { UPDATE: 'L' } };
const ctxToken = { usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1', motivoSinToken: null };
const ctxLegacy = { usuario: { id: null, contexto: 'sistema' }, ip: null, motivoSinToken: 'LEGACY_SIN_TOKEN' };

describe('caja: C6 crearCaja', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb(t)));
    auditar.mockResolvedValue({});
  });

  it('audita CREAR con despues = fila creada y transaction t', async () => {
    const creada = cajaInst({ id: 1, estado: 1 });
    Caja.create.mockResolvedValue(creada);
    const r = await logica.crearCajaDB({ estado: 1 }, ctxToken);
    expect(r).toBe(creada);
    expect(Caja.create).toHaveBeenCalledWith({ estado: 1 }, { transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, usuario: ctxToken.usuario, entidad: 'cajas', entidad_id: 1,
      accion: 'CREAR', despues: creada, ip: '1.1.1.1'
    }));
  });

  it('legacy sin token audita con sistema y motivo LEGACY_SIN_TOKEN', async () => {
    Caja.create.mockResolvedValue(cajaInst({ id: 2, estado: 1 }));
    await logica.crearCajaDB({ estado: 1 }, ctxLegacy);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      usuario: { id: null, contexto: 'sistema' }, motivo: 'LEGACY_SIN_TOKEN'
    }));
  });

  it('si auditar falla la promesa rechaza (rollback)', async () => {
    Caja.create.mockResolvedValue(cajaInst({ id: 3, estado: 1 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.crearCajaDB({ estado: 1 }, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('caja: C7 editarCaja', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb(t)));
    auditar.mockResolvedValue({});
  });

  it('audita EDITAR con antes/despues y lock de fila', async () => {
    const existente = cajaInst({ id: 5, estado: 1, total_ingreso: 100 });
    const despues = cajaInst({ id: 5, estado: 0, total_ingreso: 100 });
    Caja.findById.mockResolvedValueOnce(existente).mockResolvedValueOnce(despues);
    Caja.update.mockResolvedValue([1]);
    const r = await logica.editarCajaDB(5, { estado: 0 }, ctxToken);
    expect(r).toEqual([1]);
    expect(Caja.findById).toHaveBeenCalledWith(5, { transaction: t, lock: t.LOCK.UPDATE });
    expect(Caja.update).toHaveBeenCalledWith({ estado: 0 }, { where: { id: 5 }, transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, usuario: ctxToken.usuario, entidad: 'cajas', entidad_id: 5, accion: 'EDITAR',
      antes: expect.objectContaining({ estado: 1 }), despues: expect.objectContaining({ estado: 0 })
    }));
  });

  it('fila inexistente no audita y conserva el retorno de update', async () => {
    Caja.findById.mockResolvedValue(null);
    Caja.update.mockResolvedValue([0]);
    const r = await logica.editarCajaDB(9, { estado: 0 }, ctxLegacy);
    expect(r).toEqual([0]);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si auditar falla la promesa rechaza (rollback)', async () => {
    Caja.findById.mockResolvedValue(cajaInst({ id: 6, estado: 1 }));
    Caja.update.mockResolvedValue([1]);
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.editarCajaDB(6, { estado: 0 }, ctxLegacy)).rejects.toThrow('fallo auditoria');
  });
});
