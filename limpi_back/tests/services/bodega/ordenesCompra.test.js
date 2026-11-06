/**
 * Tests unitarios de services/bodega/ordenesCompra.js (modelos, db, auditoria y correo mockeados,
 * sin BD ni SMTP real). Cubre enviar() y actualizar(), incluido el bloqueo "producto sin proveedor".
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_bodega/Orden_compra', () => ({
  findById: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Orden_compra_item', () => ({
  destroy: jest.fn(),
  count: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => ({}));
jest.mock('../../../modelos/sistema_base/Producto', () => ({
  findAll: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));
jest.mock('../../../services/bodega/correoOrdenCompra', () => ({
  enviarCorreoOrdenCompra: jest.fn()
}));

const db = require('../../../database/database');
const Orden_compra = require('../../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../../modelos/sistema_bodega/Orden_compra_item');
const Producto = require('../../../modelos/sistema_base/Producto');
const { auditar } = require('../../../services/auditoria');
const { enviarCorreoOrdenCompra } = require('../../../services/bodega/correoOrdenCompra');
const { enviar, actualizar } = require('../../../services/bodega/ordenesCompra');

function instanciaItem(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => {
    Object.assign(inst, cambios);
    return Promise.resolve(inst);
  });
  return inst;
}

function instanciaOrden(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => {
    Object.assign(inst, cambios);
    return Promise.resolve(inst);
  });
  return inst;
}

function fakeTransaction() {
  const t = { id: 'tx-1', LOCK: { UPDATE: 'LOCK_UPDATE', SHARE: 'LOCK_SHARE' } };
  db.sequelize.transaction.mockImplementation((callback) => Promise.resolve().then(() => callback(t)));
  return t;
}

describe('services/bodega/ordenesCompra', () => {
  const usuario = { id: 1, contexto: 'ordenes_compra' };

  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
    // Por defecto, cada producto coincide con el proveedor de la orden (undefined en los fixtures
    // que no lo declaran), para no romper los tests que no les concierne el bloqueo PRODUCTO_SIN_PROVEEDOR.
    Producto.findAll.mockImplementation((opciones) =>
      Promise.resolve((opciones.where.id || []).map((id) => ({ id: id, nombre: 'Producto ' + id, proveedor_id: undefined })))
    );
  });

  describe('enviar', () => {
    it('envio feliz: BORRADOR -> ENVIADA, guarda enviada_at/enviada_a_email y audita ENVIAR', async () => {
      fakeTransaction();
      const transporte = { sendMail: jest.fn().mockResolvedValue({}) };
      const orden = instanciaOrden({
        id: 1,
        estado: 'BORRADOR',
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      Orden_compra.findById.mockResolvedValue(orden);
      enviarCorreoOrdenCompra.mockResolvedValue();

      const resultado = await enviar(1, { usuario, ip: '127.0.0.1', transporte });

      expect(enviarCorreoOrdenCompra).toHaveBeenCalledWith(orden, 'proveedor@test.com', transporte);
      expect(orden.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'ENVIADA', enviada_a_email: 'proveedor@test.com' }),
        expect.anything()
      );
      expect(orden.enviada_at).toBeInstanceOf(Date);
      expect(resultado.estado).toBe('ENVIADA');
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'ordenes_compra', accion: 'ENVIAR' }));
    });

    it('falla SMTP: la orden sigue BORRADOR, lanza AppError ENVIO_FALLIDO (502) sin credenciales en el mensaje, y audita ENVIAR_FALLIDO', async () => {
      fakeTransaction();
      const orden = instanciaOrden({
        id: 1,
        estado: 'BORRADOR',
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      Orden_compra.findById.mockResolvedValue(orden);
      const errorSmtp = Object.assign(new Error('no se pudo enviar el correo al proveedor'), {
        code: 'ENVIO_FALLIDO',
        httpStatus: 502
      });
      enviarCorreoOrdenCompra.mockRejectedValue(errorSmtp);

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'ENVIO_FALLIDO',
        httpStatus: 502
      });
      expect(orden.update).not.toHaveBeenCalled();
      expect(orden.estado).toBe('BORRADOR');
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'ordenes_compra', accion: 'ENVIAR_FALLIDO' }));
      try {
        await enviar(1, { usuario, transporte: {} });
      } catch (err) {
        expect(err.message).not.toMatch(/SMTP_USER|SMTP_PASS|credencial/i);
      }
    });

    it('si la auditoria ENVIAR_FALLIDO tambien falla, no oculta el AppError ENVIO_FALLIDO original', async () => {
      fakeTransaction();
      const orden = instanciaOrden({
        id: 1,
        estado: 'BORRADOR',
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      Orden_compra.findById.mockResolvedValue(orden);
      const errorSmtp = Object.assign(new Error('no se pudo enviar el correo al proveedor'), {
        code: 'ENVIO_FALLIDO',
        httpStatus: 502
      });
      enviarCorreoOrdenCompra.mockRejectedValue(errorSmtp);
      auditar.mockRejectedValue(new Error('fallo auditoria'));

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'ENVIO_FALLIDO',
        httpStatus: 502
      });
    });

    it('reenvio de una orden ENVIADA registra una nueva enviada_at y audita REENVIAR', async () => {
      fakeTransaction();
      const transporte = { sendMail: jest.fn().mockResolvedValue({}) };
      const fechaPrevia = new Date('2020-01-01T00:00:00Z');
      const orden = instanciaOrden({
        id: 1,
        estado: 'ENVIADA',
        enviada_at: fechaPrevia,
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      Orden_compra.findById.mockResolvedValue(orden);
      enviarCorreoOrdenCompra.mockResolvedValue();

      await enviar(1, { usuario, transporte });

      expect(orden.enviada_at).not.toEqual(fechaPrevia);
      expect(orden.enviada_at).toBeInstanceOf(Date);
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'ordenes_compra', accion: 'REENVIAR' }));
    });

    it('rechaza enviar una orden sin items (409 ORDEN_SIN_ITEMS)', async () => {
      const orden = instanciaOrden({ id: 1, estado: 'BORRADOR', proveedor: { activo: 1, email: 'p@test.com' }, items: [] });
      Orden_compra.findById.mockResolvedValue(orden);

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'ORDEN_SIN_ITEMS',
        httpStatus: 409
      });
      expect(enviarCorreoOrdenCompra).not.toHaveBeenCalled();
    });

    it('si la orden cambio de estado mientras se enviaba el correo, no la marca ENVIADA (409 ORDEN_NO_ENVIABLE) y loguea', async () => {
      fakeTransaction();
      const transporte = { sendMail: jest.fn().mockResolvedValue({}) };
      const ordenInicial = instanciaOrden({
        id: 1,
        estado: 'BORRADOR',
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      const ordenCambiada = instanciaOrden({ id: 1, estado: 'ANULADA', items: [] });
      Orden_compra.findById.mockResolvedValueOnce(ordenInicial).mockResolvedValueOnce(ordenCambiada);
      enviarCorreoOrdenCompra.mockResolvedValue();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(enviar(1, { usuario, transporte })).rejects.toMatchObject({
        code: 'ORDEN_NO_ENVIABLE',
        httpStatus: 409
      });
      expect(ordenCambiada.update).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('1'), expect.objectContaining({ ordenId: 1 }));
      errorSpy.mockRestore();
    });

    it('orden ANULADA no se envia (409 ORDEN_NO_ENVIABLE)', async () => {
      const orden = instanciaOrden({ id: 1, estado: 'ANULADA', proveedor: { activo: 1, email: 'p@test.com' }, items: [] });
      Orden_compra.findById.mockResolvedValue(orden);

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'ORDEN_NO_ENVIABLE',
        httpStatus: 409
      });
      expect(enviarCorreoOrdenCompra).not.toHaveBeenCalled();
    });

    it('orden RECIBIDA no se envia (409 ORDEN_NO_ENVIABLE)', async () => {
      const orden = instanciaOrden({ id: 1, estado: 'RECIBIDA', proveedor: { activo: 1, email: 'p@test.com' }, items: [] });
      Orden_compra.findById.mockResolvedValue(orden);

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'ORDEN_NO_ENVIABLE',
        httpStatus: 409
      });
      expect(enviarCorreoOrdenCompra).not.toHaveBeenCalled();
    });

    it('proveedor sin email: lanza PROVEEDOR_SIN_EMAIL (400)', async () => {
      const orden = instanciaOrden({ id: 1, estado: 'BORRADOR', proveedor: { activo: 1, email: null }, items: [] });
      Orden_compra.findById.mockResolvedValue(orden);

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'PROVEEDOR_SIN_EMAIL',
        httpStatus: 400
      });
      expect(enviarCorreoOrdenCompra).not.toHaveBeenCalled();
    });

    it('bloquea envio si algun producto no tiene el proveedor de la orden asignado (409 PRODUCTO_SIN_PROVEEDOR)', async () => {
      const orden = instanciaOrden({
        id: 1,
        estado: 'BORRADOR',
        proveedor_id: 5,
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      Orden_compra.findById.mockResolvedValue(orden);
      Producto.findAll.mockResolvedValue([{ id: 10, nombre: 'Guantes', proveedor_id: null }]);

      await expect(enviar(1, { usuario, transporte: {} })).rejects.toMatchObject({
        code: 'PRODUCTO_SIN_PROVEEDOR',
        httpStatus: 409,
        details: { productos: [{ id: 10, nombre: 'Guantes' }] }
      });
      expect(enviarCorreoOrdenCompra).not.toHaveBeenCalled();
      expect(orden.update).not.toHaveBeenCalled();
      expect(orden.estado).toBe('BORRADOR');
    });

    it('carrera: el producto pierde el proveedor entre el chequeo y la confirmacion -> 409 PRODUCTO_SIN_PROVEEDOR, no marca ENVIADA y loguea', async () => {
      fakeTransaction();
      const transporte = { sendMail: jest.fn().mockResolvedValue({}) };
      const orden = instanciaOrden({
        id: 1,
        estado: 'BORRADOR',
        proveedor_id: 5,
        proveedor: { activo: 1, email: 'proveedor@test.com' },
        items: [instanciaItem({ id: 1, producto_id: 10, cantidad: 2 })]
      });
      Orden_compra.findById.mockResolvedValue(orden);
      Producto.findAll
        .mockResolvedValueOnce([{ id: 10, nombre: 'Guantes', proveedor_id: 5 }])
        .mockResolvedValueOnce([{ id: 10, nombre: 'Guantes', proveedor_id: null }]);
      enviarCorreoOrdenCompra.mockResolvedValue();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(enviar(1, { usuario, transporte })).rejects.toMatchObject({
        code: 'PRODUCTO_SIN_PROVEEDOR',
        httpStatus: 409
      });
      expect(enviarCorreoOrdenCompra).toHaveBeenCalled();
      expect(orden.update).not.toHaveBeenCalled();
      expect(orden.estado).toBe('BORRADOR');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('1'), expect.objectContaining({ ordenId: 1 }));
      errorSpy.mockRestore();
    });
  });

  describe('actualizar', () => {
    it('solo permite editar en BORRADOR (409 ORDEN_NO_EDITABLE si no lo está)', async () => {
      fakeTransaction();
      const orden = instanciaOrden({ id: 1, estado: 'ENVIADA', items: [instanciaItem({ id: 1, cantidad: 2 })] });
      Orden_compra.findById.mockResolvedValue(orden);

      await expect(actualizar(1, { items: [{ id: 1, cantidad: 5 }] }, { usuario })).rejects.toMatchObject({
        code: 'ORDEN_NO_EDITABLE',
        httpStatus: 409
      });
    });

    it('rechaza cantidad invalida (0, negativa o no entera) con CANTIDAD_INVALIDA (400)', async () => {
      await expect(actualizar(1, { items: [{ id: 1, cantidad: 0 }] }, { usuario })).rejects.toMatchObject({
        code: 'CANTIDAD_INVALIDA',
        httpStatus: 400
      });
      await expect(actualizar(1, { items: [{ id: 1, cantidad: -3 }] }, { usuario })).rejects.toMatchObject({
        code: 'CANTIDAD_INVALIDA'
      });
      await expect(actualizar(1, { items: [{ id: 1, cantidad: 1.5 }] }, { usuario })).rejects.toMatchObject({
        code: 'CANTIDAD_INVALIDA'
      });
      expect(Orden_compra.findById).not.toHaveBeenCalled();
    });

    it('no permite dejar la orden sin items (409 ORDEN_SIN_ITEMS)', async () => {
      fakeTransaction();
      const item1 = instanciaItem({ id: 1, cantidad: 2 });
      const orden = instanciaOrden({ id: 1, estado: 'BORRADOR', items: [item1] });
      Orden_compra.findById.mockResolvedValue(orden);
      Orden_compra_item.destroy.mockResolvedValue(1);
      Orden_compra_item.count.mockResolvedValue(0);

      await expect(actualizar(1, { eliminar: [1] }, { usuario })).rejects.toMatchObject({
        code: 'ORDEN_SIN_ITEMS',
        httpStatus: 409
      });
    });

    it('actualiza cantidades, elimina items y audita EDITAR (caso feliz)', async () => {
      fakeTransaction();
      const item1 = instanciaItem({ id: 1, cantidad: 2 });
      const item2 = instanciaItem({ id: 2, cantidad: 3 });
      const ordenInicial = instanciaOrden({ id: 1, estado: 'BORRADOR', items: [item1, item2] });
      const ordenFinal = instanciaOrden({ id: 1, estado: 'BORRADOR', items: [item1] });
      Orden_compra.findById.mockResolvedValueOnce(ordenInicial).mockResolvedValueOnce(ordenFinal);
      Orden_compra_item.destroy.mockResolvedValue(1);
      Orden_compra_item.count.mockResolvedValue(1);

      const resultado = await actualizar(1, { items: [{ id: 1, cantidad: 9 }], eliminar: [2] }, { usuario, ip: '127.0.0.1' });

      expect(item1.update).toHaveBeenCalledWith({ cantidad: 9 }, expect.anything());
      expect(Orden_compra_item.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: [2], orden_id: 1 } })
      );
      expect(resultado).toBe(ordenFinal);
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'ordenes_compra', accion: 'EDITAR' }));
    });
  });
});
