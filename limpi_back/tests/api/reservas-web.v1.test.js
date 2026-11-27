/**
 * RF-BI-05 — rutas públicas de la web de reservas: montaje sin auth, formato de respuesta y límite propio al crear.
 */
jest.mock('../../services/reservas/web', () => ({
  catalogo: jest.fn(async () => [{ id: 1, nombre: 'Aseo de hogar', servicios: [] }]),
  disponibilidad: jest.fn(),
  crear: jest.fn(async () => ({ id: 9, orden: 1123 }))
}));

const express = require('express');
const request = require('supertest');
const AppError = require('../../libs/app-error');
const web = require('../../services/reservas/web');

function app() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/public', require('../../api/v1/public/routes'));
  // mismo formato de error que el middleware central
  a.use((err, req, res, next) => res.status(err.httpStatus || 500).json({ ok: false, error: { code: err.code || 'ERROR', message: err.message } }));
  return a;
}

describe('/api/v1/public/reservas', () => {
  beforeEach(() => jest.clearAllMocks());

  it('catálogo sin sesión responde {ok,data}', async () => {
    const r = await request(app()).get('/api/v1/public/reservas/catalogo');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, data: [{ id: 1 }] });
  });

  it('disponibilidad propaga el 400 del servicio en formato JSON', async () => {
    web.disponibilidad.mockRejectedValue(new AppError('FECHA_NO_RESERVABLE', 'Solo se puede reservar desde mañana.', 400));
    const r = await request(app()).get('/api/v1/public/reservas/disponibilidad?categoria_id=1&fecha=2026-11-27');
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, error: { code: 'FECHA_NO_RESERVABLE' } });
    expect(web.disponibilidad).toHaveBeenCalledWith({ categoria_id: '1', fecha: '2026-11-27' });
  });

  it('crear responde 201 y limita a 5 reservas cada 10 minutos por IP', async () => {
    const a = app();
    for (let i = 0; i < 5; i++) {
      const r = await request(a).post('/api/v1/public/reservas').send({ servicio_id: 1 });
      expect(r.status).toBe(201);
    }
    const sexta = await request(a).post('/api/v1/public/reservas').send({ servicio_id: 1 });
    expect(sexta.status).toBe(429);
    expect(web.crear).toHaveBeenCalledTimes(5);
  });
});
