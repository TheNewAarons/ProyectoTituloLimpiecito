/**
 * AUT-026 — rangos de fechas de trabajador y cliente.
 */
const { validar, responderSiInvalidas } = require('../../../services/validacion/fechas-rango');

const HOY = '2026-11-27';
const ok = (tipo, d) => expect(validar(tipo, d, HOY)).toBeNull();
const malo = (tipo, d, campo) => expect(validar(tipo, d, HOY)).toMatchObject({ campo: campo });

it('acepta fechas razonables, vacías y con hora (ISO del editar)', () => {
  ok('trabajador', { fecha_nacimiento: '1990-05-10', fecha_inicio_contrato: '2026-11-01T00:00:00.000Z', fecha_termino_contrato: '2027-10-31' });
  ok('trabajador', { fecha_nacimiento: null, fecha_inicio_contrato: '', fecha_termino_contrato: undefined });
  ok('cliente', { fecha_facturacion: '2026-11-05', fecha_inicio_contrato: '2025-01-01', fecha_termino_contrato: '2027-12-31' });
});

it('bordes de edad: 18 y 80 años exactos pasan; un día menos o más no', () => {
  ok('trabajador', { fecha_nacimiento: '2008-11-27' });
  ok('trabajador', { fecha_nacimiento: '1946-11-27' });
  malo('trabajador', { fecha_nacimiento: '2008-11-28' }, 'fecha_nacimiento');
  malo('trabajador', { fecha_nacimiento: '1946-11-26' }, 'fecha_nacimiento');
});

it('rechaza fechas absurdas, texto que no es fecha y término antes del inicio', () => {
  malo('trabajador', { fecha_inicio_contrato: '2050-03-10' }, 'fecha_inicio_contrato');
  malo('cliente', { fecha_facturacion: '1900-01-01' }, 'fecha_facturacion');
  malo('cliente', { fecha_termino_contrato: 'mañana' }, 'fecha_termino_contrato');
  malo('trabajador', { fecha_nacimiento: '2000-13-40' }, 'fecha_nacimiento');
  malo('cliente', { fecha_inicio_contrato: '2026-06-01', fecha_termino_contrato: '2026-05-31' }, 'fecha_termino_contrato');
});

it('responderSiInvalidas responde 400 con el formato de error de la API', () => {
  const res = { status: jest.fn(() => res), json: jest.fn() };
  expect(responderSiInvalidas(res, 'trabajador', { fecha_inicio_contrato: '2050-01-01' })).toBe(true);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json.mock.calls[0][0]).toMatchObject({ ok: false, error: { code: 'FECHA_FUERA_DE_RANGO', details: { campo: 'fecha_inicio_contrato' } } });
  expect(responderSiInvalidas({}, 'cliente', {})).toBe(false);
});
