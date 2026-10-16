/**
 * PUT /caja/cerrar/:idCaja (legacy): exige autenticar + rol Admin en el router y el controlador
 * rechaza si falta req.usuario; cerrada_por/auditoria usan el usuario real (nunca 'sistema').
 */
jest.mock('../../api/apartado_base/caja/logica', () => ({ obtenerCajaIdDB: jest.fn() }));
jest.mock('../../services/caja', () => ({ cerrarMes: jest.fn() }));
jest.mock('../../middleware/auth', () => ({ autenticar: function autenticar() {}, requerirRol: function requerirRol() { return function rol() {}; } }));

const logicaDB = require('../../api/apartado_base/caja/logica');
const cajaService = require('../../services/caja');
const { autenticar } = require('../../middleware/auth');
const controlador = require('../../api/apartado_base/caja/controlador');
const router = require('../../api/apartado_base/caja/routes');

function resFalso() {
  const res = { status: jest.fn(() => res), json: jest.fn(() => res), send: jest.fn(() => res) };
  return res;
}

describe('legacy PUT /caja/cerrar/:idCaja', () => {
  beforeEach(() => jest.clearAllMocks());

  it('la ruta lleva autenticar antes del controlador', () => {
    const capa = router.stack.find((l) => l.route && l.route.path === '/cerrar/:idCaja');
    const handlers = capa.route.stack.map((s) => s.handle);
    expect(handlers[0]).toBe(autenticar);
    expect(handlers).toHaveLength(3);
    expect(handlers[2]).toBe(controlador.cerrarCaja);
  });

  it('sin req.usuario responde 401 y no cierra', async () => {
    const res = resFalso();
    await controlador.cerrarCaja({ params: { idCaja: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(cajaService.cerrarMes).not.toHaveBeenCalled();
  });

  it('con usuario cierra con su id real', async () => {
    logicaDB.obtenerCajaIdDB.mockResolvedValue({ periodo: '2026-10' });
    cajaService.cerrarMes.mockResolvedValue({});
    const res = resFalso();
    await controlador.cerrarCaja({ params: { idCaja: 1 }, usuario: { id: 7, contexto: 'usuarios' }, ip: 'x' }, res);
    expect(cajaService.cerrarMes).toHaveBeenCalledWith('2026-10', { usuario: { id: 7, contexto: 'usuarios' }, ip: 'x' });
    expect(res.json).toHaveBeenCalledWith({ cerrar: true, mensaje: expect.any(String) });
  });

  it('error inesperado: 500 generico sin filtrar el error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    logicaDB.obtenerCajaIdDB.mockRejectedValue(new Error('SELECT secreto'));
    const res = resFalso();
    await controlador.cerrarCaja({ params: { idCaja: 1 }, usuario: { id: 7, contexto: 'usuarios' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secreto');
    console.error.mockRestore();
  });
});
