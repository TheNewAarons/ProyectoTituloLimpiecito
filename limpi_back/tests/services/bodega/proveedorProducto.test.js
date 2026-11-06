/**
 * Tests unitarios de services/bodega/proveedorProducto.js (modelos, db y auditoria mockeados).
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_base/Producto', () => ({
  findById: jest.fn(),
  count: jest.fn(),
  findAll: jest.fn()
}));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => ({
  findById: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));
jest.mock('../../../services/paginado', () => ({
  paginador: jest.fn()
}));

const db = require('../../../database/database');
const Producto = require('../../../modelos/sistema_base/Producto');
const Proveedor = require('../../../modelos/sistema_bodega/Proveedor');
const { auditar } = require('../../../services/auditoria');
const paginador = require('../../../services/paginado');
const { asignarProveedor, listarProductosDeProveedor } = require('../../../services/bodega/proveedorProducto');

function instanciaProducto(data) {
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

describe('services/bodega/proveedorProducto', () => {
  const usuario = { id: 1, contexto: 'usuarios' };

  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
  });

  describe('asignarProveedor', () => {
    it('asigna un proveedor activo al producto y audita EDITAR sobre productos', async () => {
      fakeTransaction();
      const producto = instanciaProducto({ id: 10, nombre: 'Guantes', proveedor_id: null });
      Producto.findById.mockResolvedValue(producto);
      Proveedor.findById.mockResolvedValue({ id: 5, activo: 1 });

      const resultado = await asignarProveedor(10, 5, { usuario, ip: '127.0.0.1' });

      expect(producto.update).toHaveBeenCalledWith({ proveedor_id: 5 }, expect.anything());
      expect(resultado.proveedor_id).toBe(5);
      expect(auditar).toHaveBeenCalledWith(
        expect.objectContaining({
          entidad: 'productos',
          entidad_id: 10,
          accion: 'EDITAR',
          antes: { proveedor_id: null },
          despues: { proveedor_id: 5 }
        })
      );
    });

    it('desasigna el proveedor cuando proveedor_id es null', async () => {
      fakeTransaction();
      const producto = instanciaProducto({ id: 10, nombre: 'Guantes', proveedor_id: 5 });
      Producto.findById.mockResolvedValue(producto);

      const resultado = await asignarProveedor(10, null, { usuario });

      expect(Proveedor.findById).not.toHaveBeenCalled();
      expect(producto.update).toHaveBeenCalledWith({ proveedor_id: null }, expect.anything());
      expect(resultado.proveedor_id).toBeNull();
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ despues: { proveedor_id: null } }));
    });

    it('si el proveedor ya es el solicitado, no actualiza ni audita', async () => {
      fakeTransaction();
      const producto = instanciaProducto({ id: 10, nombre: 'Guantes', proveedor_id: 5 });
      Producto.findById.mockResolvedValue(producto);

      const resultado = await asignarProveedor(10, 5, { usuario });

      expect(Proveedor.findById).not.toHaveBeenCalled();
      expect(producto.update).not.toHaveBeenCalled();
      expect(auditar).not.toHaveBeenCalled();
      expect(resultado).toBe(producto);
    });

    it('rechaza un proveedor inactivo con PROVEEDOR_INACTIVO (409) sin tocar el producto', async () => {
      fakeTransaction();
      const producto = instanciaProducto({ id: 10, nombre: 'Guantes', proveedor_id: null });
      Producto.findById.mockResolvedValue(producto);
      Proveedor.findById.mockResolvedValue({ id: 5, activo: 0 });

      await expect(asignarProveedor(10, 5, { usuario })).rejects.toMatchObject({
        code: 'PROVEEDOR_INACTIVO',
        httpStatus: 409
      });
      expect(producto.update).not.toHaveBeenCalled();
    });

    it('rechaza un proveedor inexistente con PROVEEDOR_NO_ENCONTRADO (404)', async () => {
      fakeTransaction();
      const producto = instanciaProducto({ id: 10, nombre: 'Guantes', proveedor_id: null });
      Producto.findById.mockResolvedValue(producto);
      Proveedor.findById.mockResolvedValue(null);

      await expect(asignarProveedor(10, 5, { usuario })).rejects.toMatchObject({
        code: 'PROVEEDOR_NO_ENCONTRADO',
        httpStatus: 404
      });
      expect(producto.update).not.toHaveBeenCalled();
    });

    it('rechaza un producto inexistente con PRODUCTO_NO_ENCONTRADO (404)', async () => {
      fakeTransaction();
      Producto.findById.mockResolvedValue(null);

      await expect(asignarProveedor(999, 5, { usuario })).rejects.toMatchObject({
        code: 'PRODUCTO_NO_ENCONTRADO',
        httpStatus: 404
      });
      expect(Proveedor.findById).not.toHaveBeenCalled();
    });

    it('rechaza un proveedor_id invalido (no entero ni null) con PROVEEDOR_ID_INVALIDO (400)', async () => {
      await expect(asignarProveedor(10, 'abc', { usuario })).rejects.toMatchObject({
        code: 'PROVEEDOR_ID_INVALIDO',
        httpStatus: 400
      });
      expect(Producto.findById).not.toHaveBeenCalled();
    });
  });

  describe('listarProductosDeProveedor', () => {
    it('lista paginada de productos asignados al proveedor', async () => {
      Proveedor.findById.mockResolvedValue({ id: 5 });
      Producto.count.mockResolvedValue(2);
      paginador.paginador.mockResolvedValue({ next: 'null', prev: 'null', cantidad_por_pagina: 10, skip: 0 });
      Producto.findAll.mockResolvedValue([{ id: 10, nombre: 'Guantes' }, { id: 11, nombre: 'Escoba' }]);

      const resultado = await listarProductosDeProveedor(5, { pagina: 1 });

      expect(Producto.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { proveedor_id: 5 }, offset: 0 })
      );
      expect(resultado.productos).toHaveLength(2);
      expect(resultado.total).toBe(2);
      expect(resultado.pagina).toBe(1);
    });

    it('lanza PROVEEDOR_NO_ENCONTRADO (404) si el proveedor no existe', async () => {
      Proveedor.findById.mockResolvedValue(null);

      await expect(listarProductosDeProveedor(999, { pagina: 1 })).rejects.toMatchObject({
        code: 'PROVEEDOR_NO_ENCONTRADO',
        httpStatus: 404
      });
      expect(Producto.findAll).not.toHaveBeenCalled();
    });
  });
});
