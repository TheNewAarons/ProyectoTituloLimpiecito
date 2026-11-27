/**
 * Código por correo para reabrir un centro de costo: vigencia, un solo uso, intentos y reenvío.
 */
const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock('../../../services/correo/transporte', () => ({
  crearTransporte: () => ({ sendMail: mockSendMail }),
  smtpConfigurado: jest.fn(() => true)
}));

const { smtpConfigurado } = require('../../../services/correo/transporte');
const { emitirCodigo, consumirCodigo, _codigos } = require('../../../services/centro-costo/codigo-reapertura');

const usuario = { id: 7, correo: 'admin@limpiecito.cl' };
const centro = { id: 115, numero_cc: 42 };
const T0 = 1000000;
const MOTIVO = 'cerrado por error';
const codigoEnviado = () => mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0].html.match(/>(\d{6})</)[1];

beforeEach(() => { _codigos.clear(); mockSendMail.mockClear(); smtpConfigurado.mockReturnValue(true); });

it('envía al correo del usuario, enmascara el destino y el código correcto se consume una sola vez', async () => {
  const r = await emitirCodigo(usuario, centro, MOTIVO, T0);
  expect(r).toEqual({ correo: 'a***@limpiecito.cl', vigencia_segundos: 600 });
  expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@limpiecito.cl' }));
  const codigo = codigoEnviado();
  expect(consumirCodigo(7, 115, codigo, T0 + 1000)).toBe(MOTIVO);
  expect(() => consumirCodigo(7, 115, codigo, T0 + 2000)).toThrow(expect.objectContaining({ code: 'CODIGO_EXPIRADO' }));
});

it('código ligado al usuario y al centro', async () => {
  await emitirCodigo(usuario, centro, MOTIVO, T0);
  const codigo = codigoEnviado();
  expect(() => consumirCodigo(8, 115, codigo, T0)).toThrow(expect.objectContaining({ code: 'CODIGO_EXPIRADO' }));
  expect(() => consumirCodigo(7, 116, codigo, T0)).toThrow(expect.objectContaining({ code: 'CODIGO_EXPIRADO' }));
});

it('vence a los 10 minutos', async () => {
  await emitirCodigo(usuario, centro, MOTIVO, T0);
  expect(() => consumirCodigo(7, 115, codigoEnviado(), T0 + 10 * 60 * 1000 + 1))
    .toThrow(expect.objectContaining({ code: 'CODIGO_EXPIRADO' }));
});

it('5 intentos fallidos bloquean el código, aunque después llegue el correcto', async () => {
  await emitirCodigo(usuario, centro, MOTIVO, T0);
  const codigo = codigoEnviado();
  const malo = codigo === '000000' ? '111111' : '000000';
  for (let i = 1; i <= 4; i++) {
    expect(() => consumirCodigo(7, 115, malo, T0)).toThrow(expect.objectContaining({ code: 'CODIGO_INVALIDO' }));
  }
  expect(() => consumirCodigo(7, 115, malo, T0)).toThrow(expect.objectContaining({ code: 'CODIGO_BLOQUEADO' }));
  expect(() => consumirCodigo(7, 115, codigo, T0)).toThrow(expect.objectContaining({ code: 'CODIGO_EXPIRADO' }));
});

it('no reenvía antes de 1 minuto; sin correo o sin SMTP no genera código', async () => {
  await emitirCodigo(usuario, centro, MOTIVO, T0);
  await expect(emitirCodigo(usuario, centro, MOTIVO, T0 + 30000)).rejects.toMatchObject({ code: 'CODIGO_RECIENTE', httpStatus: 429 });
  await expect(emitirCodigo(usuario, centro, MOTIVO, T0 + 61000)).resolves.toBeDefined();
  await expect(emitirCodigo({ id: 9, correo: null }, centro, MOTIVO, T0)).rejects.toMatchObject({ code: 'SIN_CORREO' });
  smtpConfigurado.mockReturnValue(false);
  await expect(emitirCodigo({ id: 10, correo: 'x@y.cl' }, centro, MOTIVO, T0)).rejects.toMatchObject({ code: 'CORREO_NO_CONFIGURADO' });
});

it('correo con logo inline, N° de CC y motivo escapado (sin inyección de HTML)', async () => {
  await emitirCodigo(usuario, centro, '<script>x</script> faltó costo', T0);
  const correo = mockSendMail.mock.calls[0][0];
  expect(correo.attachments).toEqual([expect.objectContaining({ cid: 'logo-limpiecito' })]);
  expect(correo.html).toContain('cid:logo-limpiecito');
  expect(correo.html).toContain('N° 42');
  expect(correo.html).toContain('&lt;script&gt;x&lt;/script&gt; faltó costo');
  expect(correo.html).not.toContain('<script>');
});

it('si el correo falla no queda código guardado', async () => {
  mockSendMail.mockRejectedValueOnce(new Error('smtp caído'));
  await expect(emitirCodigo(usuario, centro, MOTIVO, T0)).rejects.toThrow('smtp caído');
  expect(_codigos.size).toBe(0);
});
