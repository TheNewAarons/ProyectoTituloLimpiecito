/**
 * RF-PEV-02c (C3) — Capa HTTP de /api/v1/pev/trabajador, /api/v1/pev/supervisor y del GET de cumplimiento y
 * meta.lineas_posteriores de cerrar (admin). Monta el mismo orden que index.js: routers laborales (con
 * autenticarLaboral) ANTES del gate Admin de /api/v1/pev. Servicios simulados; jsonwebtoken REAL.
 * La lógica de negocio (IDOR, locks, historial, 10->9) está en tests/services/pev/cumplimiento.test.js.
 */
const P = '/web-limpiecito';

jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/apartado_listas_pev/actividadPaso', () => ({ findAll: jest.fn() }));
jest.mock('../../services/pev/cumplimiento', () => ({
  marcarPaso: jest.fn(), chequear: jest.fn(), observar: jest.fn(), delDia: jest.fn(), historial: jest.fn()
}));
jest.mock('../../services/pev/asignaciones', () => ({
  listar: jest.fn(), crear: jest.fn(), cerrar: jest.fn(), anular: jest.fn(), ESTADOS: ['ACTIVA', 'CERRADA', 'ANULADA']
}));
jest.mock('../../services/pev/actividades', () => ({ listar: jest.fn(), crear: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const Trabajadore = require('../../modelos/sistema_base/Trabajadore');
const AccesoLaboral = require('../../modelos/sistema_intranet/acceso_laboral');
const Role = require('../../modelos/sistema_base/Role');
const ActividadPaso = require('../../modelos/apartado_listas_pev/actividadPaso');
const cumplimiento = require('../../services/pev/cumplimiento');
const asignaciones = require('../../services/pev/asignaciones');
const AppError = require('../../libs/app-error');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { autenticarLaboral, exigirSupervisor } = require('../../middleware/auth-laboral');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');
const laboral = require('../../api/v1/pev/laboral/routes');
const routerPev = require('../../api/v1/pev/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-pev-02c-http';
const firmar = (payload) => jwt.sign(payload, CLAVE, { expiresIn: '1h' });
const TOKEN_TRABAJADOR = firmar({ id: 7, tipo_acceso: 0, n_empleado: 120 });
const TOKEN_SUPERVISOR = firmar({ id: 8, tipo_acceso: 1, n_empleado: 121 });
const TOKEN_ADMIN = firmar({ id: 1, roleId: 1, nombre: 'Admin', correo: 'a@a.cl' });
const TOKEN_USUARIOS = firmar({ id: 1, roleId: 1, correo: 'a@a.cl', tipo_acceso: 1 });

const ASIGNACION = {
  id: 9, actividad_id: 1, area_id: 2, trabajador_id: 7, tarea_id: 30, turno_id: 3,
  fecha_desde: '2026-03-01', fecha_hasta: null, estado: 'ACTIVA', activa_flag: 1
};
const LINEA = { id: 50, asignacionId: 9, tarea_id: 30, lista_id: 5, lista_estado: 1, pasos: [], observaciones: null };

function buildApp() {
  const app = express();
  app.use(express.json());
  // Mismo orden que index.js: laborales antes del gate Admin de /api/v1/pev.
  app.use(P + '/api/v1/pev/trabajador', autenticarLaboral, laboral.trabajador);
  app.use(P + '/api/v1/pev/supervisor', autenticarLaboral, exigirSupervisor, laboral.supervisor);
  app.use(P + '/api/v1/pev', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), routerPev);
  app.use(P + '/api/v1', noEncontrado);
  app.use(manejadorErrores);
  return app;
}

const app = () => buildApp();
const PATCH_PASO = (linea, paso) => P + '/api/v1/pev/trabajador/lineas/' + linea + '/pasos/' + paso;
const PATCH_CHEQUEO = (linea, ronda) => P + '/api/v1/pev/supervisor/lineas/' + linea + '/chequeos/' + ronda;
const PATCH_OBS = (linea) => P + '/api/v1/pev/supervisor/lineas/' + linea + '/observaciones';

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  Trabajadore.findById.mockImplementation(async (id) => {
    if (id === 7) return { id: 7, nombre: 'Ana', apellido: 'Pérez', n_empleado: 120, estado: 1 };
    if (id === 8) return { id: 8, nombre: 'Luis', apellido: 'Soto', n_empleado: 121, estado: 1 };
    return null;
  });
  AccesoLaboral.findOne.mockImplementation(async (o) => {
    const w = o.where;
    if (w.trabajadoreId === 7 && w.tipo === 0) return { id: 70 };
    if (w.trabajadoreId === 8 && w.tipo === 1) return { id: 80 };
    return null;
  });
  Role.findById.mockImplementation(async (id) => (id === 1 ? { id: 1, nombre: 'Administrador' } : null));
  cumplimiento.marcarPaso.mockResolvedValue({ sin_cambios: false, linea: LINEA });
  cumplimiento.chequear.mockResolvedValue({ sin_cambios: false, linea: LINEA });
  cumplimiento.observar.mockResolvedValue({ sin_cambios: false, linea: LINEA });
  cumplimiento.delDia.mockResolvedValue([]);
  asignaciones.listar.mockResolvedValue({ rows: [], count: 0 });
});

describe('autenticación de las rutas laborales', () => {
  it('sin token en /trabajador -> 401 TOKEN_REQUERIDO y el servicio no se llama', async () => {
    const r = await request(app()).patch(PATCH_PASO(50, 1)).send({});
    expect(r.status).toBe(401);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    expect(cumplimiento.marcarPaso).not.toHaveBeenCalled();
  });

  it('token de usuarios/clientes (con roleId) -> 401 en las rutas laborales', async () => {
    const r = await request(app()).patch(PATCH_PASO(50, 1)).set('x-access-token', TOKEN_USUARIOS).send({});
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_INVALID');
    expect(cumplimiento.marcarPaso).not.toHaveBeenCalled();
  });

  it('trabajador tipo 0 en /supervisor -> 403 FORBIDDEN; supervisor tipo 1 sí llega al servicio', async () => {
    let r = await request(app()).patch(PATCH_CHEQUEO(50, 1)).set('x-access-token', TOKEN_TRABAJADOR)
      .send({ despolvado: 1, aplicacion_producto: 0, abrillantado: 1 });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('FORBIDDEN');
    expect(cumplimiento.chequear).not.toHaveBeenCalled();

    r = await request(app()).patch(PATCH_CHEQUEO(50, 1)).set('x-access-token', TOKEN_SUPERVISOR)
      .send({ despolvado: 1, aplicacion_producto: 0, abrillantado: 1 });
    expect(r.status).toBe(200);
    expect(cumplimiento.chequear).toHaveBeenCalledTimes(1);
  });

  it('ruta inexistente bajo /trabajador o /supervisor -> 404 JSON (no 403 del gate Admin)', async () => {
    const trab = await request(app()).get(P + '/api/v1/pev/trabajador/xyz').set('x-access-token', TOKEN_TRABAJADOR);
    expect(trab.status).toBe(404);
    expect(trab.headers['content-type']).toMatch(/json/);
    expect(trab.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });

    const sup = await request(app()).get(P + '/api/v1/pev/supervisor/xyz').set('x-access-token', TOKEN_SUPERVISOR);
    expect(sup.status).toBe(404);
    expect(sup.body.error.code).toBe('NOT_FOUND');
  });

  it('el token laboral no abre el gate Admin de /api/v1/pev; el admin sí lista', async () => {
    const laboralEnAdmin = await request(app()).get(P + '/api/v1/pev/asignaciones').set('x-access-token', TOKEN_TRABAJADOR);
    expect(laboralEnAdmin.status).toBe(403);
    expect(laboralEnAdmin.body.error.code).toBe('FORBIDDEN');
    expect(asignaciones.listar).not.toHaveBeenCalled();

    const admin = await request(app()).get(P + '/api/v1/pev/asignaciones').set('x-access-token', TOKEN_ADMIN);
    expect(admin.status).toBe(200);
    expect(asignaciones.listar).toHaveBeenCalledTimes(1);
  });
});

