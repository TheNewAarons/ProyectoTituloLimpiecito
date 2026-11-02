/**
 * Tests unitarios de services/bodega/proveedores.js (modelos, db y auditoria mockeados, sin BD).
 * Casos básicos: crear (feliz + validaciones) y desactivar (baja lógica + auditoría ANULAR).
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => ({
  create: jest.fn(),
  findById: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));

const db = require('../../../database/database');
const Proveedor = require('../../../modelos/sistema_bodega/Proveedor');
const { auditar } = require('../../../services/auditoria');
const AppError = require('../../../libs/app-error');
const { crear, editar, desactivar } = require('../../../services/bodega/proveedores');

function instanciaProveedor(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((cambios) => {
    Object.assign(inst, cambios);
    return Promise.resolve(inst);
  });
  return inst;
}

function fakeTransaction() {
  const t = { id: 'tx-1' };
  db.sequelize.transaction.mockImplementation((callback) => Promise.resolve().then(() => callback(t)));
  return t;
}

describe('services/bodega/proveedores', () => {
  const usuario = { id: 1, contexto: 'proveedores' };

  beforeEach(() => {
    jest.clearAllMocks();
    auditar.mockResolvedValue({ id: 1 });
  });

  describe('crear', () => {
    it('crea el proveedor y audita CREAR', async () => {
      fakeTransaction();
      const proveedorCreado = instanciaProveedor({ id: 1, nombre: 'ACME', email: 'acme@test.com' });
      Proveedor.create.mockResolvedValue(proveedorCreado);

      const resultado = await crear({ nombre: 'ACME', email: 'acme@test.com' }, { usuario, ip: '127.0.0.1' });

      expect(resultado).toBe(proveedorCreado);
      expect(Proveedor.create).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'ACME', email: 'acme@test.com' }),
        expect.anything()
      );
      expect(auditar).toHaveBeenCalledWith(
        expect.objectContaining({ entidad: 'proveedores', accion: 'CREAR', despues: proveedorCreado })
      );
    });

    it('rechaza nombre vacio con NOMBRE_REQUERIDO (400)', async () => {
      await expect(crear({ nombre: '  ' }, { usuario })).rejects.toMatchObject({
        code: 'NOMBRE_REQUERIDO',
        httpStatus: 400
      });
      expect(Proveedor.create).not.toHaveBeenCalled();
    });

    it('rechaza email con formato invalido con EMAIL_INVALIDO (400)', async () => {
      await expect(crear({ nombre: 'ACME', email: 'no-es-email' }, { usuario })).rejects.toMatchObject({
        code: 'EMAIL_INVALIDO',
        httpStatus: 400
      });
      expect(Proveedor.create).not.toHaveBeenCalled();
    });

    it('normaliza "" a null en rut/telefono/contacto/email y trimea nombre', async () => {
      fakeTransaction();
      const proveedorCreado = instanciaProveedor({ id: 1, nombre: 'ACME' });
      Proveedor.create.mockResolvedValue(proveedorCreado);

      await crear({ nombre: '  ACME  ', rut: '', telefono: '', contacto: '', email: '' }, { usuario });

      expect(Proveedor.create).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'ACME', rut: null, telefono: null, contacto: null, email: null }),
        expect.anything()
      );
    });

    it('rechaza un campo que no es string (p.ej. telefono numerico) con CAMPO_INVALIDO (400)', async () => {
      await expect(crear({ nombre: 'ACME', telefono: 123456 }, { usuario })).rejects.toMatchObject({
        code: 'CAMPO_INVALIDO',
        httpStatus: 400
      });
      expect(Proveedor.create).not.toHaveBeenCalled();
    });

    it('rechaza nombre que excede el largo maximo (150) con CAMPO_INVALIDO (400)', async () => {
      await expect(crear({ nombre: 'A'.repeat(151) }, { usuario })).rejects.toMatchObject({
        code: 'CAMPO_INVALIDO',
        httpStatus: 400
      });
      expect(Proveedor.create).not.toHaveBeenCalled();
    });

    it('rechaza rut que excede el largo maximo (12) con CAMPO_INVALIDO (400)', async () => {
      await expect(crear({ nombre: 'ACME', rut: '1'.repeat(13) }, { usuario })).rejects.toMatchObject({
        code: 'CAMPO_INVALIDO',
        httpStatus: 400
      });
      expect(Proveedor.create).not.toHaveBeenCalled();
    });
  });

  describe('editar', () => {
    it('normaliza "" a null al editar (rut/telefono/contacto/email) sin tocar los campos no enviados', async () => {
      fakeTransaction();
      const proveedor = instanciaProveedor({ id: 1, nombre: 'ACME', rut: '76.1-9', telefono: '+56911112222', contacto: 'Juan', email: 'a@a.com' });
      Proveedor.findById.mockResolvedValue(proveedor);

      await editar(1, { rut: '', telefono: '', email: '' }, { usuario });

      expect(proveedor.update).toHaveBeenCalledWith({ rut: null, telefono: null, email: null }, expect.anything());
    });

    it('trimea nombre al editar', async () => {
      fakeTransaction();
      const proveedor = instanciaProveedor({ id: 1, nombre: 'ACME' });
      Proveedor.findById.mockResolvedValue(proveedor);

      await editar(1, { nombre: '  Nueva Razon Social  ' }, { usuario });

      expect(proveedor.update).toHaveBeenCalledWith({ nombre: 'Nueva Razon Social' }, expect.anything());
    });

    it('rechaza email invalido al editar con EMAIL_INVALIDO (400) sin tocar la BD', async () => {
      await expect(editar(1, { email: 'no-es-email' }, { usuario })).rejects.toMatchObject({
        code: 'EMAIL_INVALIDO',
        httpStatus: 400
      });
      expect(Proveedor.findById).not.toHaveBeenCalled();
    });

    it('rechaza contacto que excede el largo maximo (150) con CAMPO_INVALIDO (400)', async () => {
      await expect(editar(1, { contacto: 'A'.repeat(151) }, { usuario })).rejects.toMatchObject({
        code: 'CAMPO_INVALIDO',
        httpStatus: 400
      });
      expect(Proveedor.findById).not.toHaveBeenCalled();
    });
  });

  describe('desactivar', () => {
    it('baja lógica: activo pasa a 0 y audita ANULAR (no se borra)', async () => {
      fakeTransaction();
      const proveedor = instanciaProveedor({ id: 1, nombre: 'ACME', activo: 1 });
      Proveedor.findById.mockResolvedValue(proveedor);

      const resultado = await desactivar(1, { usuario, ip: '127.0.0.1' });

      expect(proveedor.update).toHaveBeenCalledWith({ activo: 0 }, expect.anything());
      expect(resultado.activo).toBe(0);
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'proveedores', accion: 'ANULAR' }));
    });

    it('lanza PROVEEDOR_NO_ENCONTRADO (404) si no existe', async () => {
      fakeTransaction();
      Proveedor.findById.mockResolvedValue(null);

      await expect(desactivar(999, { usuario })).rejects.toMatchObject({
        code: 'PROVEEDOR_NO_ENCONTRADO',
        httpStatus: 404
      });
    });
  });
});
