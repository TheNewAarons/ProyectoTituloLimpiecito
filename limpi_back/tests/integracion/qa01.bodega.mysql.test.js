/**
 * QA-01 — Evidencias del modelo de bodega contra MySQL REAL (servicios reales, sin mocks):
 *   T1 dos solicitudes concurrentes no dejan stock negativo
 *   T2 recepción parcial en 2 recepciones con costos distintos -> 2 cabeceras, 2 ENTRADA_COMPRA y CPP esperado
 *   T3 anular una solicitud con stock asignado -> REVERSA enlazada a la salida original y con su mismo costo
 *   T5 conteo con diferencia -> AJUSTE en el kardex y stock conciliado
 * Al final, conciliarProducto (misma regla que scripts/kardex-conciliar.js) no debe dar hallazgos.
 *
 * Deshabilitado por defecto. Solo corre contra la copia desechable `aseolimp_qa01`, nunca contra oficial09:
 *   RUN_DB_TESTS=1 DATABASE_NAME=aseolimp_qa01 DATABASE_SERVER=localhost \
 *     node node_modules/jest/bin/jest.js tests/integracion/qa01 --runInBand --forceExit
 * Los datos de prueba (prefijo __TEST_QA01__) quedan en la copia: movimientos_bodega es inmutable y la BD se descarta.
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const describeDB = RUN_DB_TESTS ? describe : describe.skip;

const BD_PERMITIDA = 'aseolimp_qa01';
const PREFIJO = '__TEST_QA01__';
const ACTOR = { id: 2, contexto: 'usuarios', rol_nombre: 'Administrador', es_supervisor: false };
const CTX = { usuario: ACTOR, ip: '::1' };

describeDB('QA-01: evidencias del kardex contra MySQL (copia desechable)', () => {
  let db;
  let Producto;
  let solicitudes;
  let recepcion;
  let conteos;
  let conciliarProducto;
  let centroId;
  const tocados = [];

  const sql = (q, replacements) => db.sequelize.query(q, { replacements: replacements || [] });
  const filas = async (q, replacements) => (await sql(q, replacements))[0];
  const una = async (q, replacements) => (await filas(q, replacements))[0];

  const producto = async (nombre, stock, costo) => {
    const p = await Producto.create({ nombre: PREFIJO + nombre, estado: 1, stock: stock, precio: costo, costo_unitario: costo, proveedor_id: null });
    tocados.push(p.id);
    return p.id;
  };
  const stockDe = async (id) => Number((await una('SELECT stock FROM productos WHERE id = ?', [id])).stock);
  const movimientos = (id) => filas('SELECT * FROM movimientos_bodega WHERE producto_id = ? ORDER BY id', [id]);

  beforeAll(async () => {
    if (process.env.DATABASE_NAME !== BD_PERMITIDA) {
      throw new Error('QA-01 solo corre contra ' + BD_PERMITIDA + ' (DATABASE_NAME=' + process.env.DATABASE_NAME + ')');
    }
    db = require('../../database/database');
    Producto = require('../../modelos/sistema_base/Producto');
    solicitudes = require('../../services/bodega/solicitudes');
    recepcion = require('../../services/bodega/recepcion');
    conteos = require('../../services/bodega/conteos');
    conciliarProducto = require('../../services/bodega/conciliacion').conciliarProducto;
    const [r] = await sql("INSERT INTO centro_costos (fecha_inicio, estado, numero_cc) VALUES (NOW(), 1, 990001)");
    centroId = r;
  });

  afterAll(async () => { if (db) await db.sequelize.close(); });

  it('T1: dos solicitudes simultáneas (5 y 3) sobre stock 5 no dejan stock negativo', async () => {
    const id = await producto('T1', 5, 1000);
    const pedir = (cantidad) => solicitudes.crear({ centro_costo_id: centroId, items: [{ producto_id: id, cantidad: cantidad }], observacion: PREFIJO + 'T1' }, ACTOR, '::1');
    const creadas = await Promise.all([pedir(5), pedir(3)]);

    const asignado = await una(
      'SELECT COALESCE(SUM(cantidad_asignada), 0) AS total FROM solicitud_items WHERE producto_id = ? AND solicitud_id IN (?)',
      [id, creadas.map((s) => s.id)]
    );
    const stock = await stockDe(id);
    expect(stock).toBeGreaterThanOrEqual(0);
    expect(Number(asignado.total)).toBeLessThanOrEqual(5);
    expect(Number(asignado.total)).toBe(5 - stock);
  }, 30000);

  it('T1b: 10 solicitudes simultáneas sobre un producto con kardex previo dejan la cadena de saldos intacta', async () => {
    const id = await producto('T1b', 50, 1000);
    const pedir = () => solicitudes.crear({ centro_costo_id: centroId, items: [{ producto_id: id, cantidad: 1 }], observacion: PREFIJO + 'T1b' }, ACTOR, '::1');
    await pedir(); // deja SALDO_INICIAL + primera salida
    await Promise.all(Array.from({ length: 10 }, pedir));

    const movs = await movimientos(id);
    expect(await stockDe(id)).toBe(39);
    expect(movs.filter((m) => m.tipo === 'AJUSTE')).toHaveLength(0);
    expect(conciliarProducto(movs, 39)).toEqual([]);
  }, 30000);

  it('T2: 2 recepciones parciales (4 a $1.200 y 6 a $1.500) dejan 2 cabeceras, 2 ENTRADA_COMPRA y CPP $1.190', async () => {
    const id = await producto('T2', 10, 1000);
    const [ordenId] = await sql("INSERT INTO ordenes_compra (proveedor_id, estado, created_by) VALUES (1, 'ENVIADA', ?)", [ACTOR.id]);
    const [itemId] = await sql('INSERT INTO orden_compra_items (orden_id, producto_id, cantidad, cantidad_recibida, costo_unitario) VALUES (?, ?, 10, 0, 1200)', [ordenId, id]);

    await recepcion.recibir(ordenId, [{ item_id: itemId, cantidad_recibida: 4, costo_unitario: 1200 }], CTX, { documento_tipo: 'FACTURA', documento_numero: 'QA01-1' });
    await recepcion.recibir(ordenId, [{ item_id: itemId, cantidad_recibida: 6, costo_unitario: 1500 }], CTX, { documento_tipo: 'FACTURA', documento_numero: 'QA01-2' });

    const cabeceras = await filas('SELECT id FROM recepciones_compra WHERE orden_id = ?', [ordenId]);
    const entradas = (await movimientos(id)).filter((m) => m.tipo === 'ENTRADA_COMPRA');
    const ultimo = (await movimientos(id)).pop();
    expect(cabeceras).toHaveLength(2);
    expect(entradas.map((m) => [Number(m.cantidad), Number(m.costo_unitario)])).toEqual([[4, 1200], [6, 1500]]);
    // A mano: 10×1.000 + 4×1.200 + 6×1.500 = 23.800 para 20 u. -> CPP = 1.190
    expect(Number(ultimo.stock_resultante)).toBe(20);
    expect(Number(ultimo.valor_saldo_resultante)).toBe(23800);
    expect(Math.round(Number(ultimo.valor_saldo_resultante) / Number(ultimo.stock_resultante))).toBe(1190);
    expect((await una('SELECT estado FROM ordenes_compra WHERE id = ?', [ordenId])).estado).toBe('RECIBIDA');
    expect(Number((await una('SELECT cantidad_recibida FROM orden_compra_items WHERE id = ?', [itemId])).cantidad_recibida)).toBe(10);
  }, 30000);

  it('T3: anular una solicitud con stock asignado genera REVERSA enlazada a la salida y con su mismo costo', async () => {
    const id = await producto('T3', 5, 800);
    const s = await solicitudes.crear({ centro_costo_id: centroId, items: [{ producto_id: id, cantidad: 3 }], observacion: PREFIJO + 'T3' }, ACTOR, '::1');
    expect(await stockDe(id)).toBe(2);

    await solicitudes.anular(s.id, PREFIJO + 'T3 anulación', ACTOR, '::1');

    const movs = await movimientos(id);
    const salida = movs.filter((m) => m.tipo === 'SALIDA_SOLICITUD')[0];
    const reversa = movs.filter((m) => m.tipo === 'REVERSA')[0];
    expect(reversa.movimiento_revertido_id).toBe(salida.id);
    expect(Number(reversa.cantidad)).toBe(-Number(salida.cantidad));
    expect(Number(reversa.costo_unitario)).toBe(Number(salida.costo_unitario));
    expect(Number(reversa.valor_movimiento)).toBe(-Number(salida.valor_movimiento));
    expect(await stockDe(id)).toBe(5);
  }, 30000);

  it('T5: conteo con diferencia (-3) genera AJUSTE en el kardex y deja el stock en lo contado', async () => {
    const id = await producto('T5', 10, 500);
    const c = await conteos.crear({ producto_ids: [id], observacion: PREFIJO + 'T5' }, CTX);
    const item = await una('SELECT id FROM inventario_conteo_items WHERE conteo_id = ?', [c.id]);
    await conteos.capturar(c.id, [{ item_id: item.id, cantidad_contada: 7, motivo: PREFIJO + 'merma' }], CTX);
    await conteos.aprobar(c.id, CTX);

    const ajuste = (await movimientos(id)).filter((m) => m.tipo === 'AJUSTE' && m.referencia_tipo === 'inventario_conteos')[0];
    expect(Number(ajuste.cantidad)).toBe(-3);
    expect(Number(ajuste.referencia_id)).toBe(c.id);
    expect(await stockDe(id)).toBe(7);
  }, 30000);

  it('T4 (parcial): el kardex de cada producto tocado concilia contra productos.stock sin hallazgos', async () => {
    for (const id of tocados) {
      const movs = (await movimientos(id)).filter((m) => m.stock_resultante !== null);
      expect({ producto: id, hallazgos: conciliarProducto(movs, await stockDe(id)) }).toEqual({ producto: id, hallazgos: [] });
    }
  }, 30000);
});
