/**
 * RF-BOD-02 — Tests unitarios de services/bodega/cruceStock.js (modelos, db y auditoria mockeados,
 * sin BD). Foco: cruzar/revertir (incluye el ejemplo de referencia A-B-C-D de la spec), estado
 * PARCIAL/LISTA_ENTREGA, movimientos con signo, stock NULL/negativo = 0, lista de compra y
 * generarDesdeLista (D-052…D-063, Docs/requerimientos-limpiecito.md §RF-BOD-02).
 */
// cruceStock.js arrastra services/caja/cierre.js -> modelos/sistema_base/Caja.js, que llama
// db.sequelize.define al cargar el modulo (igual que tests/services/liquidaciones/pago.test.js).
jest.mock('../../../database/database', () => ({
  sequelize: {
    transaction: jest.fn(),
    define: jest.fn(() => {
      const m = {};
      ['belongsTo', 'hasMany', 'hasOne', 'belongsToMany'].forEach((metodo) => { m[metodo] = jest.fn(() => m); });
      return m;
    })
  }
}));
jest.mock('../../../modelos/sistema_bodega/Solicitud_bodega', () => ({
  findById: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Solicitud_item', () => ({
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => ({
  create: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Producto', () => ({
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => ({
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Orden_compra', () => ({
  findAll: jest.fn(),
  count: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Orden_compra_item', () => ({
  findAll: jest.fn(),
  create: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));

const db = require('../../../database/database');
const Solicitud = require('../../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../../modelos/sistema_bodega/Solicitud_item');
const Movimiento = require('../../../modelos/sistema_bodega/Movimiento_bodega');
const Producto = require('../../../modelos/sistema_base/Producto');
const Proveedor = require('../../../modelos/sistema_bodega/Proveedor');
const Orden_compra = require('../../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../../modelos/sistema_bodega/Orden_compra_item');
const { auditar } = require('../../../services/auditoria');

const cruceStock = require('../../../services/bodega/cruceStock');
const { ESTADOS_SOLICITUD: E, TIPOS_MOVIMIENTO: M } = require('../../../services/bodega/constantes');

function instanciaProducto(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => { Object.assign(inst, cambios); return Promise.resolve(inst); });
  return inst;
}
function instanciaItem(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => { Object.assign(inst, cambios); return Promise.resolve(inst); });
  return inst;
}
function instanciaSolicitud(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => { Object.assign(inst, cambios); return Promise.resolve(inst); });
  return inst;
}

const t = { LOCK: { UPDATE: 'LOCK_UPDATE' } };
const usuario = { id: 1, contexto: 'usuarios' };

beforeEach(() => {
  jest.clearAllMocks();
  auditar.mockResolvedValue({ id: 1 });
});

describe('cruzar', () => {
  it('ejemplo de referencia A-B-C-D (spec §RF-BOD-02): a comprar 2,0,1,20 y stock final 0,3,0,0', async () => {
    // A: stock 3, pedido 5 -> asignado 3, faltante 2, stock final 0
    // B: stock 8, pedido 5 -> asignado 5, faltante 0, stock final 3
    // C: stock 0, pedido 1 -> asignado 0, faltante 1, stock final 0
    // D: stock 5, pedido 25 -> asignado 5, faltante 20, stock final 0
    const productosLock = [
      instanciaProducto({ id: 1, stock: 3 }),
      instanciaProducto({ id: 2, stock: 8 }),
      instanciaProducto({ id: 3, stock: 0 }),
      instanciaProducto({ id: 4, stock: 5 })
    ];
    const items = [
      instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 5 }),
      instanciaItem({ id: 2, producto_id: 2, cantidad_pedida: 5 }),
      instanciaItem({ id: 3, producto_id: 3, cantidad_pedida: 1 }),
      instanciaItem({ id: 4, producto_id: 4, cantidad_pedida: 25 })
    ];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PENDIENTE });

    await cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1');

    expect(items.map((i) => i.cantidad_asignada)).toEqual([3, 5, 0, 5]);
    expect(items.map((i) => i.cantidad_faltante)).toEqual([2, 0, 1, 20]);
    expect(productosLock.map((p) => p.stock)).toEqual([0, 3, 0, 0]);
    expect(solicitud.estado).toBe(E.PARCIAL); // hay al menos un faltante -> PARCIAL
  });

  it('todos los ítems sin faltante -> LISTA_ENTREGA', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: 10 })];
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 4 })];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PENDIENTE });

    await cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1');

    expect(items[0].cantidad_asignada).toBe(4);
    expect(items[0].cantidad_faltante).toBe(0);
    expect(solicitud.estado).toBe(E.LISTA_ENTREGA);
  });

  it('registra SALIDA_SOLICITUD con cantidad negativa solo cuando hay algo asignado', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: 10 }), instanciaProducto({ id: 2, stock: 0 })];
    const items = [
      instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 4 }),
      instanciaItem({ id: 2, producto_id: 2, cantidad_pedida: 2 }) // asignado 0: sin movimiento
    ];
    const solicitud = instanciaSolicitud({ id: 9, estado: E.PENDIENTE });

    await cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1');

    expect(Movimiento.create).toHaveBeenCalledTimes(1);
    expect(Movimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({ producto_id: 1, tipo: M.SALIDA_SOLICITUD, cantidad: -4, referencia_tipo: 'solicitudes_bodega', referencia_id: 9 }),
      expect.objectContaining({ transaction: t })
    );
  });

  it('stock NULL = 0 disponible: no descuenta y todo queda como faltante', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: null })];
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 3 })];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PENDIENTE });

    await cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1');

    expect(items[0].cantidad_asignada).toBe(0);
    expect(items[0].cantidad_faltante).toBe(3);
    expect(Movimiento.create).not.toHaveBeenCalled();
    expect(solicitud.estado).toBe(E.PARCIAL);
  });

  it('stock negativo = 0 disponible (no se corrige el valor almacenado)', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: -5 })];
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 2 })];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PENDIENTE });

    await cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1');

    expect(items[0].cantidad_asignada).toBe(0);
    expect(items[0].cantidad_faltante).toBe(2);
    expect(productosLock[0].update).not.toHaveBeenCalled();
  });

  it('producto no bloqueado -> 500 PRODUCTO_NO_BLOQUEADO', async () => {
    const items = [instanciaItem({ id: 1, producto_id: 99, cantidad_pedida: 1 })];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PENDIENTE });

    await expect(cruceStock.cruzar(solicitud, items, [], usuario, t, '::1')).rejects.toMatchObject({ code: 'PRODUCTO_NO_BLOQUEADO', httpStatus: 500 });
  });

  it('audita CRUCE_STOCK dentro de la misma transacción', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: 5 })];
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 2 })];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PENDIENTE });

    await cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1');

    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ transaction: t, entidad: 'solicitudes_bodega', accion: 'CRUCE_STOCK' }));
  });

  it('solicitud no PENDIENTE -> 409 ESTADO_NO_PERMITE_CRUCE, sin tocar productos ni auditoria', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: 5 })];
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_pedida: 2 })];
    const solicitud = instanciaSolicitud({ id: 1, estado: E.PARCIAL });

    await expect(cruceStock.cruzar(solicitud, items, productosLock, usuario, t, '::1')).rejects.toMatchObject({ code: 'ESTADO_NO_PERMITE_CRUCE', httpStatus: 409 });
    expect(productosLock[0].update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });
});

