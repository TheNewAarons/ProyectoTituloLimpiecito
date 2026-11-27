/**
 * Activar/desactivar proveedor en dos pasos: motivo -> código por correo -> cambio auditado con ese motivo.
 */
jest.mock('../../services/bodega/proveedores', () => ({
  verificarCambioActivo: jest.fn(), desactivar: jest.fn(), reactivar: jest.fn()
}));
jest.mock('../../services/bodega/proveedorProducto', () => ({}));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../services/centro-costo/codigo-reapertura', () => ({ emitirCodigo: jest.fn(), consumirCodigo: jest.fn() }));

const servicio = require('../../services/bodega/proveedores');
const Usuario = require('../../modelos/sistema_base/Usuario');
const codigoSrv = require('../../services/centro-costo/codigo-reapertura');
const { pedirCodigoEstado, cambiarEstado } = require('../../api/v1/bodega/proveedores-controlador');

const res = () => ({ json: jest.fn() });
const req = (body) => ({ params: { id: '4' }, body: body, usuario: { id: 1, contexto: 'usuarios' }, ip: 'x' });

describe('proveedores: estado con código por correo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pide código con acción y clave ligadas al estado destino', async () => {
    servicio.verificarCambioActivo.mockResolvedValue({ id: 4, nombre: 'ACME' });
    Usuario.findById.mockResolvedValue({ nombre: 'Ana', correo: 'a@b.cl' });
    codigoSrv.emitirCodigo.mockResolvedValue({ correo: 'a***@b.cl' });
    const r = res();
    await pedirCodigoEstado(req({ activo: 0, motivo: '  ya no vende  ' }), r);
    expect(servicio.verificarCambioActivo).toHaveBeenCalledWith(4, 0);
    expect(codigoSrv.emitirCodigo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, correo: 'a@b.cl' }),
      { clave: 'prov:4:0', descripcion: 'el proveedor ACME', accion: 'desactivar' },
      'ya no vende'
    );
    expect(r.json).toHaveBeenCalledWith({ ok: true, data: { correo: 'a***@b.cl' }, meta: {} });
  });

  it.each([
    [{ activo: 0, motivo: 'abc' }, 'MOTIVO_REQUERIDO'],
    [{ activo: 2, motivo: 'motivo largo' }, 'CAMPO_INVALIDO'],
    [{ motivo: 'motivo largo' }, 'CAMPO_INVALIDO']
  ])('rechaza %o -> %s sin enviar correo', async (body, code) => {
    await expect(pedirCodigoEstado(req(body), res())).rejects.toMatchObject({ code: code });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('con código válido activa y audita el motivo del correo', async () => {
    codigoSrv.consumirCodigo.mockReturnValue('vuelve a vender');
    servicio.reactivar.mockResolvedValue({ id: 4, activo: 1 });
    const r = res();
    await cambiarEstado(req({ activo: 1, codigo: '123456' }), r);
    expect(codigoSrv.consumirCodigo).toHaveBeenCalledWith(1, 'prov:4:1', '123456');
    expect(servicio.reactivar).toHaveBeenCalledWith(4, expect.objectContaining({
      motivo: 'vuelve a vender [confirmado con código por correo]'
    }));
    expect(servicio.desactivar).not.toHaveBeenCalled();
  });

  it('código inválido no toca el proveedor', async () => {
    codigoSrv.consumirCodigo.mockImplementation(() => { throw Object.assign(new Error('x'), { code: 'CODIGO_INVALIDO' }); });
    await expect(cambiarEstado(req({ activo: 0, codigo: '000000' }), res())).rejects.toMatchObject({ code: 'CODIGO_INVALIDO' });
    expect(servicio.desactivar).not.toHaveBeenCalled();
  });
});

describe('rutas antiguas de estado', () => {
  const express = require('express');
  const request = require('supertest');
  jest.mock('../../middleware/auth', () => ({
    autenticar: (req, res, next) => next(),
    requerirRol: () => (req, res, next) => next()
  }));
  jest.mock('../../middleware/auth-bodega', () => ({
    autenticarBodega: (req, res, next) => next(),
    permitir: () => (req, res, next) => next()
  }));
  jest.mock('../../api/v1/bodega/controlador', () => new Proxy({}, { get: () => jest.fn() }));

  it.each([['delete', '/proveedores/4'], ['patch', '/proveedores/4/reactivar']])('%s %s -> 410 RUTA_REEMPLAZADA sin tocar el proveedor', async (metodo, ruta) => {
    const app = express().use(require('../../api/v1/bodega/routes'));
    const r = await request(app)[metodo](ruta);
    expect(r.status).toBe(410);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'RUTA_REEMPLAZADA' } });
    expect(servicio.desactivar).not.toHaveBeenCalled();
    expect(servicio.reactivar).not.toHaveBeenCalled();
  });
});
