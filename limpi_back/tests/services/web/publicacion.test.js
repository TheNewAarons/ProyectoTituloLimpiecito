/**
 * RF-WEB-03 — tests unitarios de services/web/publicacion.js (sin BD).
 */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const AppError = require('../../../libs/app-error');
const {
  sanitizarCuerpo,
  sanitizarTitulo,
  validarPayload,
  filtroVigentes,
  esVigente,
  aPublico
} = require('../../../services/web/publicacion');

describe('sanitizarCuerpo', () => {
  it('elimina script/style/iframe junto con su contenido', () => {
    expect(sanitizarCuerpo('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>');
    expect(sanitizarCuerpo('<style>body{}</style><iframe src="x">x</iframe>hola')).toBe('hola');
  });

  it('quita estilos/atributos y conserva href con rel/target en <a>', () => {
    const r = sanitizarCuerpo('<p class="x" style="color:red">Texto</p><a href="https://x.com" class="btn" onclick="x()">link</a>');
    expect(r).toBe('<p>Texto</p><a href="https://x.com" rel="noopener noreferrer" target="_blank">link</a>');
  });

  it('descarta javascript: en href', () => {
    const r = sanitizarCuerpo('<a href="javascript:alert(1)">x</a>');
    expect(r).not.toContain('javascript:');
    expect(r).toContain('rel="noopener noreferrer"');
    expect(r).toContain('target="_blank"');
  });

  it('agrega rel/target a <a> sin href', () => {
    expect(sanitizarCuerpo('<a>link</a>')).toBe('<a rel="noopener noreferrer" target="_blank">link</a>');
  });
});

describe('sanitizarTitulo', () => {
  it('quita el HTML y recorta', () => {
    expect(sanitizarTitulo('  <b>Título</b>  ')).toBe('Título');
    expect(sanitizarTitulo(null)).toBe('');
  });
});

describe('validarPayload', () => {
  const base = { titulo: 'Título', cuerpo: '<p>Contenido</p>', fecha_publicacion: '2026-01-10T00:00:00Z' };

  it('titulo vacío o mayor a 150 da error por campo', () => {
    const vacio = (() => { try { validarPayload(Object.assign({}, base, { titulo: '   ' }), {}); } catch (e) { return e; } })();
    expect(vacio).toBeInstanceOf(AppError);
    expect(vacio.details.titulo).toBeDefined();

    const largo = (() => { try { validarPayload(Object.assign({}, base, { titulo: 'a'.repeat(151) }), {}); } catch (e) { return e; } })();
    expect(largo.details.titulo).toBeDefined();
  });

  it('cuerpo vacío tras sanitizar da error', () => {
    const e = (() => { try { validarPayload(Object.assign({}, base, { cuerpo: '<script>x</script>' }), {}); } catch (err) { return err; } })();
    expect(e).toBeInstanceOf(AppError);
    expect(e.details.cuerpo).toBeDefined();
  });

  it('cuerpo con solo etiquetas vacías (<p></p>) cuenta como vacío', () => {
    const e = (() => { try { validarPayload(Object.assign({}, base, { cuerpo: '<p></p><br>' }), {}); } catch (err) { return err; } })();
    expect(e.details.cuerpo).toBeDefined();
  });

  it('fecha_expiracion igual o anterior a fecha_publicacion da error', () => {
    const e = (() => { try { validarPayload(Object.assign({}, base, { fecha_expiracion: '2026-01-10T00:00:00Z' }), {}); } catch (err) { return err; } })();
    expect(e.details.fecha_expiracion).toBeDefined();
  });

  it('edición parcial compara contra el valor existente', () => {
    const existente = { fecha_publicacion: new Date('2026-01-10T00:00:00Z') };

    const anterior = (() => { try { validarPayload({ fecha_expiracion: '2026-01-05T00:00:00Z' }, { parcial: true, existente: existente }); } catch (err) { return err; } })();
    expect(anterior.details.fecha_expiracion).toBeDefined();

    const ok = validarPayload({ fecha_expiracion: '2026-01-15T00:00:00Z' }, { parcial: true, existente: existente });
    expect(ok.fecha_expiracion).toEqual(new Date('2026-01-15T00:00:00Z'));
  });

  it('mover solo fecha_publicacion más allá de la expiración guardada da error', () => {
    const existente = { fecha_publicacion: new Date('2026-01-10T00:00:00Z'), fecha_expiracion: new Date('2026-01-20T00:00:00Z') };
    expect(() => validarPayload({ fecha_publicacion: '2026-01-25T00:00:00Z' }, { parcial: true, existente: existente })).toThrow();
    expect(validarPayload({ fecha_publicacion: '2026-01-15T00:00:00Z' }, { parcial: true, existente: existente }).fecha_publicacion)
      .toEqual(new Date('2026-01-15T00:00:00Z'));
  });

  it('publicado acepta "true"/"false" y rechaza otros valores', () => {
    expect(validarPayload({ publicado: 'true' }, { parcial: true, existente: { fecha_publicacion: new Date('2026-01-01T00:00:00Z') } }).publicado).toBe(true);
    expect(validarPayload({ publicado: 'false' }, { parcial: true, existente: { fecha_publicacion: new Date('2026-01-01T00:00:00Z') } }).publicado).toBe(false);

    const mal = (() => { try { validarPayload({ publicado: 'si' }, { parcial: true, existente: { fecha_publicacion: new Date('2026-01-01T00:00:00Z') } }); } catch (err) { return err; } })();
    expect(mal.details.publicado).toBeDefined();
  });

  it('al crear publicado default false', () => {
    const ok = validarPayload(base, {});
    expect(ok.publicado).toBe(false);
  });

  it('fecha_expiracion null o "" se guarda como null', () => {
    expect(validarPayload(Object.assign({}, base, { fecha_expiracion: null }), {}).fecha_expiracion).toBeNull();
    expect(validarPayload(Object.assign({}, base, { fecha_expiracion: '' }), {}).fecha_expiracion).toBeNull();
  });
});

describe('filtroVigentes / esVigente', () => {
  const ahora = new Date('2026-01-15T00:00:00Z');

  it('arma el where de Sequelize con publicado, fechas y expiración nula o futura', () => {
    const w = filtroVigentes(ahora);
    expect(w.publicado).toBe(true);
    expect(w.fecha_publicacion).toEqual({ [Op.lte]: ahora });
    expect(w[Op.or]).toEqual([
      { fecha_expiracion: null },
      { fecha_expiracion: { [Op.gt]: ahora } }
    ]);
  });

  it('esVigente aplica la misma regla en JS', () => {
    expect(esVigente({ publicado: true, fecha_publicacion: new Date('2026-01-01T00:00:00Z'), fecha_expiracion: null }, ahora)).toBe(true);
    expect(esVigente({ publicado: true, fecha_publicacion: new Date('2026-01-01T00:00:00Z'), fecha_expiracion: new Date('2026-02-01T00:00:00Z') }, ahora)).toBe(true);
    expect(esVigente({ publicado: true, fecha_publicacion: new Date('2026-01-20T00:00:00Z'), fecha_expiracion: null }, ahora)).toBe(false);
    expect(esVigente({ publicado: true, fecha_publicacion: new Date('2026-01-01T00:00:00Z'), fecha_expiracion: new Date('2026-01-10T00:00:00Z') }, ahora)).toBe(false);
    expect(esVigente({ publicado: false, fecha_publicacion: new Date('2026-01-01T00:00:00Z'), fecha_expiracion: null }, ahora)).toBe(false);
  });
});

describe('aPublico', () => {
  it('devuelve la URL de imagen con el prefijo y nunca la ruta absoluta', () => {
    process.env.PREFIJO = '/web-limpiecito';
    const p = {
      id: 1,
      titulo: 'T',
      cuerpo: '<p>c</p>',
      imagen: 'abc.jpg',
      fecha_publicacion: new Date('2026-01-01T00:00:00Z'),
      fecha_expiracion: null
    };
    expect(aPublico(p).imagen_url).toBe('/web-limpiecito/uploads_limpiecitoweb/publicaciones/abc.jpg');
    expect(aPublico(Object.assign({}, p, { imagen: null })).imagen_url).toBeNull();
  });
});

describe('hallazgos del reviewer', () => {
  const base = { titulo: 'T', cuerpo: '<p>x</p>', fecha_publicacion: '2026-01-01T00:00:00Z' };

  it('rechaza fechas sin zona explícita y acepta Z u offset', () => {
    expect(() => validarPayload(Object.assign({}, base, { fecha_publicacion: '2026-01-01' }))).toThrow(AppError);
    expect(() => validarPayload(Object.assign({}, base, { fecha_publicacion: '2026-01-01T10:00' }))).toThrow(AppError);
    expect(validarPayload(Object.assign({}, base, { fecha_publicacion: '2026-01-01T10:00:00-03:00' })).fecha_publicacion)
      .toEqual(new Date('2026-01-01T13:00:00Z'));
  });

  it('título se guarda como texto plano (sin &amp;) y el largo se mide sobre él', () => {
    expect(sanitizarTitulo('Aseo & Limpieza <b>x</b>')).toBe('Aseo & Limpieza x');
    expect(validarPayload(Object.assign({}, base, { titulo: '&'.repeat(150) })).titulo).toBe('&'.repeat(150));
  });

  it('descarta enlaces protocol-relative', () => {
    expect(sanitizarCuerpo('<a href="//evil.com">x</a>')).not.toContain('evil');
    expect(sanitizarCuerpo('<a href="\\\\evil.com">x</a>')).not.toContain('evil');
  });

  it('cuerpo bruto enorme se rechaza sin sanear', () => {
    expect(() => validarPayload(Object.assign({}, base, { cuerpo: 'a'.repeat(100001) }))).toThrow(AppError);
  });
});
