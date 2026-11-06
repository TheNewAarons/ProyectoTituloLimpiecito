/**
 * RF-BOD-02 — Test de INTEGRACIÓN (MySQL local, aseolimp_minda_oficial09) para la regla "dos
 * solicitudes concurrentes por el mismo producto no dejan stock negativo" (D-053/D-054: FOR UPDATE
 * dentro de una transacción). No usa mocks de BD: usa el pool real de services/bodega/cruceStock.js.
 *
 * Deshabilitado por defecto (no se ejecuta en `npm test`/CI local sin BD): requiere
 * RUN_DB_TESTS=1 y MySQL local corriendo con la BD de desarrollo del proyecto. Crea un producto
 * temporal propio, corre el cruce dos veces en paralelo y SIEMPRE limpia sus propias filas
 * (movimientos_bodega y el producto) en un finally, sin tocar datos preexistentes.
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const describeDB = RUN_DB_TESTS ? describe : describe.skip;

describeDB('cruceStock.cruzar: concurrencia real contra MySQL local', () => {
  let db;
  let Producto;
  let cruceStock;
  let productoId;

  beforeAll(() => {
    db = require('../../../database/database');
    Producto = require('../../../modelos/sistema_base/Producto');
    cruceStock = require('../../../services/bodega/cruceStock');
  });

  afterEach(async () => {
    if (!productoId) return;
    // Movimiento_bodega es inmutable desde la app (beforeDestroy lanza): se limpia el dato de
    // prueba con SQL crudo, no con el modelo, para no tocar su regla de negocio real.
    await db.sequelize.query('DELETE FROM movimientos_bodega WHERE producto_id = ?', { replacements: [productoId] }).catch(() => {});
    await Producto.destroy({ where: { id: productoId } }).catch(() => {});
    productoId = null;
  });

  afterAll(async () => { await db.sequelize.close(); });

  it('dos cruces simultáneos sobre un producto con stock 5 y demanda total 8 no dejan stock negativo', async () => {
    const producto = await Producto.create({ nombre: '__TEST_RF_BOD_02_CONCURRENCIA__', estado: 1, stock: 5, proveedor_id: null });
    productoId = producto.id;

    const usuario = { id: 1, contexto: 'usuarios' };
    const ejecutarCruce = (pedida) => db.sequelize.transaction(async (t) => {
      const productosLock = await Producto.findAll({ where: { id: productoId }, lock: t.LOCK.UPDATE, transaction: t });
      const solicitudFake = { id: -1, get: () => ({ id: -1 }), update: async () => {} };
      const itemFake = { producto_id: productoId, cantidad_pedida: pedida, update: async (cambios) => Object.assign(itemFake, cambios) };
      await cruceStock.cruzar(solicitudFake, [itemFake], productosLock, usuario, t, '::1');
      return itemFake;
    });

    const [item1, item2] = await Promise.all([ejecutarCruce(5), ejecutarCruce(3)]);

    const final = await Producto.findById(productoId);
    expect(Number(final.stock)).toBeGreaterThanOrEqual(0);
    expect(item1.cantidad_asignada + item2.cantidad_asignada).toBe(5 - Number(final.stock));
    expect(item1.cantidad_asignada + item2.cantidad_asignada).toBeLessThanOrEqual(5);
  }, 20000);
});