describe('revertir', () => {
  it('devuelve al stock solo lo asignado (no lo pedido) y registra REVERSA en positivo', async () => {
    const productosLock = [instanciaProducto({ id: 1, stock: 2 }), instanciaProducto({ id: 2, stock: 10 })];
    const items = [
      instanciaItem({ id: 1, producto_id: 1, cantidad_asignada: 3, cantidad_faltante: 1 }),
      instanciaItem({ id: 2, producto_id: 2, cantidad_asignada: 0, cantidad_faltante: 0 }) // nada que reponer
    ];
    const solicitud = instanciaSolicitud({ id: 5 });

    await cruceStock.revertir(solicitud, items, productosLock, usuario, t, '::1');

    expect(productosLock[0].stock).toBe(5); // 2 + 3 repuestos, no 2 + 1 pedido restante
    expect(productosLock[1].update).not.toHaveBeenCalled();
    expect(Movimiento.create).toHaveBeenCalledTimes(1);
    expect(Movimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({ producto_id: 1, tipo: M.REVERSA, cantidad: 3, referencia_tipo: 'solicitudes_bodega', referencia_id: 5 }),
      expect.objectContaining({ transaction: t })
    );
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'solicitudes_bodega', entidad_id: 5, accion: 'REVERSA_STOCK' }));
  });

  it('sin nada asignado en ningún ítem: no reversa, no movimiento, no auditoría', async () => {
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_asignada: 0, cantidad_faltante: 0 })];
    const solicitud = instanciaSolicitud({ id: 5 });

    await cruceStock.revertir(solicitud, items, [], usuario, t, '::1');

    expect(Movimiento.create).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('no hace doble reversa: una segunda llamada sin volver a bloquear productos ya repuestos no suma de nuevo', async () => {
    const producto = instanciaProducto({ id: 1, stock: 2 });
    const items = [instanciaItem({ id: 1, producto_id: 1, cantidad_asignada: 3, cantidad_faltante: 1 })];
    const solicitud = instanciaSolicitud({ id: 5 });

    await cruceStock.revertir(solicitud, items, [producto], usuario, t, '::1');
    expect(producto.stock).toBe(5);

    // anular() en producción solo llama revertir una vez (la solicitud ya queda ANULADA, estado final);
    // si se repitiera con el mismo item (cantidad_asignada intacta) volvería a sumar: por eso el llamador
    // no debe invocar revertir dos veces para la misma solicitud.
    await cruceStock.revertir(solicitud, items, [producto], usuario, t, '::1');
    expect(producto.stock).toBe(8);
    expect(Movimiento.create).toHaveBeenCalledTimes(2);
  });
});

