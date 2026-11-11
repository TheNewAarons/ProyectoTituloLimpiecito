/**
 * RF-FAC-01 — Tests del router legacy routes/sistema_base/Egreso.js (crear y eliminar).
 * Patron suupertest igual a tests/api/facturas.v1.test.js: se monta el router sobre un express()
 * con express.json() y se mockean los modelos (el router llama Egreso.belongsTo al cargarse).
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../modelos/sistema_base/Caja', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({}));
jest.mock('../../modelos/sistema_base/Egreso', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  destroy: jest.fn(),
  belongsTo: jest.fn()
}));

const Caja = require('../../modelos/sistema_base/Caja');
const Egreso = require('../../modelos/sistema_base/Egreso');

const router = require('../../routes/sistema_base/Egreso');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

describe('routes/sistema_base/Egreso', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    Egreso.create.mockResolvedValue({ id: 1 });
    Egreso.destroy.mockResolvedValue(1);
  });

  describe('POST /crear', () => {
    it('payload viejo sin campos nuevos: estado_pago PAGADA y fecha_pago derivada de fecha', async () => {
      const egreso = {
        monto: 1000,
        comentario: 'compra insumos',
        fecha: '2026-01-15 10:30:00',
        tipo: 1,
        estado: 1,
        usuarioId: 5,
        cajaId: 1
      };
      const res = await request(app).post('/crear').send({ egreso: JSON.stringify(egreso) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ mensaje: 'Listo' });
      const data = Egreso.create.mock.calls[0][0];
      expect(data.estado_pago).toBe('PAGADA');
      expect(data.fecha_pago).toBe('2026-01-15');
      expect(data.tipo_documento).toBeNull();
    });

    it('tipo_documento FACTURA y estado_pago PENDIENTE: fecha_pago queda null', async () => {
      const egreso = {
        monto: 1000,
        comentario: 'factura pendiente',
        fecha: '2026-01-15 10:30:00',
        tipo: 1,
        estado: 1,
        usuarioId: 5,
        cajaId: 1,
        tipo_documento: 'FACTURA',
        numero_documento: 'F-100',
        estado_pago: 'PENDIENTE',
        fecha_emision: '2026-01-01',
        fecha_vencimiento: '2026-02-01'
      };
      const res = await request(app).post('/crear').send({ egreso: JSON.stringify(egreso) });
      expect(res.status).toBe(200);
      const data = Egreso.create.mock.calls[0][0];
      expect(data.estado_pago).toBe('PENDIENTE');
      expect(data.fecha_pago).toBeNull();
      expect(data.tipo_documento).toBe('FACTURA');
    });

    it('tipo_documento invalido responde 400 sin crear el egreso', async () => {
      const egreso = { monto: 1000, tipo: 1, estado: 1, usuarioId: 5, cajaId: 1, tipo_documento: 'NOTA_CREDITO' };
      const res = await request(app).post('/crear').send({ egreso: JSON.stringify(egreso) });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ mensaje: 'tipo_documento invalido' });
      expect(Egreso.create).not.toHaveBeenCalled();
    });

    it('estado_pago ANULADA en creacion responde 400 sin crear el egreso', async () => {
      const egreso = { monto: 1000, tipo: 1, estado: 1, usuarioId: 5, cajaId: 1, estado_pago: 'ANULADA' };
      const res = await request(app).post('/crear').send({ egreso: JSON.stringify(egreso) });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ mensaje: 'estado_pago invalido' });
      expect(Egreso.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /eliminar/:id', () => {
    it('egreso inexistente responde 404 sin destruir', async () => {
      Egreso.findById.mockResolvedValue(null);
      const res = await request(app).delete('/eliminar/1');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ mensaje: 'Egreso no encontrado' });
      expect(Egreso.destroy).not.toHaveBeenCalled();
    });

    it('egreso con tipo_documento responde 409 sin destruir', async () => {
      Egreso.findById.mockResolvedValue({ id: 1, tipo_documento: 'FACTURA', estado_pago: 'PAGADA', cajaId: 1 });
      const res = await request(app).delete('/eliminar/1');
      expect(res.status).toBe(409);
      expect(Egreso.destroy).not.toHaveBeenCalled();
    });

    it('egreso PENDIENTE responde 409 sin destruir', async () => {
      Egreso.findById.mockResolvedValue({ id: 1, tipo_documento: null, estado_pago: 'PENDIENTE', cajaId: 1 });
      const res = await request(app).delete('/eliminar/1');
      expect(res.status).toBe(409);
      expect(Egreso.destroy).not.toHaveBeenCalled();
    });

    it('egreso PAGADA sin documento y caja ABIERTA: se destruye', async () => {
      Egreso.findById.mockResolvedValue({ id: 1, tipo_documento: null, estado_pago: 'PAGADA', cajaId: 1 });
      Caja.findById.mockResolvedValue({ id: 1, estado: 1, periodo: '2026-01' });
      const res = await request(app).delete('/eliminar/1');
      expect(res.status).toBe(200);
      expect(Egreso.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('egreso de caja CERRADA responde 409 sin destruir', async () => {
      Egreso.findById.mockResolvedValue({ id: 1, tipo_documento: null, estado_pago: 'PAGADA', cajaId: 1 });
      Caja.findById.mockResolvedValue({ id: 1, estado: 0, periodo: '2025-12' });
      const res = await request(app).delete('/eliminar/1');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ mensaje: 'No se puede eliminar un egreso de una caja cerrada; usar anular' });
      expect(Egreso.destroy).not.toHaveBeenCalled();
    });
  });
});
