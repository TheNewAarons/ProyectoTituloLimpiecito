/**
 * RNF-SEC-02 — Tests legacy de detalle_centro (E6/E7/E8/E9, L5, B10): transaccion + auditoria.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../modelos/sistema_base/Lista_insumo', () => ({ hasMany: jest.fn(), create: jest.fn(), update: jest.fn(), findById: jest.fn(), destroy: jest.fn() }));
jest.mock('../../modelos/sistema_base/Linea_insumo', () => ({ belongsTo: jest.fn(), create: jest.fn(), findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../../modelos/sistema_base/CcEgreso', () => ({ create: jest.fn(), findById: jest.fn(), destroy: jest.fn() }));
jest.mock('../../modelos/sistema_base/CcIngreso', () => ({ create: jest.fn(), findById: jest.fn(), destroy: jest.fn() }));
jest.mock('../../modelos/sistema_base/Centro_costo_trabajadore', () => ({ create: jest.fn(), findById: jest.fn(), destroy: jest.fn() }));
jest.mock('../../modelos/sistema_base/Producto', () => ({ increment: jest.fn(), decrement: jest.fn(), findAll: jest.fn() }));
jest.mock('../../modelos/sistema_base/Centro_costo', () => ({ increment: jest.fn(), decrement: jest.fn() }));
jest.mock('../../modelos/sistema_base/Liquidacion', () => ({ findById: jest.fn(), destroy: jest.fn() }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));

const db = require('../../database/database');
const Ccegreso = require('../../modelos/sistema_base/CcEgreso');
const Ccingreso = require('../../modelos/sistema_base/CcIngreso');
const Centro_trabajador = require('../../modelos/sistema_base/Centro_costo_trabajadore');
const Producto = require('../../modelos/sistema_base/Producto');
const CentroCosto = require('../../modelos/sistema_base/Centro_costo');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const Lista_insumo = require('../../modelos/sistema_base/Lista_insumo');
const Linea_insumo = require('../../modelos/sistema_base/Linea_insumo');
const { auditar } = require('../../services/auditoria');
const logica = require('../../api/apartado_base/detalle_centro/logica');

function inst(data) {
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

describe('detalle_centro: E6 crearCCEgreso', () => {
  it('audita CREAR entidad cc_egresos con despues y transaction t', async () => {
    const creado = inst({ id: 1, monto: 100 });
    Ccegreso.create.mockResolvedValue(creado);
    const r = await logica.crearCCEgresoDB({ monto: 100 }, ctxToken);
    expect(r).toBe(creado);
    expect(Ccegreso.create).toHaveBeenCalledWith({ monto: 100 }, { transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, usuario: ctxToken.usuario, entidad: 'cc_egresos', entidad_id: 1, accion: 'CREAR', despues: creado
    }));
  });

  it('si auditar falla la promesa rechaza', async () => {
    Ccegreso.create.mockResolvedValue(inst({ id: 1 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.crearCCEgresoDB({}, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('detalle_centro: E7 eliminarCCEgreso', () => {
  it('audita ANULAR antes de destroy con BORRADO_FISICO_LEGACY', async () => {
    const fila = inst({ id: 2, monto: 100 });
    Ccegreso.findById.mockResolvedValue(fila);
    Ccegreso.destroy.mockResolvedValue(1);
    const r = await logica.eliminarCCEgresoDB(2, ctxToken);
    expect(r).toBe(1);
    expect(Ccegreso.findById).toHaveBeenCalledWith(2, { transaction: t, lock: t.LOCK.UPDATE });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'cc_egresos', entidad_id: 2, accion: 'ANULAR',
      antes: expect.objectContaining({ monto: 100 }), motivo: 'BORRADO_FISICO_LEGACY'
    }));
    expect(Ccegreso.destroy).toHaveBeenCalledWith({ where: { id: 2 }, transaction: t });
  });

  it('legacy sin token anade LEGACY_SIN_TOKEN al motivo', async () => {
    Ccegreso.findById.mockResolvedValue(inst({ id: 3 }));
    Ccegreso.destroy.mockResolvedValue(1);
    await logica.eliminarCCEgresoDB(3, ctxLegacy);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      usuario: { id: null, contexto: 'sistema' }, motivo: 'BORRADO_FISICO_LEGACY LEGACY_SIN_TOKEN'
    }));
  });

  it('fila inexistente no audita ni destruye y devuelve 0', async () => {
    Ccegreso.findById.mockResolvedValue(null);
    expect(await logica.eliminarCCEgresoDB(9, ctxToken)).toBe(0);
    expect(auditar).not.toHaveBeenCalled();
    expect(Ccegreso.destroy).not.toHaveBeenCalled();
  });

  it('si auditar falla no destruye (rollback)', async () => {
    Ccegreso.findById.mockResolvedValue(inst({ id: 4 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.eliminarCCEgresoDB(4, ctxToken)).rejects.toThrow('fallo auditoria');
    expect(Ccegreso.destroy).not.toHaveBeenCalled();
  });
});

describe('detalle_centro: E8 crearCCIngreso', () => {
  it('crea ingreso, incrementa precio_servicio y audita CREAR en una tx', async () => {
    const creado = inst({ id: 5, monto: 500, centroCostoId: 7 });
    Ccingreso.create.mockResolvedValue(creado);
    CentroCosto.increment.mockResolvedValue([1]);
    const r = await logica.crearCCIngresoDB({ monto: 500, centroCostoId: 7 }, ctxToken);
    expect(r).toBe(creado);
    expect(Ccingreso.create).toHaveBeenCalledWith({ monto: 500, centroCostoId: 7 }, { transaction: t });
    expect(CentroCosto.increment).toHaveBeenCalledWith('precio_servicio', { by: 500, where: { id: 7 }, transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'cc_ingresos', entidad_id: 5, accion: 'CREAR', despues: creado
    }));
  });

  it('si auditar falla la promesa rechaza', async () => {
    Ccingreso.create.mockResolvedValue(inst({ id: 5, monto: 500, centroCostoId: 7 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.crearCCIngresoDB({ monto: 500, centroCostoId: 7 }, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('detalle_centro: E9 eliminarCCIngreso', () => {
  it('audita ANULAR, destruye y decrementa precio_servicio en una tx', async () => {
    const fila = inst({ id: 6, monto: 500, centroCostoId: 7 });
    Ccingreso.findById.mockResolvedValue(fila);
    Ccingreso.destroy.mockResolvedValue(1);
    CentroCosto.decrement.mockResolvedValue([1]);
    const r = await logica.eliminarCCIngresoDB(6, ctxToken);
    expect(r).toBe(1);
    expect(Ccingreso.findById).toHaveBeenCalledWith(6, { transaction: t, lock: t.LOCK.UPDATE });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'cc_ingresos', entidad_id: 6, accion: 'ANULAR',
      antes: expect.objectContaining({ monto: 500 }), motivo: 'BORRADO_FISICO_LEGACY'
    }));
    expect(Ccingreso.destroy).toHaveBeenCalledWith({ where: { id: 6 }, transaction: t });
    expect(CentroCosto.decrement).toHaveBeenCalledWith('precio_servicio', { by: 500, where: { id: 7 }, transaction: t });
  });

  it('fila inexistente no audita y devuelve 0', async () => {
    Ccingreso.findById.mockResolvedValue(null);
    expect(await logica.eliminarCCIngresoDB(9, ctxToken)).toBe(0);
    expect(auditar).not.toHaveBeenCalled();
    expect(Ccingreso.destroy).not.toHaveBeenCalled();
  });

  it('si auditar falla no destruye ni decrementa (rollback)', async () => {
    Ccingreso.findById.mockResolvedValue(inst({ id: 6, monto: 500, centroCostoId: 7 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.eliminarCCIngresoDB(6, ctxToken)).rejects.toThrow('fallo auditoria');
    expect(Ccingreso.destroy).not.toHaveBeenCalled();
    expect(CentroCosto.decrement).not.toHaveBeenCalled();
  });
});

describe('detalle_centro: L5 eliminarAsociacionCentroTrabajador', () => {
  it('audita ANULAR la liquidacion realmente borrada y destruye ambas en tx', async () => {
    const liquidacion = inst({ id: 8, monto_mes: 100 });
    Liquidacion.findById.mockResolvedValue(liquidacion);
    Liquidacion.destroy.mockResolvedValue(1);
    Centro_trabajador.destroy.mockResolvedValue(1);
    const r = await logica.eliminarAsociacionCentroTrabajadorDB(8, ctxToken);
    expect(r).toBe(1);
    expect(Liquidacion.findById).toHaveBeenCalledWith(8, { transaction: t, lock: t.LOCK.UPDATE });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'liquidaciones', entidad_id: 8, accion: 'ANULAR',
      antes: expect.objectContaining({ monto_mes: 100 }), motivo: 'BORRADO_FISICO_LEGACY'
    }));
    expect(Liquidacion.destroy).toHaveBeenCalledWith({ where: { id: 8 }, transaction: t });
    expect(Centro_trabajador.destroy).toHaveBeenCalledWith({ where: { id: 8 }, transaction: t });
  });

  it('sin liquidacion no audita pero sigue eliminando', async () => {
    Liquidacion.findById.mockResolvedValue(null);
    Liquidacion.destroy.mockResolvedValue(0);
    Centro_trabajador.destroy.mockResolvedValue(1);
    const r = await logica.eliminarAsociacionCentroTrabajadorDB(8, ctxToken);
    expect(r).toBe(1);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si auditar falla no destruye (rollback)', async () => {
    Liquidacion.findById.mockResolvedValue(inst({ id: 8 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.eliminarAsociacionCentroTrabajadorDB(8, ctxToken)).rejects.toThrow('fallo auditoria');
    expect(Liquidacion.destroy).not.toHaveBeenCalled();
    expect(Centro_trabajador.destroy).not.toHaveBeenCalled();
  });
});

describe('detalle_centro: B10 crearListaInsumo', () => {
  const lineas = [
    { productoId: 2, cantidad: 3, precio: 10, total_linea: 30 },
    { productoId: 1, cantidad: 1, precio: 5, total_linea: 5 }
  ];

  it('crea lista y lineas, descuenta stock con lock ASC y audita CREAR', async () => {
    const lista = inst({ id: 100 });
    Lista_insumo.create.mockResolvedValue(lista);
    Producto.findAll.mockResolvedValue([]);
    Producto.decrement.mockResolvedValue([1]);
    Linea_insumo.create.mockResolvedValue({});
    const r = await logica.crearListaInsumoCompletoDB({ estado: 1 }, lineas, ctxToken);
    expect(r).toBe(lista);
    expect(Lista_insumo.create).toHaveBeenCalledWith({ estado: 1 }, { transaction: t });
    expect(Producto.findAll).toHaveBeenCalledWith({ where: { id: [1, 2] }, transaction: t, lock: t.LOCK.UPDATE, order: [['id', 'ASC']] });
    expect(Producto.decrement).toHaveBeenCalledTimes(2);
    expect(Linea_insumo.create).toHaveBeenCalledTimes(2);
    expect(Linea_insumo.create).toHaveBeenCalledWith(expect.objectContaining({ listaInsumoId: 100, productoId: 2 }), { transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'lista_insumos', entidad_id: 100, accion: 'CREAR',
      despues: expect.objectContaining({ id: 100, lineas: expect.any(Array) })
    }));
    expect(auditar.mock.calls[0][0].despues.lineas).toHaveLength(2);
  });

  it('si auditar falla la promesa rechaza', async () => {
    Lista_insumo.create.mockResolvedValue(inst({ id: 100 }));
    Producto.findAll.mockResolvedValue([]);
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.crearListaInsumoCompletoDB({}, lineas, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('detalle_centro: B10 aprobarListaInsumo', () => {
  it('audita EDITAR con antes/despues', async () => {
    const existente = inst({ id: 20, estado: 0 });
    const despues = inst({ id: 20, estado: 1, usuarioApruebaId: 9 });
    Lista_insumo.findById.mockResolvedValueOnce(existente).mockResolvedValueOnce(despues);
    Lista_insumo.update.mockResolvedValue([1]);
    const r = await logica.aprobarListaInsumoDB(20, 9, ctxToken);
    expect(r).toEqual([1]);
    expect(Lista_insumo.findById).toHaveBeenCalledWith(20, { transaction: t, lock: t.LOCK.UPDATE });
    expect(Lista_insumo.update).toHaveBeenCalledWith({ estado: 1, usuarioApruebaId: 9 }, { where: { id: 20 }, transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'lista_insumos', entidad_id: 20, accion: 'EDITAR',
      antes: expect.objectContaining({ estado: 0 }), despues: expect.objectContaining({ estado: 1 })
    }));
  });

  it('fila inexistente no audita', async () => {
    Lista_insumo.findById.mockResolvedValue(null);
    Lista_insumo.update.mockResolvedValue([0]);
    await logica.aprobarListaInsumoDB(20, 9, ctxToken);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si auditar falla la promesa rechaza', async () => {
    Lista_insumo.findById.mockResolvedValue(inst({ id: 20, estado: 0 }));
    Lista_insumo.update.mockResolvedValue([1]);
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.aprobarListaInsumoDB(20, 9, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});

describe('detalle_centro: B10 eliminarListaInsumo', () => {
  it('audita ANULAR antes de borrar, devuelve stock y borra lineas y lista', async () => {
    const lista = inst({ id: 30, estado: 1 });
    Lista_insumo.findById.mockResolvedValue(lista);
    Linea_insumo.findAll.mockResolvedValue([
      { productoId: 2, cantidad: 3 },
      { productoId: 1, cantidad: 1 }
    ]);
    Producto.findAll.mockResolvedValue([]);
    Producto.increment.mockResolvedValue([1]);
    Linea_insumo.destroy.mockResolvedValue(2);
    Lista_insumo.destroy.mockResolvedValue(1);
    const r = await logica.eliminarListaInsumoCompletoDB(30, ctxToken);
    expect(r).toBe(1);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, entidad: 'lista_insumos', entidad_id: 30, accion: 'ANULAR',
      antes: expect.objectContaining({ estado: 1 }), motivo: 'BORRADO_FISICO_LEGACY'
    }));
    expect(auditar.mock.calls[0][0].antes.lineas).toEqual([
      { productoId: 2, cantidad: 3 },
      { productoId: 1, cantidad: 1 }
    ]);
    expect(Producto.increment).toHaveBeenCalledTimes(2);
    expect(Linea_insumo.destroy).toHaveBeenCalledWith({ where: { listaInsumoId: 30 }, transaction: t });
    expect(Lista_insumo.destroy).toHaveBeenCalledWith({ where: { id: 30 }, transaction: t });
  });

  it('si auditar falla no devuelve stock ni borra (rollback)', async () => {
    Lista_insumo.findById.mockResolvedValue(inst({ id: 30 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.eliminarListaInsumoCompletoDB(30, ctxToken)).rejects.toThrow('fallo auditoria');
    expect(Producto.increment).not.toHaveBeenCalled();
    expect(Linea_insumo.destroy).not.toHaveBeenCalled();
    expect(Lista_insumo.destroy).not.toHaveBeenCalled();
  });
});