describe('obtenerCruce', () => {
  it('solicitud inexistente -> 404', async () => {
    Solicitud.findById.mockResolvedValue(null);
    await expect(cruceStock.obtenerCruce(1)).rejects.toMatchObject({ code: 'SOLICITUD_NO_EXISTE', httpStatus: 404 });
  });

  it('tres tablas: pedido, descontado (asignado > 0) y falta_comprar (faltante > 0)', async () => {
    Solicitud.findById.mockResolvedValue({ id: 1, estado: 'PARCIAL' });
    Item.findAll.mockResolvedValue([
      { id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 3, cantidad_faltante: 2 },
      { id: 2, producto_id: 2, cantidad_pedida: 5, cantidad_asignada: 5, cantidad_faltante: 0 },
      { id: 3, producto_id: 3, cantidad_pedida: 1, cantidad_asignada: 0, cantidad_faltante: 1 }
    ]);
    Producto.findAll.mockResolvedValue([{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }, { id: 3, nombre: 'C' }]);

    const r = await cruceStock.obtenerCruce(1);

    expect(r.pedido.map((f) => f.cantidad)).toEqual([5, 5, 1]);
    expect(r.descontado.map((f) => ({ producto_id: f.producto_id, cantidad: f.cantidad }))).toEqual([{ producto_id: 1, cantidad: 3 }, { producto_id: 2, cantidad: 5 }]);
    expect(r.falta_comprar.map((f) => ({ producto_id: f.producto_id, cantidad: f.cantidad }))).toEqual([{ producto_id: 1, cantidad: 2 }, { producto_id: 3, cantidad: 1 }]);
    expect(r.cruzada).toBe(true); // ningún cantidad_faltante es NULL
    expect(r.revertido).toBe(false); // estado PARCIAL, no ANULADA
    expect(r.descontado.every((f) => f.revertido === false)).toBe(true);
  });

  it('solicitud ANULADA: revertido=true (en la solicitud y en descontado)', async () => {
    Solicitud.findById.mockResolvedValue({ id: 1, estado: 'ANULADA' });
    Item.findAll.mockResolvedValue([{ id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 3, cantidad_faltante: 2 }]);
    Producto.findAll.mockResolvedValue([{ id: 1, nombre: 'A' }]);

    const r = await cruceStock.obtenerCruce(1);

    expect(r.revertido).toBe(true);
    expect(r.descontado[0].revertido).toBe(true);
  });

  it('solicitud nunca cruzada (cantidad_faltante NULL): cruzada=false', async () => {
    Solicitud.findById.mockResolvedValue({ id: 1, estado: 'PENDIENTE' });
    Item.findAll.mockResolvedValue([{ id: 1, producto_id: 1, cantidad_pedida: 5, cantidad_asignada: 0, cantidad_faltante: null }]);
    Producto.findAll.mockResolvedValue([{ id: 1, nombre: 'A' }]);

    const r = await cruceStock.obtenerCruce(1);

    expect(r.cruzada).toBe(false);
  });
});