describe('validación de entrada -> 400 CAMPO_INVALIDO sin llamar al servicio', () => {
  const casos = [
    ['paso fuera de rango (4)', () => request(app()).patch(PATCH_PASO(50, 4)).set('x-access-token', TOKEN_TRABAJADOR).send({}), 'paso'],
    ['paso cero', () => request(app()).patch(PATCH_PASO(50, 0)).set('x-access-token', TOKEN_TRABAJADOR).send({}), 'paso'],
    ['lineaId no numérico', () => request(app()).patch(PATCH_PASO('abc', 1)).set('x-access-token', TOKEN_TRABAJADOR).send({}), 'lineaId'],
    ['body con hora (mass assignment)', () => request(app()).patch(PATCH_PASO(50, 1)).set('x-access-token', TOKEN_TRABAJADOR).send({ hora_check_trabajador_1: '10:00:00' }), 'hora_check_trabajador_1'],
    ['chequeo sin abrillantado', () => request(app()).patch(PATCH_CHEQUEO(50, 1)).set('x-access-token', TOKEN_SUPERVISOR).send({ despolvado: 1, aplicacion_producto: 0 }), 'abrillantado'],
    ['chequeo con hora_1 extra', () => request(app()).patch(PATCH_CHEQUEO(50, 1)).set('x-access-token', TOKEN_SUPERVISOR).send({ despolvado: 1, aplicacion_producto: 0, abrillantado: 1, hora_1: '10:00:00' }), 'hora_1'],
    ['chequeo con valor 2', () => request(app()).patch(PATCH_CHEQUEO(50, 1)).set('x-access-token', TOKEN_SUPERVISOR).send({ despolvado: 2, aplicacion_producto: 0, abrillantado: 1 }), 'despolvado'],
    ['ronda 4', () => request(app()).patch(PATCH_CHEQUEO(50, 4)).set('x-access-token', TOKEN_SUPERVISOR).send({ despolvado: 1, aplicacion_producto: 0, abrillantado: 1 }), 'ronda'],
    ['observaciones de 256 caracteres', () => request(app()).patch(PATCH_OBS(50)).set('x-access-token', TOKEN_SUPERVISOR).send({ observaciones: 'x'.repeat(256) }), 'observaciones'],
    ['observaciones con tareaId (mass assignment)', () => request(app()).patch(PATCH_OBS(50)).set('x-access-token', TOKEN_SUPERVISOR).send({ observaciones: 'ok', tareaId: 3 }), 'tareaId'],
    ['observaciones numérico', () => request(app()).patch(PATCH_OBS(50)).set('x-access-token', TOKEN_SUPERVISOR).send({ observaciones: 5 }), 'observaciones'],
    ['fecha inexistente (2026-02-31) en la lista del trabajador', () => request(app()).get(P + '/api/v1/pev/trabajador/asignaciones?fecha=2026-02-31').set('x-access-token', TOKEN_TRABAJADOR), 'fecha']
  ];
  it.each(casos)('%s', async (_nombre, lanzar, campo) => {
    const r = await lanzar();
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'CAMPO_INVALIDO', details: { campo: campo } } });
    expect(cumplimiento.marcarPaso).not.toHaveBeenCalled();
    expect(cumplimiento.chequear).not.toHaveBeenCalled();
    expect(cumplimiento.observar).not.toHaveBeenCalled();
  });

  it('observaciones "   " se recorta a vacío y null se trata como borrar (ambos llegan al servicio como "")', async () => {
    await request(app()).patch(PATCH_OBS(50)).set('x-access-token', TOKEN_SUPERVISOR).send({ observaciones: '   ' }).expect(200);
    await request(app()).patch(PATCH_OBS(50)).set('x-access-token', TOKEN_SUPERVISOR).send({ observaciones: null }).expect(200);
    expect(cumplimiento.observar.mock.calls.map((c) => c[1])).toEqual(['', '']);
  });
});

