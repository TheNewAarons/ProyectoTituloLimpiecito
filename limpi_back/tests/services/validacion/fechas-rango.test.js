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

describe('validarCambios (editar): solo se valida lo que cambió', () => {
  const { validarCambios } = require('../../../services/validacion/fechas-rango');
  const guardada = {
    fecha_nacimiento: new Date('1990-05-10T00:00:00Z'),
    fecha_inicio_contrato: new Date('2020-01-01T09:00:00Z'),
    fecha_termino_contrato: new Date('2099-12-31T09:00:00Z') // "indefinido" puesto a mano
  };

  it('una ficha antigua fuera de rango se puede editar si no se toca esa fecha (llega ISO con hora)', () => {
    expect(validarCambios('trabajador', {
      fecha_nacimiento: '1990-05-10T00:00:00.000Z', fecha_inicio_contrato: '2020-01-01', fecha_termino_contrato: '2099-12-31T09:00:00.000Z'
    }, guardada, HOY)).toBeNull();
  });

  it('si se cambia una fecha, esa sí se valida', () => {
    expect(validarCambios('trabajador', {
      fecha_nacimiento: '2015-01-01', fecha_inicio_contrato: '2020-01-01', fecha_termino_contrato: '2099-12-31'
    }, guardada, HOY)).toMatchObject({ campo: 'fecha_nacimiento' });
  });

  it('cambiar el inicio a después del término guardado se rechaza', () => {
    const g = Object.assign({}, guardada, { fecha_termino_contrato: new Date('2026-06-30T09:00:00Z') });
    expect(validarCambios('trabajador', {
      fecha_nacimiento: '1990-05-10', fecha_inicio_contrato: '2026-07-01', fecha_termino_contrato: '2026-06-30'
    }, g, HOY)).toMatchObject({ campo: 'fecha_termino_contrato' });
  });

  it('sin la fila guardada valida todo', () => {
    expect(validarCambios('cliente', { fecha_facturacion: '1900-01-01' }, null, HOY)).toMatchObject({ campo: 'fecha_facturacion' });
  });
});
