/**
 * Tests unitarios de services/bodega/proveedores.js (modelos, db y auditoria mockeados, sin BD).
 * Casos básicos: crear (feliz + validaciones) y desactivar (baja lógica + auditoría ANULAR).
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../modelos/sistema_bodega/Proveedor', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAndCountAll: jest.fn()
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));

const db = require('../../../database/database');
const Proveedor = require('../../../modelos/sistema_bodega/Proveedor');
const { auditar } = require('../../../services/auditoria');
const AppError = require('../../../libs/app-error');
const { listar, crear, editar, desactivar, reactivar } = require('../../../services/bodega/proveedores');

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

  describe('reactivar', () => {
    it('activo vuelve a 1 y audita ACTIVAR', async () => {
      fakeTransaction();
      const proveedor = instanciaProveedor({ id: 1, nombre: 'ACME', activo: 0 });
      Proveedor.findById.mockResolvedValue(proveedor);

      const resultado = await reactivar(1, { usuario, ip: '127.0.0.1' });

      expect(proveedor.update).toHaveBeenCalledWith({ activo: 1 }, expect.anything());
      expect(resultado.activo).toBe(1);
      expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'proveedores', accion: 'ACTIVAR' }));
    });

    it('lanza PROVEEDOR_NO_ENCONTRADO (404) si no existe', async () => {
      fakeTransaction();
      Proveedor.findById.mockResolvedValue(null);

      await expect(reactivar(999, { usuario })).rejects.toMatchObject({ code: 'PROVEEDOR_NO_ENCONTRADO', httpStatus: 404 });
    });
  });
});

// AUT-023 (retroalimentación de la revisión): RUT con dígito verificador, teléfono numérico y contacto como nombre.
describe('services/bodega/proveedores · formatos de RUT, teléfono y contacto', () => {
  const usuario = { id: 1, contexto: 'proveedores' };
  const formato = require('../../../services/bodega/proveedores-formato');

  beforeEach(() => { jest.clearAllMocks(); fakeTransaction(); Proveedor.create.mockImplementation(async (d) => Object.assign({ id: 9 }, d)); });

  it('rutValido: dígito verificador (con o sin puntos y guion, K)', () => {
    ['11.111.111-1', '12.345.678-5', '12345678-5', '76.086.428-5'].forEach((r) => expect(formato.rutValido(r)).toBe(true));
    ['12.345.678-9', '6.666.666-6', 'abc', '1-9'].forEach((r) => expect(formato.rutValido(r)).toBe(false));
  });

  it('telefonoValido y contactoValido', () => {
    expect(formato.telefonoValido('+56 9 1234 5678')).toBe(true);
    expect(formato.telefonoValido('221234567')).toBe(true);
    expect(formato.telefonoValido('12345')).toBe(false);
    expect(formato.telefonoValido('9 1234 abcd')).toBe(false);
    expect(formato.contactoValido("María José O'Higgins")).toBe(true);
    expect(formato.contactoValido('Juan 123')).toBe(false);
  });

  it('crear rechaza RUT, teléfono o contacto inválidos (400) sin tocar la BD', async () => {
    await expect(crear({ nombre: 'ACME', rut: '12.345.678-9' }, { usuario })).rejects.toMatchObject({ code: 'RUT_INVALIDO', httpStatus: 400 });
    await expect(crear({ nombre: 'ACME', telefono: 'llamar al jefe' }, { usuario })).rejects.toMatchObject({ code: 'TELEFONO_INVALIDO', httpStatus: 400 });
    await expect(crear({ nombre: 'ACME', contacto: '+56912345678' }, { usuario })).rejects.toMatchObject({ code: 'CONTACTO_INVALIDO', httpStatus: 400 });
    expect(Proveedor.create).not.toHaveBeenCalled();
  });

  it('crear acepta datos válidos y los vacíos siguen siendo opcionales', async () => {
    await crear({ nombre: 'ACME', rut: '76.086.428-5', telefono: '+56 9 1234 5678', contacto: 'Ana Pérez' }, { usuario });
    await crear({ nombre: 'ACME', rut: '', telefono: '', contacto: '' }, { usuario });
    expect(Proveedor.create).toHaveBeenCalledTimes(2);
  });

  it('editar valida solo los campos que vienen', async () => {
    const proveedor = instanciaProveedor({ id: 1, nombre: 'ACME', rut: '76.1-9' });
    Proveedor.findById.mockResolvedValue(proveedor);
    await editar(1, { nombre: 'ACME Ltda' }, { usuario }); // el RUT antiguo inválido no bloquea cambiar otro campo
    expect(proveedor.update).toHaveBeenCalled();
    await expect(editar(1, { rut: '12.345.678-9' }, { usuario })).rejects.toMatchObject({ code: 'RUT_INVALIDO' });
  });

  describe('listar con buscar', () => {
    const { Op } = require('sequelize');
    beforeEach(() => Proveedor.findAndCountAll.mockResolvedValue({ rows: [], count: 0 }));

    it('busca literal (comodines escapados) en nombre, rut, email y contacto', async () => {
      await listar({ buscar: '  50%_a ', activo: 1 });
      const where = Proveedor.findAndCountAll.mock.calls[0][0].where;
      const patron = { [Op.like]: '%50\\%\\_a%' };
      expect(where.activo).toBe(1);
      expect(where[Op.or]).toEqual([{ nombre: patron }, { rut: patron }, { email: patron }, { contacto: patron }]);
    });

    it('sin buscar ni activo no filtra (todos)', async () => {
      await listar({ buscar: '   ' });
      const where = Proveedor.findAndCountAll.mock.calls[0][0].where;
      expect(where).toEqual({});
      expect(where[Op.or]).toBeUndefined();
    });
  });
});