describe('listaCompra', () => {
  it('sin faltante en ninguna solicitud PARCIAL -> lista vacía', async () => {
    Solicitud.findAll.mockResolvedValue([]);
    Orden_compra.findAll.mockResolvedValue([]);
    const r = await cruceStock.listaCompra({}, undefined);
    expect(r).toEqual([]);
  });

  it('descuenta lo pendiente de órdenes ENVIADA y omite productos con neto <= 0 (sin ceros)', async () => {
    Solicitud.findAll.mockResolvedValue([{ id: 1 }]);
    Item.findAll.mockImplementation((o) => {
      // primera llamada: items de solicitudes PARCIAL (faltante); segunda: no aplica aquí
      return Promise.resolve([
        { producto_id: 1, cantidad_faltante: 10 }, // neto 10-10=0 -> se omite
        { producto_id: 2, cantidad_faltante: 5 } // neto 5-2=3 -> aparece
      ]);
    });
    Orden_compra.findAll.mockResolvedValue([{ id: 100 }]);
    Orden_compra_item.findAll.mockImplementation((o) => {
      if (o.attributes && o.attributes.indexOf('cantidad_recibida') !== -1) {
        return Promise.resolve([
          { producto_id: 1, cantidad: 10, cantidad_recibida: 0 },
          { producto_id: 2, cantidad: 2, cantidad_recibida: 0 }
        ]);
      }
      return Promise.resolve([]); // en_borrador: ninguna orden BORRADOR en este caso
    });
    Producto.findAll.mockResolvedValue([{ id: 1, nombre: 'A', stock: 0, proveedor_id: 7 }, { id: 2, nombre: 'B', stock: 1, proveedor_id: 7 }]);

    const r = await cruceStock.listaCompra({});

    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ producto_id: 2, cantidad_a_comprar: 3 });
  });

  it('BORRADOR es informativo (en_borrador) y no descuenta del neto a comprar', async () => {
    Solicitud.findAll.mockResolvedValue([{ id: 1 }]);
    Item.findAll.mockResolvedValue([{ producto_id: 1, cantidad_faltante: 5 }]);
    Orden_compra.findAll.mockImplementation((o) => {
      if (o.where.estado === 'BORRADOR') return Promise.resolve([{ id: 200 }]);
      return Promise.resolve([]); // sin ordenes ENVIADA/RECIBIDA_PARCIAL pendientes
    });
    Orden_compra_item.findAll.mockImplementation((o) => {
      if (o.attributes && o.attributes.indexOf('cantidad_recibida') !== -1) return Promise.resolve([]);
      return Promise.resolve([{ producto_id: 1, cantidad: 999 }]); // en BORRADOR, no resta
    });
    Producto.findAll.mockResolvedValue([{ id: 1, nombre: 'A', stock: 0, proveedor_id: null }]);

    const r = await cruceStock.listaCompra({});

    expect(r[0]).toMatchObject({ producto_id: 1, cantidad_a_comprar: 5, en_borrador: 999 });
  });

  it('agrupar=proveedor agrupa por proveedor_id (sin_proveedor aparte)', async () => {
    Solicitud.findAll.mockResolvedValue([{ id: 1 }]);
    Item.findAll.mockResolvedValue([
      { producto_id: 1, cantidad_faltante: 3 },
      { producto_id: 2, cantidad_faltante: 4 }
    ]);
    Orden_compra.findAll.mockResolvedValue([]);
    Orden_compra_item.findAll.mockResolvedValue([]);
    Producto.findAll.mockResolvedValue([
      { id: 1, nombre: 'A', stock: 0, proveedor_id: 7 },
      { id: 2, nombre: 'B', stock: 0, proveedor_id: null }
    ]);
    Proveedor.findAll.mockResolvedValue([{ id: 7, nombre: 'Proveedor Siete' }]);

    const r = await cruceStock.listaCompra({ agrupar: 'proveedor' });

    const porId = {};
    r.forEach((g) => { porId[g.proveedor_id === null ? 'sin_proveedor' : g.proveedor_id] = g; });
    expect(porId[7]).toMatchObject({ proveedor: 'Proveedor Siete' });
    expect(porId.sin_proveedor.productos.map((p) => p.producto_id)).toEqual([2]);
  });
});