describe('propiedad y respuesta de los endpoints de marca', () => {
  it('el dueño sale del token (req.usuario), no del body ni de la ruta', async () => {
    await request(app()).patch(PATCH_PASO(50, 2)).set('x-access-token', TOKEN_TRABAJADOR).send({});
    expect(cumplimiento.marcarPaso).toHaveBeenCalledWith(50, 2, expect.objectContaining({
      usuario: expect.objectContaining({ id: 7, contexto: 'acceso_trabajadores', es_supervisor: false })
    }));
  });

  it('idempotencia: 1ª marca sin_cambios false; repetida sin_cambios true (meta) con 200', async () => {
    const r1 = await request(app()).patch(PATCH_PASO(50, 1)).set('x-access-token', TOKEN_TRABAJADOR).send({});
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ ok: true, data: { id: 50 }, meta: { sin_cambios: false } });
    cumplimiento.marcarPaso.mockResolvedValueOnce({ sin_cambios: true, linea: LINEA });
    const r2 = await request(app()).patch(PATCH_PASO(50, 1)).set('x-access-token', TOKEN_TRABAJADOR).send({});
    expect(r2.body.meta).toEqual({ sin_cambios: true });
  });

  test.each([
    ['ASIGNACION_AJENA', 403],
    ['LISTA_AJENA', 403],
    ['LISTA_FIRMADA', 409],
    ['LINEA_SIN_ASIGNACION', 409],
    ['ASIGNACION_NO_VIGENTE', 409],
    ['LINEA_NO_EXISTE', 404]
  ])('error de negocio %s se responde %i con su código', async (codigo, estado) => {
    cumplimiento.marcarPaso.mockRejectedValueOnce(new AppError(codigo, 'mensaje de prueba', estado, { linea_id: 50 }));
    const r = await request(app()).patch(PATCH_PASO(50, 1)).set('x-access-token', TOKEN_TRABAJADOR).send({});
    expect(r.status).toBe(estado);
    expect(r.body).toMatchObject({ ok: false, error: { code: codigo } });
  });

  it('LISTA_AJENA en chequeo del supervisor se responde 403', async () => {
    cumplimiento.chequear.mockRejectedValueOnce(new AppError('LISTA_AJENA', 'la lista pertenece a otro supervisor', 403, {}));
    const r = await request(app()).patch(PATCH_CHEQUEO(50, 1)).set('x-access-token', TOKEN_SUPERVISOR)
      .send({ despolvado: 1, aplicacion_producto: 0, abrillantado: 1 });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('LISTA_AJENA');
  });
});

