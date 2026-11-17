/**
 * RNF-SEC-01 (AUT-006): las consultas que alimentan respuestas (listados, búsquedas y rescatar) no traen `password`;
 * la del login sí (la necesita para comparar).
 */
jest.mock('../../modelos/sistema_base/Usuario', () => ({ belongsTo: jest.fn(), findOne: jest.fn(), findAll: jest.fn() }));
jest.mock('../../modelos/sistema_base/Role', () => ({}));

const Usuario = require('../../modelos/sistema_base/Usuario');
const logica = require('../../api/apartado_base/usuario/logica');

const sinPassword = (opciones) => Boolean(opciones.attributes && opciones.attributes.exclude && opciones.attributes.exclude.includes('password'));

it('listados, búsquedas y rescatar excluyen password', async () => {
  await logica.buscarUsuarioIdDB(3);
  await logica.obtenerUsuariosActivosDB();
  await logica.obtenerUsuariosInactivosDB();
  await logica.buscarUsuariosActivosDB('a');
  await logica.buscarUsuariosInactivosDB('a');
  const llamadas = Usuario.findOne.mock.calls.concat(Usuario.findAll.mock.calls).map(([o]) => o);
  expect(llamadas).toHaveLength(5);
  llamadas.forEach((o) => expect(sinPassword(o)).toBe(true));
});

it('la consulta del login conserva password', async () => {
  Usuario.findOne.mockClear();
  await logica.buscarUsuarioCorreoTrueDB('a@b.cl');
  expect(sinPassword(Usuario.findOne.mock.calls[0][0])).toBe(false);
});