describe('generarDesdeLista', () => {
  function fakeTransaction() {
    // RF-BOD-02 (reviewer): ahora se abre con { isolationLevel } como primer argumento.
    db.sequelize.transaction.mockImplementation((opciones, fn) => Promise.resolve().then(() => fn(t)));
  }

  it('un BORRADOR por proveedor, omite el que ya tiene BORRADOR y reporta sin proveedor', async () => {
    fakeTransaction();
    Solicitud.findAll.mockResolvedValue([{ id: 1 }]);
    Item.findAll.mockResolvedValue([
      { producto_id: 1, cantidad_faltante: 3 }, // proveedor 7 (sin borrador: se crea)
      { producto_id: 2, cantidad_faltante: 4 }, // proveedor 8 (ya con borrador: se omite)
      { producto_id: 3, cantidad_faltante: 2 } // sin proveedor
    ]);
    Orden_compra.findAll.mockImplementation((o) => (o.where.estado === 'BORRADOR' ? Promise.resolve([]) : Promise.resolve([])));
    Orden_compra_item.findAll.mockResolvedValue([]);
    Producto.findAll.mockResolvedValue([
      { id: 1, nombre: 'A', stock: 0, proveedor_id: 7 },
      { id: 2, nombre: 'B', stock: 0, proveedor_id: 8 },
      { id: 3, nombre: 'C', stock: 0, proveedor_id: null }
    ]);
    Proveedor.findAll.mockResolvedValue([{ id: 7, nombre: 'Prov7', activo: 1 }, { id: 8, nombre: 'Prov8', activo: 1 }]);
    Orden_compra.count.mockImplementation((o) => Promise.resolve(o.where.proveedor_id === 8 ? 1 : 0));
    Orden_compra.create.mockImplementation((datos) => Promise.resolve(instanciaSolicitud(Object.assign({ id: 50 }, datos))));
    Orden_compra_item.create.mockResolvedValue({});

    const r = await cruceStock.generarDesdeLista({ usuario: usuario, ip: '::1' });

    expect(r.creadas).toEqual([{ orden_id: 50, proveedor_id: 7, proveedor: 'Prov7', items: 1 }]);
    expect(r.omitidas).toEqual([{ proveedor_id: 8, proveedor: 'Prov8', productos: [expect.objectContaining({ producto_id: 2 })] }]);
    expect(r.sin_proveedor).toEqual([expect.objectContaining({ producto_id: 3 })]);
    expect(Orden_compra.create).toHaveBeenCalledTimes(1);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'ordenes_compra', accion: 'CREAR' }));
  });

  it('proveedor inactivo se reporta como sin_proveedor y no crea orden', async () => {
    fakeTransaction();
    Solicitud.findAll.mockResolvedValue([{ id: 1 }]);
    Item.findAll.mockResolvedValue([{ producto_id: 1, cantidad_faltante: 3 }]);
    Orden_compra.findAll.mockResolvedValue([]);
    Orden_compra_item.findAll.mockResolvedValue([]);
    Producto.findAll.mockResolvedValue([{ id: 1, nombre: 'A', stock: 0, proveedor_id: 7 }]);
    Proveedor.findAll.mockResolvedValue([{ id: 7, nombre: 'Prov7', activo: 0 }]);

    const r = await cruceStock.generarDesdeLista({ usuario: usuario, ip: '::1' });

    expect(r.creadas).toEqual([]);
    expect(r.sin_proveedor).toEqual([expect.objectContaining({ producto_id: 1 })]);
    expect(Orden_compra.create).not.toHaveBeenCalled();
  });

  it('lista de compra vacía -> reporte vacío sin tocar Proveedor/Orden_compra', async () => {
    fakeTransaction();
    Solicitud.findAll.mockResolvedValue([]);
    Orden_compra.findAll.mockResolvedValue([]);

    const r = await cruceStock.generarDesdeLista({ usuario: usuario, ip: '::1' });

    expect(r).toEqual({ creadas: [], omitidas: [], sin_proveedor: [] });
    expect(Orden_compra.create).not.toHaveBeenCalled();
  });
});
