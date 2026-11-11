/**
 * RF-FAC-01 — Tests de la capa HTTP: api/v1/facturas/{controlador,routes}.js montada bajo
 * /api/v1. Solo Admin en todos los endpoints (pagar/anular/revertir incluidos: no hay un rol
 * intermedio que pueda pagar pero no revertir). La maquina de estados se cubre en
 * tests/services/facturas/pago.test.js: aqui solo se verifica el cableado HTTP, los filtros de
 * listado y /facturas/resumen.
 */
const express = require('express');
const request = require('supertest');

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Role', () => ({
  findById: jest.fn()
}));
jest.mock('../../services/facturas/pago', () => ({
  pagar: jest.fn(),
  anular: jest.fn(),
  revertir: jest.fn()
}));
jest.mock('../../modelos/sistema_base/CcIngreso', () => ({
  findAll: jest.fn()
}));
jest.mock('../../modelos/sistema_base/Egreso', () => ({
  findAll: jest.fn()
}));
jest.mock('../../modelos/sistema_base/CcEgreso', () => ({
  findAll: jest.fn()
}));

const jwt = require('jsonwebtoken');
const Role = require('../../modelos/sistema_base/Role');
const pagoService = require('../../services/facturas/pago');
const CcIngreso = require('../../modelos/sistema_base/CcIngreso');
const Egreso = require('../../modelos/sistema_base/Egreso');
const CcEgreso = require('../../modelos/sistema_base/CcEgreso');
const AppError = require('../../libs/app-error');

const routerFacturas = require('../../api/v1/facturas/routes');
const { manejadorErrores, noEncontrado } = require('../../middleware/errores');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', routerFacturas);
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

