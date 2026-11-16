/**
 * RF-BOD-04 (AUT-003): eliminar una lista de insumos exige sesión y solo vale para listas pendientes (estado 0).
 * Las aprobadas y las de bodega (estado 1, no descontaron stock) no se borran.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async () => ({ nombre: 'Administrador' })) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn(async (id) => ({ id, correo: 'admin@x.cl' })) }));
jest.mock('../../modelos/sistema_base/Lista_insumo', () => ({ findById: jest.fn() }));
jest.mock('../../api/apartado_base/detalle_centro/logica', () => ({ eliminarListaInsumoCompletoDB: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
require('../../config/auth');
const Lista_insumo = require('../../modelos/sistema_base/Lista_insumo');
const logica = require('../../api/apartado_base/detalle_centro/logica');

const app = express();
app.use(express.json());
app.use('/detalle', require('../../api/apartado_base/detalle_centro/routes'));
const TOKEN = jwt.sign({ id: 1, roleId: 1, correo: 'admin@x.cl' }, process.env.SECRET_KEY, { expiresIn: '1h' });
const borrar = (id, token) => {
  const r = request(app).delete('/detalle/eliminar-lista/' + id);
  return token ? r.set('x-access-token', token) : r;
};

beforeEach(() => {
  jest.clearAllMocks();
  logica.eliminarListaInsumoCompletoDB.mockResolvedValue(1);
});

it('sin sesión (o con un token inválido) responde 401 y no toca stock ni la lista', async () => {
  for (const tk of [null, 'basura', jwt.sign({ id: 1, roleId: 1 }, 'x'.repeat(40))]) {
    const res = await borrar(5, tk);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REQUERIDO');
  }
  expect(logica.eliminarListaInsumoCompletoDB).not.toHaveBeenCalled();
});

it('una lista aprobada o de bodega (estado 1) responde 409 y no se elimina', async () => {
  Lista_insumo.findById.mockResolvedValue({ id: 5, estado: 1 });
  const res = await borrar(5, TOKEN);
  expect(res.status).toBe(409);
  expect(res.body.error.code).toBe('LISTA_NO_ELIMINABLE');
  expect(logica.eliminarListaInsumoCompletoDB).not.toHaveBeenCalled();
});

it('una lista pendiente (estado 0) se elimina como antes, con el usuario en la auditoría', async () => {
  Lista_insumo.findById.mockResolvedValue({ id: 5, estado: 0 });
  const res = await borrar(5, TOKEN);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ numero_eliminado: 1 });
  const [id, ctx] = logica.eliminarListaInsumoCompletoDB.mock.calls[0];
  expect(id).toBe('5');
  expect(ctx.usuario.id).toBe(1);
});

it('una lista que no existe mantiene la respuesta anterior', async () => {
  Lista_insumo.findById.mockResolvedValue(null);
  logica.eliminarListaInsumoCompletoDB.mockResolvedValue(0);
  const res = await borrar(99, TOKEN);
  expect(res.body).toEqual({ numero_eliminado: 0 });
});
