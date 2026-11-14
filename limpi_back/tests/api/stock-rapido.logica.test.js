/**
 * RNF-SEC-02 (B8/B9) — stock_rapidos: transaccion + locks (FOR UPDATE, id ASC) + auditoria
 * (CREAR/AJUSTE/ANULAR). Mocks en memoria: la transaccion hace rollback real restaurando un
 * snapshot del stock y de las filas creadas si el callback falla.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../modelos/sistema_base/Stock_rapido', () => ({
  findById: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
  belongsTo: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Producto', () => ({
  findAll: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn()
}));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../services/caja/cierre', () => ({ reintentarTransaccion: (f) => f() }));

const { Op } = require('sequelize');
const db = require('../../database/database');
const Stock = require('../../modelos/sistema_base/Stock_rapido');
const Producto = require('../../modelos/sistema_base/Producto');
const { auditar } = require('../../services/auditoria');
const controlador = require('../../api/apartado_base/stock_rapido/controlador');

const t = { LOCK: { UPDATE: 'UPDATE' } };

let mem;

function snapshot() {
  return {
    productos: JSON.parse(JSON.stringify(mem.productos)),
    stockRapidos: JSON.parse(JSON.stringify(mem.stockRapidos)),
    nextStockId: mem.nextStockId
  };
}

function restaurar(s) {
  mem.productos = s.productos;
  mem.stockRapidos = s.stockRapidos;
  mem.nextStockId = s.nextStockId;
}

function instProducto(id) {
  const p = mem.productos[id];
  return Object.assign({}, p, { get: () => Object.assign({}, mem.productos[id]) });
}

function instStock(id) {
  const f = mem.stockRapidos[id];
  if (!f) return null;
  return Object.assign({}, f, { get: () => Object.assign({}, f) });
}

function resFalso() {
  const res = { json: jest.fn(() => res), send: jest.fn(() => res) };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mem = { productos: {}, stockRapidos: {}, nextStockId: 1 };

  db.sequelize.transaction.mockImplementation((opts, cb) => {
    const snap = snapshot();
    return Promise.resolve()
      .then(() => cb(t))
      .catch((err) => { restaurar(snap); throw err; });
  });

  auditar.mockResolvedValue({});

  Stock.create.mockImplementation((data) => {
    const id = mem.nextStockId++;
    const fila = { id: id, cantidad: data.cantidad, comentario: data.comentario, fecha: data.fecha, productoId: data.productoId };
    mem.stockRapidos[id] = fila;
    return Promise.resolve(instStock(id));
  });

  Stock.findById.mockImplementation((id) => Promise.resolve(instStock(id)));

  Stock.destroy.mockImplementation((opts) => {
    const id = opts.where.id;
    if (mem.stockRapidos[id] === undefined) return Promise.resolve(0);
    delete mem.stockRapidos[id];
    return Promise.resolve(1);
  });

  Producto.findAll.mockImplementation((opts) => {
    const ids = opts.where.id[Op.in];
    const ordenados = ids.slice().sort((a, b) => a - b);
    const filas = [];
    ordenados.forEach((id) => {
      if (mem.productos[id] !== undefined) filas.push(instProducto(id));
    });
    return Promise.resolve(filas);
  });

  Producto.increment.mockImplementation((campo, opts) => {
    const id = opts.where.id;
    if (mem.productos[id] !== undefined) {
      mem.productos[id].stock = (Number(mem.productos[id].stock) || 0) + Number(opts.by);
    }
    return Promise.resolve([1]);
  });

  Producto.decrement.mockImplementation((campo, opts) => {
    const id = opts.where.id;
    if (mem.productos[id] !== undefined) {
      mem.productos[id].stock = (Number(mem.productos[id].stock) || 0) - Number(opts.by);
    }
    return Promise.resolve([1]);
  });
});

describe('stock_rapidos: crearStock (B8)', () => {
  it('bloquea ids ASC antes de crear, un CREAR por fila y un AJUSTE por producto', async () => {
    mem.productos = { 1: { id: 1, stock: 10 }, 2: { id: 2, stock: 5 } };
    const req = {
      body: { stocks: JSON.stringify([
        { productoId: 1, cantidad: 3, comentario: 'a', fecha: '2026-11-13' },
        { productoId: 1, cantidad: 2, comentario: 'b', fecha: '2026-11-13' },
        { productoId: 2, cantidad: 4, comentario: 'c', fecha: '2026-11-13' }
      ]) },
      usuario: { id: 9, contexto: 'usuarios' },
      ip: '1.1.1.1'
    };
    const res = resFalso();
    await controlador.crearStock(req, res);

    expect(mem.productos[1].stock).toBe(15);
    expect(mem.productos[2].stock).toBe(9);

    // lock UPDATE con ids ascendentes y antes de los create
    const lockCall = Producto.findAll.mock.calls[0][0];
    expect(lockCall.where.id[Op.in]).toEqual([1, 2]);
    expect(lockCall.lock).toBe(t.LOCK.UPDATE);
    expect(Producto.findAll.mock.invocationCallOrder[0]).toBeLessThan(Stock.create.mock.invocationCallOrder[0]);

    // todas las escrituras con transaction t
    Stock.create.mock.calls.forEach((c) => expect(c[1]).toEqual({ transaction: t }));
    Producto.increment.mock.calls.forEach((c) => expect(c[1].transaction).toBe(t));

    const crea = auditar.mock.calls.filter((c) => c[0].accion === 'CREAR');
    expect(crea).toHaveLength(3);
    crea.forEach((c) => {
      expect(c[0].transaction).toBe(t);
      expect(c[0].entidad).toBe('stock_rapidos');
    });

    const ajustes = auditar.mock.calls.filter((c) => c[0].accion === 'AJUSTE');
    expect(ajustes).toHaveLength(2);
    ajustes.forEach((c) => expect(c[0].transaction).toBe(t));

    const a1 = ajustes.find((c) => c[0].entidad_id === 1);
    expect(a1[0].entidad).toBe('productos');
    expect(a1[0].antes).toEqual({ id: 1, stock: 10 });
    expect(a1[0].despues).toEqual({ id: 1, stock: 15 });

    const a2 = ajustes.find((c) => c[0].entidad_id === 2);
    expect(a2[0].entidad).toBe('productos');
    expect(a2[0].antes).toEqual({ id: 2, stock: 5 });
    expect(a2[0].despues).toEqual({ id: 2, stock: 9 });
  });

  it('si auditar falla en el ultimo paso, hace rollback y responde res.send error', async () => {
    mem.productos = { 1: { id: 1, stock: 10 } };
    auditar.mockImplementation((p) => {
      if (p.accion === 'AJUSTE') return Promise.reject(new Error('fallo auditoria'));
      return Promise.resolve({});
    });
    const req = {
      body: { stocks: JSON.stringify([
        { productoId: 1, cantidad: 3, comentario: 'a', fecha: '2026-11-13' },
        { productoId: 1, cantidad: 2, comentario: 'b', fecha: '2026-11-13' }
      ]) },
      usuario: { id: 9, contexto: 'usuarios' },
      ip: '1.1.1.1'
    };
    const res = resFalso();
    await controlador.crearStock(req, res);

    expect(res.send).toHaveBeenCalled();
    expect(String(res.send.mock.calls[0][0])).toContain('error');
    expect(res.json).not.toHaveBeenCalled();

    // rollback: stock intacto y sin filas creadas
    expect(mem.productos[1].stock).toBe(10);
    expect(Object.keys(mem.stockRapidos)).toHaveLength(0);
  });

  it('exito responde res.json({mensaje:"Listo"}) sin status explicito', async () => {
    mem.productos = { 1: { id: 1, stock: 0 } };
    const req = { body: { stocks: JSON.stringify([{ productoId: 1, cantidad: 5 }]) } };
    const res = resFalso();
    await controlador.crearStock(req, res);

    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Listo' });
    expect(res.send).not.toHaveBeenCalled();
  });
});

describe('stock_rapidos: eliminarStock (B9)', () => {
  function filaEliminar() {
    mem.productos = { 5: { id: 5, stock: 8 } };
    mem.stockRapidos = { 7: { id: 7, productoId: 5, cantidad: 3, comentario: 'x', fecha: new Date('2026-11-13') } };
    mem.nextStockId = 8;
  }

  it('audita ANULAR antes del destroy, destroy fisico, stock decrementado y AJUSTE', async () => {
    filaEliminar();
    const req = { params: { id: '7' }, usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1' };
    const res = resFalso();
    await controlador.eliminarStock(req, res);

    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Listo' });

    const anularIdx = auditar.mock.calls.findIndex((c) => c[0].accion === 'ANULAR');
    expect(anularIdx).toBeGreaterThanOrEqual(0);
    const anular = auditar.mock.calls[anularIdx][0];
    expect(anular.entidad).toBe('stock_rapidos');
    expect(anular.entidad_id).toBe(7);
    expect(anular.despues).toBeNull();
    expect(anular.antes.get()).toEqual(expect.objectContaining({
      productoId: 5, cantidad: 3, comentario: 'x', fecha: expect.any(Date)
    }));
    expect(auditar.mock.invocationCallOrder[anularIdx]).toBeLessThan(Stock.destroy.mock.invocationCallOrder[0]);

    // destroy fisico
    expect(Stock.destroy).toHaveBeenCalledWith({ where: { id: '7' }, transaction: t });
    expect(mem.stockRapidos[7]).toBeUndefined();

    // decrement
    expect(Producto.decrement).toHaveBeenCalledWith('stock', { by: 3, where: { id: 5 }, transaction: t });
    expect(mem.productos[5].stock).toBe(5);

    // AJUSTE con antes/despues
    const ajuste = auditar.mock.calls.find((c) => c[0].accion === 'AJUSTE');
    expect(ajuste).toBeTruthy();
    expect(ajuste[0].entidad).toBe('productos');
    expect(ajuste[0].antes).toEqual({ id: 5, stock: 8 });
    expect(ajuste[0].despues).toEqual({ id: 5, stock: 5 });
  });

  it('id inexistente responde error, sin destroy, sin decrement, sin auditar', async () => {
    const req = { params: { id: '999' }, usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1' };
    const res = resFalso();
    await controlador.eliminarStock(req, res);

    expect(res.send).toHaveBeenCalled();
    expect(String(res.send.mock.calls[0][0]).startsWith('error')).toBe(true);
    expect(res.json).not.toHaveBeenCalled();
    expect(Stock.destroy).not.toHaveBeenCalled();
    expect(Producto.decrement).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si auditar falla, hace rollback (fila sigue existiendo y stock intacto)', async () => {
    filaEliminar();
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    const req = { params: { id: '7' }, usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1' };
    const res = resFalso();
    await controlador.eliminarStock(req, res);

    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mem.stockRapidos[7]).toBeDefined();
    expect(mem.productos[5].stock).toBe(8);
  });
});
