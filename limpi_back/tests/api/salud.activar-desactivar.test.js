/**
 * fix: /salud/eliminar/:id y /salud/activar/:id no pasaban el id y tenían el estado invertido
 * (activar dejaba estado 0). Convención del módulo: activo = 1, inactivo = 0.
 */
jest.mock('../../modelos/sistema_base/Salude', () => ({ update: jest.fn() }));

const Salude = require('../../modelos/sistema_base/Salude');
const controlador = require('../../api/apartado_base/salud/controlador');

function res() {
  return { json: jest.fn(), send: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  Salude.update.mockResolvedValue([1]);
});

it('desactivar deja estado 0 solo en el id de la ruta', async () => {
  const r = res();
  await controlador.desactivarSalud({ params: { id: '3' } }, r);
  expect(Salude.update).toHaveBeenCalledWith({ estado: 0 }, { where: { id: '3' } });
  expect(r.json).toHaveBeenCalledWith({ filas: [1] });
});

it('activar deja estado 1 solo en el id de la ruta', async () => {
  const r = res();
  await controlador.activarSalud({ params: { id: '3' } }, r);
  expect(Salude.update).toHaveBeenCalledWith({ estado: 1 }, { where: { id: '3' } });
  expect(r.json).toHaveBeenCalledWith({ filas: [1] });
});
