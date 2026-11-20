/**
 * RF-PEV-02c (C3) — middleware/auth-laboral.js con jsonwebtoken REAL (firma, expiración y algoritmo se prueban
 * de verdad). Solo se simulan los modelos Trabajadore y acceso_laboral. Patrón: tests/middleware/auth-bodega.test.js.
 */
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const Trabajadore = require('../../modelos/sistema_base/Trabajadore');
const AccesoLaboral = require('../../modelos/sistema_intranet/acceso_laboral');
const { autenticarLaboral, exigirSupervisor } = require('../../middleware/auth-laboral');
const { manejadorErrores } = require('../../middleware/errores');

const CLAVE = 'clave-de-prueba-rf-pev-02c';
const firmar = (payload, opciones, clave) => jwt.sign(payload, clave || CLAVE, Object.assign({ expiresIn: '1h' }, opciones || {}));

// Token de POST /acces_laboral/login: tipo_acceso, sin roleId. id = trabajadores.id.
const TRABAJADOR = { id: 7, tipo_acceso: 0, n_empleado: 120 };
const SUPERVISOR = { id: 8, tipo_acceso: 1, n_empleado: 121 };

function app() {
  const a = express();
  const responder = (req, res) => res.json({ ok: true, data: req.usuario });
  a.get('/trabajador', autenticarLaboral, responder);
  a.get('/supervisor', autenticarLaboral, exigirSupervisor, responder);
  a.use(manejadorErrores);
  return a;
}

const get = (ruta, token) => {
  const r = request(app()).get(ruta);
  return token === undefined ? r : r.set('x-access-token', token);
};

let consoleError;
beforeAll(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => consoleError.mockRestore());

beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
  // Trabajador 7 activo; supervisor 8 activo. Acceso laboral activo solo del tipo que tiene cada uno.
  Trabajadore.findById.mockImplementation(async (id) => {
    if (id === 7) return { id: 7, nombre: 'Ana', apellido: 'Pérez', n_empleado: 120, estado: 1 };
    if (id === 8) return { id: 8, nombre: 'Luis', apellido: 'Soto', n_empleado: 121, estado: 1 };
    return null;
  });
  AccesoLaboral.findOne.mockImplementation(async (o) => {
    const w = o.where;
    const tiene = (id, tipo) => (w.trabajadoreId === id && w.estado === 1 && w.tipo === tipo ? { id: 70 } : null);
    return tiene(7, 0) || tiene(8, 1);
  });
});

describe('token', () => {
  it('sin x-access-token -> 401 TOKEN_REQUERIDO sin consultar la BD', async () => {
    const r = await get('/trabajador');
    expect(r.status).toBe(401);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    expect(Trabajadore.findById).not.toHaveBeenCalled();
  });

  it('firmado con otra clave, expirado, alg none o HS512 -> 401 (solo HS256)', async () => {
    const otraClave = await get('/trabajador', firmar(TRABAJADOR, {}, 'otra-clave'));
    expect(otraClave.status).toBe(401);
    expect(otraClave.body.error.code).toBe('TOKEN_INVALID');

    const expirado = await get('/trabajador', firmar(TRABAJADOR, { expiresIn: -10 }));
    expect(expirado.status).toBe(401);
    expect(expirado.body.error.code).toBe('TOKEN_EXPIRED');

    const sinFirma = await get('/trabajador', jwt.sign(TRABAJADOR, null, { algorithm: 'none' }));
    expect(sinFirma.status).toBe(401);

    const hs512 = await get('/trabajador', firmar(TRABAJADOR, { algorithm: 'HS512' }));
    expect(hs512.status).toBe(401);
    expect(Trabajadore.findById).not.toHaveBeenCalled();
  });

  it('token de usuarios/clientes (con roleId, o sin tipo_acceso) -> 401 sin consultar la BD', async () => {
    const conRol = await get('/supervisor', firmar(Object.assign({}, SUPERVISOR, { roleId: 1 })));
    expect(conRol.status).toBe(401);
    const sinTipo = await get('/trabajador', firmar({ id: 7, correo: 'x@x.cl' }));
    expect(sinTipo.status).toBe(401);
    expect(Trabajadore.findById).not.toHaveBeenCalled();
  });

  it('tipo_acceso fuera de {0,1} (p. ej. 2) -> 401', async () => {
    const r = await get('/trabajador', firmar(Object.assign({}, TRABAJADOR, { tipo_acceso: 2 })));
    expect(r.status).toBe(401);
  });
});

describe('trabajador activo y acceso activo', () => {
  it('tipo 0 pasa con req.usuario derivado de la BD (no del payload) y es_supervisor false', async () => {
    const r = await get('/trabajador', firmar(Object.assign({}, TRABAJADOR, { n_empleado: 999 })));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ id: 7, n_empleado: 120, nombre: 'Ana Pérez', rol_nombre: null, contexto: 'acceso_trabajadores', es_supervisor: false });
  });

  it('tipo 1 pasa en /supervisor con es_supervisor true', async () => {
    const r = await get('/supervisor', firmar(SUPERVISOR));
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ id: 8, contexto: 'acceso_trabajadores', es_supervisor: true });
  });

  it('tipo 0 en /supervisor -> 403 FORBIDDEN (el acceso sigue siendo válido para /trabajador)', async () => {
    const sup = await get('/supervisor', firmar(TRABAJADOR));
    expect(sup.status).toBe(403);
    expect(sup.body.error.code).toBe('FORBIDDEN');
    const trab = await get('/trabajador', firmar(TRABAJADOR));
    expect(trab.status).toBe(200);
  });

  it('trabajador inactivo e inexistente -> mismo 401 genérico (no revela cuál)', async () => {
    Trabajadore.findById.mockImplementation(async (id) => (id === 7 ? { id: 7, nombre: 'Ana', estado: 0 } : null));
    const inactivo = await get('/trabajador', firmar(TRABAJADOR));
    const inexistente = await get('/trabajador', firmar(Object.assign({}, TRABAJADOR, { id: 999 })));
    expect(inactivo.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(inactivo.body.error).toEqual(inexistente.body.error);
    expect(inactivo.body.error.message).toBe('credenciales no validas');
  });

  it('acceso laboral sin el tipo que declara el token (o inactivo) -> 401', async () => {
    // El trabajador 8 solo tiene acceso tipo 1: un token que declara tipo 0 no tiene acceso de tipo 0.
    const r = await get('/trabajador', firmar(Object.assign({}, SUPERVISOR, { tipo_acceso: 0 })));
    expect(r.status).toBe(401);
    expect(AccesoLaboral.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ trabajadoreId: 8, estado: 1, tipo: 0 }) }));
    AccesoLaboral.findOne.mockResolvedValue(null);
    expect((await get('/supervisor', firmar(SUPERVISOR))).status).toBe(401);
  });

  it('revalida en cada request: si el trabajador se desactiva con el token vigente, la siguiente llamada da 401', async () => {
    const token = firmar(TRABAJADOR);
    expect((await get('/trabajador', token)).status).toBe(200);
    Trabajadore.findById.mockResolvedValue({ id: 7, nombre: 'Ana', estado: 0 });
    expect((await get('/trabajador', token)).status).toBe(401);
  });
});
