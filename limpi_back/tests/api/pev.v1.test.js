/**
 * RF-PEV-02a — Tests de la capa HTTP de /api/v1/pev (actividades y asignaciones), montada como en
 * index.js: autenticar + requerirRol(Admin) a nivel de path. La lógica de negocio se cubre en
 * tests/services/pev: aquí se verifica el cableado (auth, validación 400, traducción de AppError,
 * sin verbo DELETE). Patrón: tests/api/publicaciones.v1.test.js.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../services/pev/actividades', () => ({ listar: jest.fn(), crear: jest.fn() }));
jest.mock('../../services/pev/asignaciones', () => ({
  listar: jest.fn(),
  crear: jest.fn(),
  cerrar: jest.fn(),
  anular: jest.fn(),
  ESTADOS: ['ACTIVA', 'CERRADA', 'ANULADA']
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const actividades = require('../../services/pev/actividades');
const asignaciones = require('../../services/pev/asignaciones');
const AppError = require('../../libs/app-error');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');
const routerPev = require('../../api/v1/pev/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const TOKEN_ADMIN = 'token-admin';
const TOKEN_RRHH = 'token-rrhh';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/pev', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), routerPev);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

function configurarJwtYRol() {
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin', correo: 'a@a.com', roleId: 1 };
    if (token === TOKEN_RRHH) return { id: 2, nombre: 'RRHH', correo: 'r@r.com', roleId: 2 };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
  Role.findById.mockImplementation((id) => {
    if (id === 1) return Promise.resolve({ id: 1, nombre: 'Administrador' });
    if (id === 2) return Promise.resolve({ id: 2, nombre: 'RRHH' });
    return Promise.resolve(null);
  });
}

const ASIGNACION = {
  id: 9, actividad_id: 1, area_id: 2, trabajador_id: 4, tarea_id: 30, turno_id: 3,
  fecha_desde: '2026-03-01', fecha_hasta: null, estado: 'ACTIVA', activa_flag: 1, origen: 'APP',
  motivo: null, created_by: 1, cerrada_by: null, cerrada_at: null, created_at: '2026-03-01', updated_at: '2026-03-01'
};

beforeEach(() => {
  jest.clearAllMocks();
  configurarJwtYRol();
});

describe('autenticación y autorización (router completo)', () => {
  it('sin x-access-token responde 401 TOKEN_REQUERIDO sin tocar el servicio', async () => {
    const res = await request(buildApp()).get('/api/v1/pev/asignaciones');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    expect(asignaciones.listar).not.toHaveBeenCalled();
  });

  it('rol no Administrador responde 403 FORBIDDEN sin tocar el servicio', async () => {
    const res = await request(buildApp()).get('/api/v1/pev/actividades').set('x-access-token', TOKEN_RRHH);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(actividades.listar).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/pev/asignaciones', () => {
  const cuerpo = { actividad_id: 1, area_id: 2, trabajador_id: 4, turno_id: 3, fecha_desde: '2026-03-01' };

  it('camino feliz: 201 con data serializada y servicio llamado con la entrada parseada', async () => {
    asignaciones.crear.mockResolvedValue(ASIGNACION);
    const res = await request(buildApp()).post('/api/v1/pev/asignaciones').set('x-access-token', TOKEN_ADMIN).send(cuerpo);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true, data: { id: 9, estado: 'ACTIVA', activa_flag: 1, turno_id: 3 } });
    expect(asignaciones.crear).toHaveBeenCalledWith(
      { actividad_id: 1, area_id: 2, trabajador_id: 4, turno_id: 3, fecha_desde: '2026-03-01', tarea_id: undefined },
      expect.objectContaining({ usuario: expect.objectContaining({ id: 1 }) })
    );
  });

  it('duplicada: el servicio lanza ASIGNACION_DUPLICADA y se traduce a 409', async () => {
    asignaciones.crear.mockRejectedValue(new AppError('ASIGNACION_DUPLICADA', 'ya existe', 409, {}));
    const res = await request(buildApp()).post('/api/v1/pev/asignaciones').set('x-access-token', TOKEN_ADMIN).send(cuerpo);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'ASIGNACION_DUPLICADA' } });
  });

  it('validación 400: falta turno_id, fecha inválida (2026-02-31), fecha_hasta al crear', async () => {
    const app = buildApp();
    let res = await request(app).post('/api/v1/pev/asignaciones').set('x-access-token', TOKEN_ADMIN)
      .send({ actividad_id: 1, area_id: 2, trabajador_id: 4 });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO', details: { campo: 'turno_id' } } });

    res = await request(app).post('/api/v1/pev/asignaciones').set('x-access-token', TOKEN_ADMIN)
      .send(Object.assign({}, cuerpo, { fecha_desde: '2026-02-31' }));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO', details: { campo: 'fecha_desde' } } });

    res = await request(app).post('/api/v1/pev/asignaciones').set('x-access-token', TOKEN_ADMIN)
      .send(Object.assign({}, cuerpo, { fecha_hasta: '2026-04-01' }));
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO', details: { campo: 'fecha_hasta' } } });

    expect(asignaciones.crear).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/pev/asignaciones/:id/cerrar y /anular', () => {
  it('cerrar camino feliz: 200 con la asignación CERRADA', async () => {
    asignaciones.cerrar.mockResolvedValue(Object.assign({}, ASIGNACION, {
      estado: 'CERRADA', activa_flag: null, fecha_hasta: '2026-03-15', cerrada_by: 1, cerrada_at: '2026-03-15T12:00:00Z'
    }));
    const res = await request(buildApp()).patch('/api/v1/pev/asignaciones/9/cerrar')
      .set('x-access-token', TOKEN_ADMIN).send({ fecha_hasta: '2026-03-15', motivo: 'fin' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: { estado: 'CERRADA', activa_flag: null, fecha_hasta: '2026-03-15' } });
    expect(asignaciones.cerrar).toHaveBeenCalledWith(9, { fecha_hasta: '2026-03-15', motivo: 'fin' }, expect.anything());
  });

  it('cerrar: fecha inválida (2026-02-31) 400 y fecha_hasta < fecha_desde (error del servicio) 400', async () => {
    const app = buildApp();
    let res = await request(app).patch('/api/v1/pev/asignaciones/9/cerrar')
      .set('x-access-token', TOKEN_ADMIN).send({ fecha_hasta: '2026-02-31' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
    expect(asignaciones.cerrar).not.toHaveBeenCalled();

    asignaciones.cerrar.mockRejectedValue(new AppError('CAMPO_INVALIDO', 'fecha_hasta < fecha_desde', 400, { campo: 'fecha_hasta' }));
    res = await request(app).patch('/api/v1/pev/asignaciones/9/cerrar')
      .set('x-access-token', TOKEN_ADMIN).send({ fecha_hasta: '2026-02-01' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
  });

  it('anular: sin motivo 400; camino feliz 200 ANULADA', async () => {
    const app = buildApp();
    let res = await request(app).patch('/api/v1/pev/asignaciones/9/anular')
      .set('x-access-token', TOKEN_ADMIN).send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO', details: { campo: 'motivo' } } });
    expect(asignaciones.anular).not.toHaveBeenCalled();

    asignaciones.anular.mockResolvedValue(Object.assign({}, ASIGNACION, { estado: 'ANULADA', activa_flag: null, motivo: 'carga duplicada' }));
    res = await request(app).patch('/api/v1/pev/asignaciones/9/anular')
      .set('x-access-token', TOKEN_ADMIN).send({ motivo: 'carga duplicada' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, data: { estado: 'ANULADA', motivo: 'carga duplicada' } });
  });
});

describe('GET y verbo DELETE', () => {
  it('GET /asignaciones lista con meta y rechaza estado inválido (400)', async () => {
    asignaciones.listar.mockResolvedValue({ rows: [ASIGNACION], count: 1 });
    const app = buildApp();
    const res = await request(app).get('/api/v1/pev/asignaciones?estado=ACTIVA&page=1&limit=20').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1 });

    const mal = await request(app).get('/api/v1/pev/asignaciones?estado=BORRADA').set('x-access-token', TOKEN_ADMIN);
    expect(mal.status).toBe(400);
    expect(mal.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO' } });
  });

  it('GET /actividades lista con pasos serializados', async () => {
    actividades.listar.mockResolvedValue({
      rows: [{ id: 1, cliente_id: 10, nombre: 'Pulido', estado: 1, origen: 'APP', created_by: 1, pasos: [{ id: 11, actividad_id: 1, orden: 1, nombre: 'Despolvado', columna_legacy: 'despolvado', estado: 1 }] }],
      count: 1
    });
    const res = await request(buildApp()).get('/api/v1/pev/actividades').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.data[0].pasos).toEqual([{ id: 11, actividad_id: 1, orden: 1, nombre: 'Despolvado', columna_legacy: 'despolvado', estado: 1 }]);
  });

  it('DELETE /asignaciones/:id no existe como verbo: 404 NOT_FOUND (sin borrado físico)', async () => {
    const res = await request(buildApp()).delete('/api/v1/pev/asignaciones/9').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
