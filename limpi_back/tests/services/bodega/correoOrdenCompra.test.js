/**
 * Tests unitarios de services/bodega/correoOrdenCompra.js (sin BD, sin SMTP real).
 * Casos: renderizado/escape HTML y creación de transporte desde env.
 */
const AppError = require('../../../libs/app-error');
const { enviarCorreoOrdenCompra, renderizarOrden, crearTransporteDesdeEnv } = require('../../../services/bodega/correoOrdenCompra');

function ordenFake(overrides) {
  return Object.assign(
    {
      id: 1,
      proveedor: { nombre: 'Proveedor Normal' },
      items: [{ producto_id: 10, cantidad: 5 }]
    },
    overrides
  );
}

describe('services/bodega/correoOrdenCompra', () => {
  const ENV_ORIGINAL = Object.assign({}, process.env);

  beforeEach(() => {
    process.env = Object.assign({}, ENV_ORIGINAL);
  });

  afterAll(() => {
    process.env = ENV_ORIGINAL;
  });

  describe('renderizarOrden', () => {
    it('escapa HTML del nombre del proveedor (no aparece <script> crudo)', () => {
      const orden = ordenFake({ proveedor: { nombre: '<script>alert(1)</script>' } });
      const { html } = renderizarOrden(orden);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('incluye numero de orden y asunto esperado', () => {
      const orden = ordenFake({ id: 42 });
      const { html, asunto } = renderizarOrden(orden);
      expect(asunto).toBe('Orden de compra #42');
      expect(html).toContain('42');
    });
  });

  describe('crearTransporteDesdeEnv', () => {
    it('lanza SMTP_NO_CONFIGURADO si faltan variables de entorno', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      expect(() => crearTransporteDesdeEnv()).toThrow(AppError);
      try {
        crearTransporteDesdeEnv();
      } catch (err) {
        expect(err.code).toBe('SMTP_NO_CONFIGURADO');
        expect(err.httpStatus).toBe(503);
      }
    });
  });

  describe('enviarCorreoOrdenCompra', () => {
    it('envia correctamente con transporte simulado', async () => {
      const transporte = { sendMail: jest.fn().mockResolvedValue({}) };
      const orden = ordenFake();
      await enviarCorreoOrdenCompra(orden, 'proveedor@test.com', transporte);
      expect(transporte.sendMail).toHaveBeenCalledTimes(1);
      const llamada = transporte.sendMail.mock.calls[0][0];
      expect(llamada.to).toBe('proveedor@test.com');
      expect(llamada.subject).toBe('Orden de compra #1');
    });

    it('lanza ENVIO_FALLIDO (502) si sendMail rechaza, sin exponer credenciales', async () => {
      process.env.SMTP_USER = 'usuario@real.com';
      process.env.SMTP_PASS = 'credencial-secreta';
      const transporte = { sendMail: jest.fn().mockRejectedValue(new Error('auth fail credencial-secreta')) };
      const orden = ordenFake();

      await expect(enviarCorreoOrdenCompra(orden, 'proveedor@test.com', transporte)).rejects.toMatchObject({
        code: 'ENVIO_FALLIDO',
        httpStatus: 502
      });
      try {
        await enviarCorreoOrdenCompra(orden, 'proveedor@test.com', transporte);
      } catch (err) {
        expect(err.message).not.toMatch(/credencial-secreta/);
      }
    });

    it('al fallar SMTP solo loguea err.code/err.responseCode, nunca message/config', async () => {
      const errorSmtp = Object.assign(new Error('auth fail credencial-secreta en host smtp.real.com'), {
        code: 'EAUTH',
        responseCode: 535,
        config: { auth: { user: 'usuario@real.com', pass: 'credencial-secreta' } }
      });
      const transporte = { sendMail: jest.fn().mockRejectedValue(errorSmtp) };
      const orden = ordenFake();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(enviarCorreoOrdenCompra(orden, 'proveedor@test.com', transporte)).rejects.toMatchObject({ code: 'ENVIO_FALLIDO' });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const detalleLogueado = errorSpy.mock.calls[0][1];
      expect(detalleLogueado).toEqual({ code: 'EAUTH', responseCode: 535 });
      expect(JSON.stringify(errorSpy.mock.calls)).not.toMatch(/credencial-secreta|smtp\.real\.com/);
      errorSpy.mockRestore();
    });
  });
});