describe('admin: cumplimiento por asignación y meta.lineas_posteriores al cerrar', () => {
  it('GET /pev/asignaciones/:id/cumplimiento pasa filtros paginados y devuelve meta', async () => {
    cumplimiento.historial.mockResolvedValue({ rows: [LINEA], count: 1 });
    const r = await request(app()).get(P + '/api/v1/pev/asignaciones/9/cumplimiento?desde=2026-03-01&hasta=2026-03-31&page=2&limit=5')
      .set('x-access-token', TOKEN_ADMIN);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, data: [LINEA], meta: { page: 2, limit: 5, total: 1 } });
    expect(cumplimiento.historial).toHaveBeenCalledWith(9, { desde: '2026-03-01', hasta: '2026-03-31', page: 2, limit: 5 });
  });

  it('GET cumplimiento: fecha desde inválida -> 400 y id inexistente -> 404 ASIGNACION_NO_EXISTE', async () => {
    let r = await request(app()).get(P + '/api/v1/pev/asignaciones/9/cumplimiento?desde=2026-02-31').set('x-access-token', TOKEN_ADMIN);
    expect(r.status).toBe(400);
    expect(cumplimiento.historial).not.toHaveBeenCalled();

    cumplimiento.historial.mockRejectedValueOnce(new AppError('ASIGNACION_NO_EXISTE', 'no existe', 404, {}));
    r = await request(app()).get(P + '/api/v1/pev/asignaciones/999/cumplimiento').set('x-access-token', TOKEN_ADMIN);
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('ASIGNACION_NO_EXISTE');
  });

  it('PATCH cerrar responde meta.lineas_posteriores sin filtrarlo dentro de data', async () => {
    asignaciones.cerrar.mockResolvedValue(Object.assign({}, ASIGNACION, {
      estado: 'CERRADA', activa_flag: null, fecha_hasta: '2026-03-10', lineas_posteriores: 2
    }));
    const r = await request(app()).patch(P + '/api/v1/pev/asignaciones/9/cerrar').set('x-access-token', TOKEN_ADMIN)
      .send({ fecha_hasta: '2026-03-10' });
    expect(r.status).toBe(200);
    expect(r.body.meta).toEqual({ lineas_posteriores: 2 });
    expect(r.body.data).toMatchObject({ id: 9, estado: 'CERRADA' });
    expect(r.body.data.lineas_posteriores).toBeUndefined();
  });
});
