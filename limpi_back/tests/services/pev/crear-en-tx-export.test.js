/**
 * RF-PEV-01 (AUT-008): la asignación masiva depende de que services/pev exporte las versiones con transacción externa.
 * Si alguien las quita, POST /api/v1/pev/asignaciones-masivas vuelve a responder 503 sin aviso.
 */
const actividades = require('../../../services/pev/actividades');
const asignaciones = require('../../../services/pev/asignaciones');

it('actividades y asignaciones exportan crearEnTx (t, ...) junto a crear()', () => {
  expect(typeof actividades.crearEnTx).toBe('function');
  expect(typeof asignaciones.crearEnTx).toBe('function');
  expect(typeof asignaciones.crear).toBe('function');
  expect(asignaciones.crearEnTx.length).toBe(3); // (t, entrada, contexto)
});
