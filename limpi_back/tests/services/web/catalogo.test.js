/**
 * RF-WEB-01 — Lógica pura del catálogo: validación y proyecciones.
 */
const { validarPayload, validarOrden, aPublico, aAdmin } = require('../../../services/web/catalogo');

const errores = (fn) => { try { fn(); } catch (e) { return e.details; } return null; };

describe('validarPayload', () => {
  it('crear: nombre obligatorio y publicado nace en false', () => {
    expect(validarPayload({ nombre: 'Servicio' })).toEqual({ nombre: 'Servicio', publicado: false });
    expect(errores(() => validarPayload({}))).toHaveProperty('nombre');
  });

  it('quita HTML de todos los textos y deja null los vacíos', () => {
    expect(validarPayload({ nombre: '<i>A</i> & B', descripcion: '<img src=x onerror=alert(1)>Texto', categoria: '' }))
      .toEqual({ nombre: 'A & B', descripcion: 'Texto', categoria: null, publicado: false });
  });

  it('los símbolos < > " quedan como texto (no como &lt; &gt;) y una etiqueta codificada se rechaza', () => {
    expect(validarPayload({ nombre: 'Descuento > 10% & "promo"', descripcion: 'a < b' }))
      .toEqual({ nombre: 'Descuento > 10% & "promo"', descripcion: 'a < b', publicado: false });
    expect(errores(() => validarPayload({ nombre: '&lt;script&gt;alert(1)&lt;/script&gt;' }))).toHaveProperty('nombre');
    expect(errores(() => validarPayload({ descripcion: '&lt;img src=x onerror=alert(1)&gt;' }, { parcial: true }))).toHaveProperty('descripcion');
    expect(errores(() => validarPayload({ nombre: 'x'.repeat(5000) }))).toEqual({ nombre: 'nombre supera 150 caracteres' });
  });

  it('precio: entero >= 0, acepta texto numérico y vacío = sin precio', () => {
    expect(validarPayload({ precio: '15000' }, { parcial: true })).toEqual({ precio: 15000 });
    expect(validarPayload({ precio: 0 }, { parcial: true })).toEqual({ precio: 0 });
    expect(validarPayload({ precio: '' }, { parcial: true })).toEqual({ precio: null });
    ['1.5', '-1', 'abc', '100000000000000'].forEach((p) => expect(errores(() => validarPayload({ precio: p }, { parcial: true }))).toHaveProperty('precio'));
  });

  it('largos máximos y booleanos', () => {
    expect(errores(() => validarPayload({ nombre: 'x'.repeat(151) }))).toHaveProperty('nombre');
    expect(errores(() => validarPayload({ categoria: 'x'.repeat(81) }, { parcial: true }))).toHaveProperty('categoria');
    expect(validarPayload({ publicado: 'true', orden: '4' }, { parcial: true })).toEqual({ publicado: true, orden: 4 });
    expect(errores(() => validarPayload({ publicado: 'si', orden: -1 }, { parcial: true }))).toEqual(expect.objectContaining({ publicado: expect.any(String), orden: expect.any(String) }));
  });

  it('edición parcial: solo lo que viene', () => {
    expect(validarPayload({ categoria: 'Hogar' }, { parcial: true })).toEqual({ categoria: 'Hogar' });
  });
});

it('validarOrden: lista de ids enteros sin repetidos', () => {
  expect(validarOrden({ ids: [3, '1', 2] })).toEqual([3, 1, 2]);
  [undefined, { ids: [] }, { ids: [1, 1] }, { ids: [0] }, { ids: ['a'] }, { ids: 'x' }].forEach((b) => expect(() => validarOrden(b)).toThrow());
});

it('aPublico no expone campos internos; aAdmin suma publicado', () => {
  process.env.PREFIJO = '/web-limpiecito';
  const fila = { id: 1, nombre: 'N', descripcion: null, categoria: 'C', imagen: 'f.jpg', precio: '9990', publicado: true, orden: 2, created_at: new Date() };
  expect(aPublico(fila)).toEqual({ id: 1, nombre: 'N', descripcion: null, categoria: 'C', precio: 9990, imagen_url: '/web-limpiecito/uploads_limpiecitoweb/publicaciones/f.jpg', orden: 2 });
  expect(aAdmin(fila).publicado).toBe(true);
});