describe('API /api/v1 (facturas: ingresos/egresos/resumen)', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    configurarJwtYRol();
    app = buildApp();
  });

  describe('autenticacion/autorizacion', () => {
    it('GET /egresos sin token responde 401 TOKEN_REQUERIDO', async () => {
      const res = await request(app).get('/api/v1/egresos');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'TOKEN_REQUERIDO' } });
    });

    it('GET /egresos con rol no-Admin (RRHH) responde 403 FORBIDDEN', async () => {
      const res = await request(app).get('/api/v1/egresos').set('x-access-token', TOKEN_RRHH);
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    });

    it('PATCH /egresos/:id/pagar con rol no-Admin responde 403 sin llamar al servicio', async () => {
      const res = await request(app).patch('/api/v1/egresos/1/pagar').set('x-access-token', TOKEN_RRHH).send({ fecha_pago: '2026-03-10' });
      expect(res.status).toBe(403);
      expect(pagoService.pagar).not.toHaveBeenCalled();
    });

    it('PATCH /egresos/:id/revertir con rol no-Admin responde 403 sin llamar al servicio (solo Admin puede revertir)', async () => {
      const res = await request(app)
        .patch('/api/v1/egresos/1/revertir')
        .set('x-access-token', TOKEN_RRHH)
        .send({ motivo: 'correccion' });
      expect(res.status).toBe(403);
      expect(pagoService.revertir).not.toHaveBeenCalled();
    });

    it('PATCH /egresos/:id/revertir con rol Admin llega al servicio', async () => {
      pagoService.revertir.mockResolvedValue({ id: 1, estado_pago: 'PENDIENTE' });
      const res = await request(app)
        .patch('/api/v1/egresos/1/revertir')
        .set('x-access-token', TOKEN_ADMIN)
        .send({ motivo: 'pago duplicado' });
      expect(res.status).toBe(200);
      expect(pagoService.revertir).toHaveBeenCalledWith(
        expect.objectContaining({ entidad: 'egresos' }),
        1,
        expect.objectContaining({ motivo: 'pago duplicado', usuario: { id: 1, contexto: 'usuarios' } })
      );
    });
  });

  describe('PATCH /egresos/:id/pagar', () => {
    it('id invalido responde 400 ID_INVALIDO sin llamar al servicio', async () => {
      const res = await request(app).patch('/api/v1/egresos/abc/pagar').set('x-access-token', TOKEN_ADMIN).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'ID_INVALIDO' } });
      expect(pagoService.pagar).not.toHaveBeenCalled();
    });

    it('caso feliz responde {ok,data} con el resultado del servicio', async () => {
      pagoService.pagar.mockResolvedValue({ id: 5, estado_pago: 'PAGADA', cajaId: 42 });
      const res = await request(app).patch('/api/v1/egresos/5/pagar').set('x-access-token', TOKEN_ADMIN).send({ fecha_pago: '2026-03-10' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: { id: 5, estado_pago: 'PAGADA', cajaId: 42 } });
    });

    it('propaga MES_CERRADO del servicio como 409 (caja del mes de fecha_pago cerrada)', async () => {
      pagoService.pagar.mockRejectedValue(new AppError('MES_CERRADO', 'la caja de 2026-03 esta cerrada', 409, { periodo: '2026-03' }));
      const res = await request(app).patch('/api/v1/egresos/5/pagar').set('x-access-token', TOKEN_ADMIN).send({ fecha_pago: '2026-03-10' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'MES_CERRADO' } });
    });

    it('propaga ESTADO_PAGO_INVALIDO (pagar ya pagada/anulada) como 409', async () => {
      pagoService.pagar.mockRejectedValue(new AppError('ESTADO_PAGO_INVALIDO', 'el registro no esta PENDIENTE', 409, { id: 5 }));
      const res = await request(app).patch('/api/v1/egresos/5/pagar').set('x-access-token', TOKEN_ADMIN).send({ fecha_pago: '2026-03-10' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'ESTADO_PAGO_INVALIDO' } });
    });
  });

  describe('PATCH /egresos/:id/anular', () => {
    it('sin motivo propaga MOTIVO_REQUERIDO (400) desde el servicio', async () => {
      pagoService.anular.mockRejectedValue(new AppError('MOTIVO_REQUERIDO', 'la anulacion requiere motivo', 400));
      const res = await request(app).patch('/api/v1/egresos/5/anular').set('x-access-token', TOKEN_ADMIN).send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'MOTIVO_REQUERIDO' } });
    });

    it('caso feliz responde {ok,data} con el registro ANULADA (conserva la fila)', async () => {
      pagoService.anular.mockResolvedValue({ id: 5, estado_pago: 'ANULADA' });
      const res = await request(app).patch('/api/v1/egresos/5/anular').set('x-access-token', TOKEN_ADMIN).send({ motivo: 'documento duplicado' });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: 5, estado_pago: 'ANULADA' });
      expect(pagoService.anular).toHaveBeenCalledWith(
        expect.objectContaining({ entidad: 'egresos' }),
        5,
        expect.objectContaining({ motivo: 'documento duplicado' })
      );
    });
  });

  describe('GET /egresos (filtros estado_pago y periodo)', () => {
    it('estado_pago invalido responde 400 sin consultar el modelo', async () => {
      const res = await request(app).get('/api/v1/egresos?estado_pago=PAGADO').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'ESTADO_PAGO_INVALIDO' } });
      expect(Egreso.findAll).not.toHaveBeenCalled();
    });

    it('periodo invalido responde 400 sin consultar el modelo', async () => {
      const res = await request(app).get('/api/v1/egresos?periodo=2026-13').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'PERIODO_INVALIDO' } });
      expect(Egreso.findAll).not.toHaveBeenCalled();
    });

    it('filtra por estado_pago=PENDIENTE: pasa el where correspondiente al modelo', async () => {
      Egreso.findAll.mockResolvedValue([{ id: 1, estado_pago: 'PENDIENTE' }]);
      const res = await request(app).get('/api/v1/egresos?estado_pago=PENDIENTE').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ id: 1, estado_pago: 'PENDIENTE' }]);
      expect(Egreso.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ estado_pago: 'PENDIENTE' }) })
      );
    });

    it('filtra por periodo: agrega la condicion de fecha_emision al where', async () => {
      Egreso.findAll.mockResolvedValue([]);
      const res = await request(app).get('/api/v1/egresos?periodo=2026-03').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ periodo: '2026-03' });
      const where = Egreso.findAll.mock.calls[0][0].where;
      expect(where.fecha_emision).toBeDefined();
    });
  });

  describe('GET /ingresos (mismo cableado para cc_ingresos)', () => {
    it('caso feliz lista cc_ingresos con meta.total', async () => {
      CcIngreso.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const res = await request(app).get('/api/v1/ingresos').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, data: [{ id: 1 }, { id: 2 }], meta: { total: 2 } });
    });
  });

  describe('GET /facturas/resumen', () => {
    it('separa por_cobrar (cc_ingresos PENDIENTE) de por_pagar (egresos + cc_egresos PENDIENTE), fuera del saldo de caja', async () => {
      CcIngreso.findAll.mockResolvedValue([{ monto: 10000 }, { monto: 5000 }]);
      Egreso.findAll.mockResolvedValue([{ monto: 20000 }]);
      CcEgreso.findAll.mockResolvedValue([{ monto: 3000 }]);

      const res = await request(app).get('/api/v1/facturas/resumen').set('x-access-token', TOKEN_ADMIN);

      expect(res.status).toBe(200);
      expect(res.body.data.por_cobrar).toEqual({ cantidad: 2, monto_total: 15000 });
      expect(res.body.data.por_pagar).toEqual({ cantidad: 2, monto_total: 23000 });
      // siempre filtra por PENDIENTE: lo pagado/anulado no entra en el resumen informativo
      expect(CcIngreso.findAll.mock.calls[0][0].where).toMatchObject({ estado_pago: 'PENDIENTE' });
      expect(Egreso.findAll.mock.calls[0][0].where).toMatchObject({ estado_pago: 'PENDIENTE' });
    });

    it('sin token responde 401', async () => {
      const res = await request(app).get('/api/v1/facturas/resumen');
      expect(res.status).toBe(401);
    });
  });

  describe('ruta no encontrada bajo /api/v1', () => {
    it('metodo/ruta inexistente responde 404 NOT_FOUND', async () => {
      const res = await request(app).get('/api/v1/facturas/no-existe').set('x-access-token', TOKEN_ADMIN);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    });
  });
});
