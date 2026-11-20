/**
 * RF-WEB-01b — copiarImagen: copia la imagen del servicio de la app solo si está dentro de uploads/ y es una imagen real.
 */
jest.mock('../../../modelos/sist_app/Servicio', () => ({}));

const fs = require('fs');
const path = require('path');
const { copiarImagen } = require('../../../services/web/catalogo-app');

const DIR_APP = path.resolve('uploads', 'servicios');
const DIR_CATALOGO = path.resolve('uploads_limpiecitoweb', 'publicaciones');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const creados = [];
const escribir = (nombre, contenido) => {
  fs.mkdirSync(DIR_APP, { recursive: true });
  const ruta = path.join(DIR_APP, nombre);
  fs.writeFileSync(ruta, contenido);
  creados.push(ruta);
  return path.relative(process.cwd(), ruta); // como lo guarda multer-servicio (req.file.path)
};
afterAll(() => creados.forEach((r) => { try { fs.unlinkSync(r); } catch (e) { /* ya no está */ } }));

it('copia una imagen real a la carpeta del catálogo con nombre nuevo, sin tocar el original', async () => {
  const origen = escribir('test-rfweb01b.png', PNG);
  const nombre = await copiarImagen(origen);
  expect(nombre).toMatch(/^[0-9a-f-]{36}\.png$/);
  const copia = path.join(DIR_CATALOGO, nombre);
  creados.push(copia);
  expect(fs.readFileSync(copia).equals(PNG)).toBe(true);
  expect(fs.existsSync(path.resolve(origen))).toBe(true);
});

it('no copia: archivo que no es imagen, fuera de uploads/, inexistente o vacío', async () => {
  const falso = escribir('test-rfweb01b-falso.png', '<html>no soy imagen</html>');
  expect(await copiarImagen(falso)).toBe(null);
  expect(await copiarImagen('package.json')).toBe(null);
  expect(await copiarImagen('uploads/../package.json')).toBe(null);
  expect(await copiarImagen('uploads/servicios/no-existe.png')).toBe(null);
  expect(await copiarImagen(null)).toBe(null);
});
