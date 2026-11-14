/**
 * RF-WEB-02 — tests unitarios de services/archivo/documento-publico.js (sin BD).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validarPdf, resolverRutaSegura, nombreDescarga } = require('../../services/archivo/documento-publico');

describe('nombreDescarga', () => {
  it('quita tildes y caracteres raros', () => {
    expect(nombreDescarga('Política de Privacidad')).toBe('Politica_de_Privacidad.pdf');
    expect(nombreDescarga('año/2026:reglamento')).toBe('ano_2026_reglamento.pdf');
  });

  it('no duplica el sufijo .pdf', () => {
    expect(nombreDescarga('reglamento.pdf')).toBe('reglamento.pdf');
    expect(nombreDescarga('REGLA.PDF')).toBe('REGLA.pdf');
  });

  it('título vacío usa documento', () => {
    expect(nombreDescarga('')).toBe('documento.pdf');
    expect(nombreDescarga()).toBe('documento.pdf');
  });

  it('recorta a 100 caracteres', () => {
    const r = nombreDescarga('a'.repeat(120));
    expect(r).toBe('a'.repeat(100) + '.pdf');
    expect(r.length).toBe(104);
  });

  it('quita puntos iniciales', () => {
    expect(nombreDescarga('..oculto')).toBe('oculto.pdf');
  });
});

describe('validarPdf', () => {
  let dir;
  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docpub-')); });
  afterAll(() => { fs.rmdirSync(dir, { recursive: true }); });

  it('acepta un PDF válido', async () => {
    const p = path.join(dir, 'ok.pdf');
    fs.writeFileSync(p, '%PDF-1.4\ncontenido');
    await expect(validarPdf(p)).resolves.toBeUndefined();
  });

  it('rechaza firma incorrecta', async () => {
    const p = path.join(dir, 'firma.pdf');
    fs.writeFileSync(p, 'hola-mundo');
    await expect(validarPdf(p)).rejects.toMatchObject({ code: 'ARCHIVO_NO_PDF' });
  });

  it('rechaza extensión .txt', async () => {
    const p = path.join(dir, 'texto.txt');
    fs.writeFileSync(p, '%PDF-1.4');
    await expect(validarPdf(p)).rejects.toMatchObject({ code: 'ARCHIVO_NO_PDF' });
  });

  it('rechaza archivo mayor a 10 MB', async () => {
    const p = path.join(dir, 'grande.pdf');
    fs.writeFileSync(p, '%PDF-1.4');
    fs.truncateSync(p, 10 * 1024 * 1024 + 1);
    await expect(validarPdf(p)).rejects.toMatchObject({ code: 'ARCHIVO_DEMASIADO_GRANDE' });
  });

  it('rechaza archivo inexistente', async () => {
    await expect(validarPdf(path.join(dir, 'no-existe.pdf'))).rejects.toMatchObject({ code: 'ARCHIVO_NO_ENCONTRADO' });
  });
});

describe('resolverRutaSegura', () => {
  it('permite rutas dentro de uploads (archivo existente)', () => {
    const rel = 'uploads/test-rfweb02-resolver.pdf';
    fs.writeFileSync(rel, '%PDF-1.4');
    try {
      expect(resolverRutaSegura(rel)).toBe(fs.realpathSync(rel));
    } finally {
      fs.unlinkSync(rel);
    }
  });

  it('rechaza archivo inexistente', () => {
    expect(resolverRutaSegura('uploads/no-existe-rfweb02.pdf')).toBeNull();
  });

  it('rechaza symlink dentro de uploads que apunta afuera', () => {
    const link = 'uploads/test-rfweb02-link.pdf';
    fs.symlinkSync(path.resolve('package.json'), link);
    try {
      expect(resolverRutaSegura(link)).toBeNull();
    } finally {
      fs.unlinkSync(link);
    }
  });

  it('rechaza ../ que escapa', () => {
    expect(resolverRutaSegura('../secreto.pdf')).toBeNull();
  });

  it('rechaza prefijo parecido uploads-evil', () => {
    expect(resolverRutaSegura('uploads-evil/archivo.pdf')).toBeNull();
  });

  it('rechaza vacío o no string', () => {
    expect(resolverRutaSegura('')).toBeNull();
    expect(resolverRutaSegura(null)).toBeNull();
  });
});
