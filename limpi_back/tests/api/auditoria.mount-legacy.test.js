/**
 * RNF-SEC-02 M1 — identificarOpcional montado solo en las rutas legacy de ESCRITURA que auditan.
 * Los controladores y el middleware se mockean: aquí solo se verifica el cableado de la ruta.
 */
jest.mock('../../middleware/auth', () => ({
  autenticar: jest.fn(() => () => {}),
  requerirRol: jest.fn(() => () => {}),
  identificarOpcional: jest.fn(() => () => {})
}));

jest.mock('../../api/apartado_base/caja/controlador', () => ({
  crearCaja: jest.fn(), editarCaja: jest.fn(), editarCierraCaja: jest.fn(),
  obtenerTodasCajasDetalle: jest.fn(), obtenerTodasCajas: jest.fn(), obtenerCajaActiva: jest.fn(),
  obtenerCajaId: jest.fn(), cerrarCaja: jest.fn()
}));
jest.mock('../../api/apartado_base/stock_rapido/controlador', () => ({
  crearStock: jest.fn(), eliminarStock: jest.fn(), obtenerTodosStock: jest.fn()
}));
jest.mock('../../api/apartado_base/detalle_centro/controlador', () => ({
  crearAsociacionCentroTrabajador: jest.fn(), eliminarAsociacionCentroTrabajador: jest.fn(),
  crearListaInsumo: jest.fn(), aprobarListaInsumo: jest.fn(), eliminarListaInsumo: jest.fn(),
  crearCCEgreso: jest.fn(), eliminarCCEgreso: jest.fn(), crearCCIngreso: jest.fn(), eliminarCCIngreso: jest.fn()
}));
jest.mock('../../api/apartado_base/liquidacion/controlador', () => ({
  crearLiquidacion: jest.fn(), editarLiquidacion: jest.fn(), cerrarLiquidacion: jest.fn(),
  obtenerLiquidacionId: jest.fn(), obtenerTodasLiquidaciones: jest.fn(), buscarLiquidaciones: jest.fn()
}));

const { identificarOpcional, autenticar } = require('../../middleware/auth');

const rutasCaja = require('../../api/apartado_base/caja/routes');
const rutasStock = require('../../api/apartado_base/stock_rapido/routes');
const rutasDetalle = require('../../api/apartado_base/detalle_centro/routes');
const rutasLiq = require('../../api/apartado_base/liquidacion/routes');

function handlers(router, metodo, path) {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[metodo]);
  return (layer && layer.route.stack.map((s) => s.handle)) || [];
}

describe('identificarOpcional montado en rutas legacy que auditan', () => {
  it('caja: todo exige token de Admin (autenticar deja el usuario para auditar) salvo obtener-activa', () => {
    const soloAdmin = [
      ['post', '/crear'],
      ['put', '/editar/:id'],
      ['put', '/editar-cierre/:id'],
      ['put', '/cerrar/:idCaja'],
      ['get', '/obtener'],
      ['get', '/obtener-cajas'],
      ['get', '/obtener-unico/:id']
    ];
    soloAdmin.forEach(([metodo, path]) => expect(handlers(rutasCaja, metodo, path)).toContain(autenticar));
    // otros roles (Centro de Costo, Egresos, Dashboard) consultan la caja activa
    expect(handlers(rutasCaja, 'get', '/obtener-activa')).not.toContain(autenticar);
  });

  it('stock_rapido: crear y eliminar lo llevan; obtener no', () => {
    expect(handlers(rutasStock, 'post', '/crear')).toContain(identificarOpcional);
    expect(handlers(rutasStock, 'delete', '/eliminar/:id')).toContain(identificarOpcional);
    expect(handlers(rutasStock, 'get', '/obtener')).not.toContain(identificarOpcional);
  });

  it('detalle_centro: rutas que auditan lo llevan; crear-asociacion no', () => {
    const con = [
      ['delete', '/eliminar-asociacion/:id'],
      ['post', '/crear-lista'],
      ['delete', '/aprobar-lista/:id/:id_usuario'],
      ['delete', '/eliminar-lista/:id'],
      ['post', '/crear-egreso'],
      ['delete', '/eliminar-egreso/:id'],
      ['post', '/crear-ingreso'],
      ['delete', '/eliminar-ingreso/:id']
    ];
    con.forEach(([metodo, path]) => expect(handlers(rutasDetalle, metodo, path)).toContain(identificarOpcional));
    expect(handlers(rutasDetalle, 'post', '/crear-asociacion')).not.toContain(identificarOpcional);
  });

  it('liquidacion: crear/editar/cerrar lo llevan; GET no', () => {
    expect(handlers(rutasLiq, 'post', '/crear/:idCentroTrabajador')).toContain(identificarOpcional);
    expect(handlers(rutasLiq, 'put', '/editar/:id')).toContain(identificarOpcional);
    expect(handlers(rutasLiq, 'delete', '/cerrar/:id')).toContain(identificarOpcional);
    expect(handlers(rutasLiq, 'get', '/obtener-todos')).not.toContain(identificarOpcional);
  });
});
