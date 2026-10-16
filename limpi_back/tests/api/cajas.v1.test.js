/**
 * RF-CAJA-01 — Tests de la capa HTTP: api/apartado_base/caja/{routes-v1,controlador-v1}.js
 * montada en /api/v1/cajas, + el alias legacy /api/v1/caja (N2, index.js) que ahora exige
 * autenticar + requerirRol(Admin) antes de delegar en el router legacy. La lógica de negocio
 * (cerrarMes/reabrirMes/obtenerResumen/obtenerHistorial) ya se cubre en
 * tests/services/caja/{cierre,lectura}.test.js: aquí solo se verifica el cableado HTTP.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Role', () => ({
  findById: jest.fn()
}));
jest.mock('../../services/caja', () => ({
  obtenerResumen: jest.fn(),
  obtenerHistorial: jest.fn(),
  cerrarMes: jest.fn(),
  reabrirMes: jest.fn()
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const cajaService = require('../../services/caja');
const AppError = require('../../libs/app-error');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');

const routerCajas = require('../../api/apartado_base/caja/routes-v1');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/cajas', routerCajas);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

const TOKEN_ADMIN = 'token-admin';
const TOKEN_RRHH = 'token-rrhh';

function configurarJwtYRol() {
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin User', correo: 'a@a.com', roleId: 1 };
    if (token === TOKEN_RRHH) return { id: 2, nombre: 'RRHH User', correo: 'r@r.com', roleId: 2 };
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

describe('API /api/v1/cajas', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    configurarJwtYRol();
    app = buildApp();
  });

  describe('autenticacion/autorizacion (comunes a los 4 endpoints)', () => {
    it('GET /:periodo/resumen sin x-access-token responde 401 TOKEN_REQUERIDO', async () => {
      const res = await request(app).get('/api/v1/cajas/2026-10/resumen');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
      expect(cajaService.obtenerResumen).not.toHaveBeenCalled();
    });

    it('GET /:periodo/resumen con rol no-Admin (RRHH) responde 403 FORBIDDEN', async () => {
      const res = await request(app).get('/api/v1/cajas/2026-10/resumen').set('x-access-token', TOKEN_RRHH);
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
      expect(cajaService.obtenerResumen).not.toHaveBeenCalled();
    });

    it('POST /:periodo/cerrar sin token responde 401', async () => {
      const res = await request(app).post('/api/v1/cajas/2026-10/cerrar');
      expect(res.status).toBe(401);
      expect(cajaService.cerrarMes).not.toHaveBeenCalled();
    });

    it('POST /:periodo/reabrir con rol no-Admin responde 403', async () => {
      const res = await request(app)
        .post('/api/v1/cajas/2026-10/reabrir')
        .set('x-access-token', TOKEN_RRHH)
        .send({ motivo: 'correccion' });
      expect(res.status).toBe(403);
      expect(cajaService.reabrirMes).not.toHaveBeenCalled();
    });

    it('GET /historial sin token responde 401', async () => {
      const res = await request(app).get('/api/v1/cajas/historial');
      expect(res.status).toBe(401);
      expect(cajaService.obtenerHistorial).not.toHaveBeenCalled();
    });
  });

  describe('GET /:periodo/resumen', () => {
    it('periodo con formato invalido responde 400 PERIODO_INVALIDO sin llamar al servicio', async () => {
      const res = await request(app).get('/api/v1/cajas/2026-13/resumen').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'PERIODO_INVALIDO' } });
      expect(cajaService.obtenerResumen).not.toHaveBeenCalled();
    });

    it('caso feliz responde {ok,data,meta} con el resultado del servicio', async () => {
      cajaService.obtenerResumen.mockResolvedValue({ periodo: '2026-10', saldo_final: 1000 });
      const res = await request(app).get('/api/v1/cajas/2026-10/resumen').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toMatchObject({ periodo: '2026-10', saldo_final: 1000 });
      expect(res.body.meta.calculado_en).toBeDefined();
    });

    it('propaga CAJA_NO_EXISTE del servicio como 404', async () => {
      cajaService.obtenerResumen.mockRejectedValue(new AppError('CAJA_NO_EXISTE', 'no existe', 404, { periodo: '2026-10' }));
      const res = await request(app).get('/api/v1/cajas/2026-10/resumen').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'CAJA_NO_EXISTE' } });
    });
  });

  describe('POST /:periodo/cerrar', () => {
    it('periodo invalido responde 400 sin llamar al servicio', async () => {
      const res = await request(app).post('/api/v1/cajas/no-es-periodo/cerrar').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(cajaService.cerrarMes).not.toHaveBeenCalled();
    });

    it('caso feliz responde {ok,data} con caja/siguiente/recalculados y usuario desde el token', async () => {
      cajaService.cerrarMes.mockResolvedValue({
        caja: { get: () => ({ id: 1, periodo: '2026-10', estado: 0 }) },
        siguiente: { get: () => ({ id: 2, periodo: '2026-11', estado: 1 }) },
        recalculados: []
      });
      const res = await request(app).post('/api/v1/cajas/2026-10/cerrar').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.caja.estado).toBe('CERRADA');
      expect(res.body.data.siguiente.estado).toBe('ABIERTA');
      expect(cajaService.cerrarMes).toHaveBeenCalledWith('2026-10', expect.objectContaining({ usuario: { id: 1, contexto: 'usuarios' } }));
    });

    it('propaga MES_ANTERIOR_ABIERTO del servicio como 409', async () => {
      cajaService.cerrarMes.mockRejectedValue(new AppError('MES_ANTERIOR_ABIERTO', 'mes anterior abierto', 409, { periodo: '2026-09' }));
      const res = await request(app).post('/api/v1/cajas/2026-10/cerrar').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'MES_ANTERIOR_ABIERTO' } });
    });
  });

  describe('POST /:periodo/reabrir', () => {
    it('sin motivo responde 400 MOTIVO_REQUERIDO sin llamar al servicio', async () => {
      const res = await request(app).post('/api/v1/cajas/2026-10/reabrir').set('x-access-token', TOKEN_ADMIN).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'MOTIVO_REQUERIDO' } });
      expect(cajaService.reabrirMes).not.toHaveBeenCalled();
    });

    it('motivo valido responde 200 con la caja reabierta', async () => {
      cajaService.reabrirMes.mockResolvedValue({ caja: { get: () => ({ id: 1, periodo: '2026-10', estado: 1 }) } });
      const res = await request(app)
        .post('/api/v1/cajas/2026-10/reabrir')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ motivo: 'correccion manual del cierre' });
      expect(res.status).toBe(200);
      expect(res.body.data.caja.estado).toBe('ABIERTA');
      expect(cajaService.reabrirMes).toHaveBeenCalledWith(
        '2026-10',
        expect.objectContaining({ motivo: 'correccion manual del cierre' })
      );
    });
  });

  describe('GET /historial', () => {
    it('propaga RANGO_INVALIDO del servicio como 400', async () => {
      cajaService.obtenerHistorial.mockRejectedValue(new AppError('RANGO_INVALIDO', 'desde > hasta', 400));
      const res = await request(app)
        .get('/api/v1/cajas/historial?desde=2026-05&hasta=2026-01')
        .set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'RANGO_INVALIDO' } });
    });

    it('caso feliz responde {ok,data,meta} con items e info del rango', async () => {
      cajaService.obtenerHistorial.mockResolvedValue({ items: [{ periodo: '2026-10' }], desde: '2025-11', hasta: '2026-10' });
      const res = await request(app).get('/api/v1/cajas/historial').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: [{ periodo: '2026-10' }], meta: { desde: '2025-11', hasta: '2026-10', total: 1 } });
    });

    it('ruta estatica /historial no se interpreta como :periodo (no dispara PERIODO_INVALIDO)', async () => {
      cajaService.obtenerHistorial.mockResolvedValue({ items: [], desde: '2025-11', hasta: '2026-10' });
      const res = await request(app).get('/api/v1/cajas/historial').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(cajaService.obtenerResumen).not.toHaveBeenCalled();
    });
  });

  describe('ruta no encontrada bajo /api/v1/cajas', () => {
    it('metodo/ruta inexistente responde 404 NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/cajas/no-existe/sub').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    });
  });
});

/**
 * N2 (TASK_PLAN §9): el alias legacy /api/v1/caja (singular) ya NO queda sin auth: index.js monta
 * `autenticar + requerirRol(Admin)` justo antes de reexponer el router legacy completo (`api`) bajo
 * /api/v1. Se replica aquí esa composición exacta (sin requerir todo index.js: evita abrir
 * conexiones de BD/cron reales) para verificar que sigue bloqueando sin token/rol.
 */
