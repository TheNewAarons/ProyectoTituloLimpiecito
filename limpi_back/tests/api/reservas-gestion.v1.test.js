/**
 * RF-BI-05 (revisión) — /api/v1/reservas/:id/aprobar|rechazar|finalizar: solo Admin y errores en formato {ok:false,error}.
 * Se monta igual que en index.js (autenticar + requerirRol de Administrador).
 */
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn(async (id) => ({ 1: { nombre: 'Administrador' }, 2: { nombre: 'Operaciones' } }[id] || null)) }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../services/reservas/gestion', () => ({ cambiarEstado: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
require('../../config/auth');
const AppError = require('../../libs/app-error');
const gestion = require('../../services/reservas/gestion');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const ADMIN = jwt.sign({ id: 1, roleId: 1 }, process.env.SECRET_KEY);
const OPERACIONES = jwt.sign({ id: 2, roleId: 2 }, process.env.SECRET_KEY);

const app = express();
app.use(express.json());
app.use('/api/v1/reservas', autenticar, requerirRol('Administrador'), require('../../api/v1/reservas/routes'));
app.use(noEncontrado);
app.use(manejadorErrores);

beforeEach(() => jest.clearAllMocks());

it.each(['aprobar', 'rechazar', 'finalizar'])('%s: sin sesión 401 y con un rol que no es Admin 403, sin tocar la reserva', async (accion) => {
  expect((await request(app).post('/api/v1/reservas/5/' + accion)).status).toBe(401);
  expect((await request(app).post('/api/v1/reservas/5/' + accion).set('x-access-token', OPERACIONES)).status).toBe(403);
  expect(gestion.cambiarEstado).not.toHaveBeenCalled();
});

it('Admin: pasa acción, id, usuario y motivo al servicio y responde {ok,data,meta}', async () => {
  gestion.cambiarEstado.mockResolvedValue({ id: 5, orden: 1124, estado: 4, estado_texto: 'Rechazada', correo_enviado: true });
  const r = await request(app).post('/api/v1/reservas/5/rechazar').set('x-access-token', ADMIN).send({ motivo: 'Sin equipo ese día' });
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ ok: true, data: expect.objectContaining({ estado: 4 }), meta: {} });
  expect(gestion.cambiarEstado).toHaveBeenCalledWith('rechazar', '5', expect.objectContaining({ usuario: expect.objectContaining({ id: 1 }), motivo: 'Sin equipo ese día' }));
});

it('una transición inválida responde 409 con {ok:false,error:{code,message}}', async () => {
  gestion.cambiarEstado.mockRejectedValue(new AppError('ESTADO_INVALIDO', 'No se puede aprobar una reserva rechazada.', 409));
  const r = await request(app).post('/api/v1/reservas/5/aprobar').set('x-access-token', ADMIN);
  expect(r.status).toBe(409);
  expect(r.body).toMatchObject({ ok: false, error: { code: 'ESTADO_INVALIDO', message: 'No se puede aprobar una reserva rechazada.' } });
});
