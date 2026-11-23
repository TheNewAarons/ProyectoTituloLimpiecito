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
  findAll: jest.fn()
}));
// RF-BOD-06: el stock se mueve con el kardex (probado en tests/services/bodega/kardex.test.js)
jest.mock('../../services/bodega/kardex', () => ({ registrar: jest.fn() }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../services/caja/cierre', () => ({ reintentarTransaccion: (f) => f() }));
// AUT-010: eliminarStock delega en el servicio de anulación (su lógica: tests/services/bodega/stock-rapido-anular.test.js)
jest.mock('../../services/bodega/stock-rapido-anular', () => ({ anular: jest.fn() }));

const { Op } = require('sequelize');
const db = require('../../database/database');
const Stock = require('../../modelos/sistema_base/Stock_rapido');
const Producto = require('../../modelos/sistema_base/Producto');
const { auditar } = require('../../services/auditoria');
const kardex = require('../../services/bodega/kardex');
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

  kardex.registrar.mockImplementation((o) => {
    const id = o.producto.id;
    mem.productos[id].stock = (Number(mem.productos[id].stock) || 0) + o.cantidad;
    return Promise.resolve({});
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
    kardex.registrar.mock.calls.forEach((c) => expect(c[0]).toMatchObject({ transaction: t, tipo: 'ENTRADA_MANUAL', referenciaTipo: 'stock_rapidos' }));

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

describe('stock_rapidos: eliminarStock (B9 → anulación, AUT-010)', () => {
  const anularStock = require('../../services/bodega/stock-rapido-anular');
  const MOTIVO_LEGACY = 'Anulada desde la ruta legacy /stock/eliminar';

  it('delega en el servicio de anulación con el actor del token y no borra la fila', async () => {
    anularStock.anular.mockResolvedValue({ id: 7 });
    const req = { params: { id: '7' }, usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1' };
    const res = resFalso();
    await controlador.eliminarStock(req, res);

    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Listo' });
    expect(anularStock.anular).toHaveBeenCalledWith(7, MOTIVO_LEGACY, { usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1', motivoSinToken: null });
    expect(Stock.destroy).not.toHaveBeenCalled();
    expect(kardex.registrar).not.toHaveBeenCalled();
  });

  it('sin token anula como sistema con LEGACY_SIN_TOKEN (igual que antes)', async () => {
    anularStock.anular.mockResolvedValue({ id: 7 });
    await controlador.eliminarStock({ params: { id: '7' }, ip: '1.1.1.1' }, resFalso());
    expect(anularStock.anular.mock.calls[0][2]).toEqual({ usuario: { id: null, contexto: 'sistema' }, ip: '1.1.1.1', motivoSinToken: 'LEGACY_SIN_TOKEN' });
  });

  it('un error del servicio (inexistente, ya anulada, stock insuficiente) responde res.send error, como el legacy', async () => {
    anularStock.anular.mockRejectedValue(new Error('el stock actual es menor que la cantidad de la entrada'));
    const res = resFalso();
    await controlador.eliminarStock({ params: { id: '7' } }, res);

    expect(String(res.send.mock.calls[0][0])).toContain('error');
    expect(String(res.send.mock.calls[0][0])).toContain('stock actual es menor');
    expect(res.json).not.toHaveBeenCalled();
    expect(Stock.destroy).not.toHaveBeenCalled();
  });
});
