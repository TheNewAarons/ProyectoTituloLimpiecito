/**
 * RF-CAJA-02 — Tests de la capa HTTP nueva: api/apartado_base/liquidacion/{routes-v1,controlador-v1}.js
 * + middleware/auth.js, montados en /api/v1/liquidaciones (ver index.js). Mockea jsonwebtoken,
 * el modelo Role y services/liquidaciones/pago (la lógica de negocio ya se cubre en
 * tests/services/liquidaciones/pago.test.js y tests/services/caja/*: aquí NO se duplican esos
 * casos, solo se verifica el cableado HTTP: status codes, rol, formato {ok,data,meta}/{ok:false,error}).
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Role', () => ({
  findById: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Liquidacion', () => ({
  findAll: jest.fn()
}));
jest.mock('../../database/database', () => ({
  sequelize: {
    where: jest.fn((a, b) => ({ __where: true, a, b })),
    fn: jest.fn((name, col) => ({ __fn: name, col })),
    col: jest.fn((c) => ({ __col: c }))
  }
}));
jest.mock('../../services/liquidaciones/pago', () => ({
  pagar: jest.fn(),
  pagarLote: jest.fn(),
  revertirPago: jest.fn()
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const Liquidacion = require('../../modelos/sistema_base/Liquidacion');
const pagoService = require('../../services/liquidaciones/pago');
const AppError = require('../../libs/app-error');

const routerLiquidaciones = require('../../api/apartado_base/liquidacion/routes-v1');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/liquidaciones', routerLiquidaciones);
  app.use(noEncontrado);
  app.use(manejadorErrores);
  return app;
}

const TOKEN_ADMIN = 'token-admin';
const TOKEN_RRHH = 'token-rrhh';
const TOKEN_SIN_ROL = 'token-sin-rol';

function configurarJwtYRol() {
  jwt.verify.mockImplementation((token) => {
    if (token === TOKEN_ADMIN) return { id: 1, nombre: 'Admin User', correo: 'a@a.com', roleId: 1 };
    if (token === TOKEN_RRHH) return { id: 2, nombre: 'RRHH User', correo: 'r@r.com', roleId: 2 };
    if (token === TOKEN_SIN_ROL) return { id: 3, nombre: 'Sin Rol', correo: 's@s.com', roleId: 99 };
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    throw err;
  });
  Role.findById.mockImplementation((id) => {
    if (id === 1) return Promise.resolve({ id: 1, nombre: 'Administrador' });
    if (id === 2) return Promise.resolve({ id: 2, nombre: 'RRHH' });
    return Promise.resolve({ id: 99, nombre: 'Otro' });
  });
}

describe('API /api/v1/liquidaciones', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    configurarJwtYRol();
    app = buildApp();
  });

  describe('autenticacion (middleware/auth.js)', () => {
    it('GET sin x-access-token responde 401 TOKEN_REQUERIDO', async () => {
      const res = await request(app).get('/api/v1/liquidaciones');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    });

    it('GET con token invalido responde 401 TOKEN_INVALID', async () => {
      const res = await request(app).get('/api/v1/liquidaciones').set('x-access-token', 'basura');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_INVALID' } });
    });

    it('token expirado responde 401 TOKEN_EXPIRED', async () => {
      jwt.verify.mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });
      const res = await request(app).get('/api/v1/liquidaciones').set('x-access-token', 'cualquiera');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_EXPIRED' } });
    });
  });

  describe('autorizacion por rol', () => {
    it('RRHH recibe 403 en PATCH :id/revertir-pago (solo Admin)', async () => {
      const res = await request(app)
        .patch('/api/v1/liquidaciones/1/revertir-pago')
        .set('x-access-token', TOKEN_RRHH)
        .send({ motivo: 'x' });
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
      expect(pagoService.revertirPago).not.toHaveBeenCalled();
    });

    it('Admin puede revertir-pago (200) y el servicio recibe usuario/contexto desde el token', async () => {
      pagoService.revertirPago.mockResolvedValue({ id: 1, estado_pago: 'EN_ESPERA' });
      const res = await request(app)
        .patch('/api/v1/liquidaciones/1/revertir-pago')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ motivo: 'pago duplicado' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: { id: 1, estado_pago: 'EN_ESPERA' } });
      expect(pagoService.revertirPago).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ motivo: 'pago duplicado', usuario: { id: 1, contexto: 'usuarios' } })
      );
    });

    it('un rol sin permiso (ni admin ni rrhh) recibe 403 en GET listar', async () => {
      const res = await request(app).get('/api/v1/liquidaciones').set('x-access-token', TOKEN_SIN_ROL);
      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });

    it('RRHH puede listar (permitido para Admin y RRHH)', async () => {
      Liquidacion.findAll.mockResolvedValue([]);
      const res = await request(app).get('/api/v1/liquidaciones').set('x-access-token', TOKEN_RRHH);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /api/v1/liquidaciones (filtros)', () => {
    it('filtra por periodo y estado_pago validos y responde {ok,data,meta}', async () => {
      Liquidacion.findAll.mockResolvedValue([{ id: 1 }]);
      const res = await request(app)
        .get('/api/v1/liquidaciones?periodo=2026-01&estado_pago=EN_ESPERA')
        .set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        data: [{ id: 1 }],
        meta: { total: 1, periodo: '2026-01', estado_pago: 'EN_ESPERA' }
      });
      const whereUsado = Liquidacion.findAll.mock.calls[0][0].where;
      expect(whereUsado.estado_pago).toBe('EN_ESPERA');
    });

    it('rechaza periodo con formato invalido (400 PERIODO_INVALIDO)', async () => {
      const res = await request(app)
        .get('/api/v1/liquidaciones?periodo=2026-13')
        .set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'PERIODO_INVALIDO' } });
      expect(Liquidacion.findAll).not.toHaveBeenCalled();
    });

    it('rechaza estado_pago invalido (400 ESTADO_PAGO_INVALIDO)', async () => {
      const res = await request(app)
        .get('/api/v1/liquidaciones?estado_pago=NO_EXISTE')
        .set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'ESTADO_PAGO_INVALIDO' } });
    });
  });

  describe('PATCH /api/v1/liquidaciones/:id/pagar', () => {
    it('id no numerico responde 400 LIQUIDACION_ID_INVALIDO sin llamar al servicio', async () => {
      const res = await request(app)
        .patch('/api/v1/liquidaciones/abc/pagar')
        .set('x-access-token', TOKEN_ADMIN)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'LIQUIDACION_ID_INVALIDO' } });
      expect(pagoService.pagar).not.toHaveBeenCalled();
    });

    it('pagar con fecha_pago en dia 5 del mes siguiente: el controlador pasa esa fecha tal cual al servicio (periodo = fecha_pago.slice(0,7))', async () => {
      pagoService.pagar.mockResolvedValue({ id: 1, estado_pago: 'PAGADA', egreso: { id: 99, periodo: '2026-02' } });
      const res = await request(app)
        .patch('/api/v1/liquidaciones/1/pagar')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ fecha_pago: '2026-02-05' });
      expect(res.status).toBe(200);
      expect(pagoService.pagar).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ fecha_pago: '2026-02-05' })
      );
      expect(res.body.data.egreso.periodo).toBe('2026-02');
    });

    it('propaga MES_CERRADO del servicio como 409', async () => {
      pagoService.pagar.mockRejectedValue(new AppError('MES_CERRADO', 'la caja de 2026-02 esta cerrada', 409, { periodo: '2026-02' }));
      const res = await request(app)
        .patch('/api/v1/liquidaciones/1/pagar')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ fecha_pago: '2026-02-05' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'MES_CERRADO' } });
    });
  });

  describe('POST /api/v1/liquidaciones/pagar-lote (todo o nada)', () => {
    it('ids no es un arreglo responde 400 LOTE_INVALIDO sin llamar al servicio', async () => {
      const res = await request(app)
        .post('/api/v1/liquidaciones/pagar-lote')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ ids: 'no-array' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'LOTE_INVALIDO' } });
      expect(pagoService.pagarLote).not.toHaveBeenCalled();
    });

    it('un id invalido en el lote: el servicio rechaza todo y el controlador responde 4xx/409 ok:false (ningun egreso)', async () => {
      pagoService.pagarLote.mockRejectedValue(
        new AppError('ESTADO_PAGO_INVALIDO', 'la liquidacion 3 ya esta PAGADA', 409, { liquidacion_id: 3 })
      );
      const res = await request(app)
        .post('/api/v1/liquidaciones/pagar-lote')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ ids: [1, 2, 3, 4] });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'ESTADO_PAGO_INVALIDO', details: { liquidacion_id: 3 } } });
    });

    it('lote exitoso responde 200 con {ok,data}', async () => {
      pagoService.pagarLote.mockResolvedValue({ pagadas: [1, 2, 3] });
      const res = await request(app)
        .post('/api/v1/liquidaciones/pagar-lote')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ ids: [1, 2, 3] });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: { pagadas: [1, 2, 3] } });
    });
  });

  describe('PATCH /api/v1/liquidaciones/:id/revertir-pago', () => {
    it('propaga PAGO_HISTORICO_NO_REVERSIBLE del servicio como 409 (histórico con egreso_id NULL)', async () => {
      pagoService.revertirPago.mockRejectedValue(
        new AppError('PAGO_HISTORICO_NO_REVERSIBLE', 'pago historico sin egreso, no reversible', 409)
      );
      const res = await request(app)
        .patch('/api/v1/liquidaciones/1/revertir-pago')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ motivo: 'intento' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'PAGO_HISTORICO_NO_REVERSIBLE' } });
    });

    it('propaga MES_CERRADO del servicio como 409 al revertir', async () => {
      pagoService.revertirPago.mockRejectedValue(new AppError('MES_CERRADO', 'la caja esta cerrada', 409));
      const res = await request(app)
        .patch('/api/v1/liquidaciones/1/revertir-pago')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ motivo: 'x' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'MES_CERRADO' } });
    });
  });

  describe('ruta no encontrada bajo /api/v1', () => {
    it('metodo/ruta inexistente dentro del router responde 404 NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/liquidaciones/no-existe/sub').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    });
  });
});