describe('Alias legacy /api/v1/caja (N2) exige autenticacion', () => {
  function buildAppConAliasLegacy() {
    const legacyApi = express.Router();
    legacyApi.get('/caja/editar', (req, res) => res.json({ ok: true, legacy: true }));

    const app = express();
    app.use(express.json());
    app.use('/api/v1/caja', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES));
    app.use('/api/v1', legacyApi);
    app.use(noEncontrado);
    app.use(manejadorErrores);
    return app;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    configurarJwtYRol();
  });

  it('sin token responde 401 en el alias /api/v1/caja (el prefijo legacy solo protege PUT /caja/cerrar; H-SEC-05 sigue abierto para el resto)', async () => {
    const app = buildAppConAliasLegacy();
    const res = await request(app).get('/api/v1/caja/editar');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
  });

  it('con token pero sin rol Admin responde 403', async () => {
    const app = buildAppConAliasLegacy();
    const res = await request(app).get('/api/v1/caja/editar').set('x-access-token', TOKEN_RRHH);
    expect(res.status).toBe(403);
  });

  it('con token Admin llega al handler legacy (200)', async () => {
    const app = buildAppConAliasLegacy();
    const res = await request(app).get('/api/v1/caja/editar').set('x-access-token', TOKEN_ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, legacy: true });
  });
});
