/**
 * RF-BI-02 — Tests de services/analytics/rentabilidad.js: armarRentabilidad (pura), rentabilidad y detalle
 * con db.sequelize.query y financiero.tendencia mockeados (consultas distinguidas por nombre de vista).
 * fecha.hoySantiago fijada a 2026-11-20 (mes actual 2026-11).
 * Sin test de integración MySQL: no existe el patrón TEST_MYSQL_LOCAL en limpi_back/tests.
 */
const fecha = require('../../../libs/fecha');
const db = require('../../../database/database');
const financiero = require('../../../services/analytics/financiero');
const rent = require('../../../services/analytics/rentabilidad');

beforeEach(() => {
  jest.spyOn(fecha, 'hoySantiago').mockReturnValue('2026-11-20');
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---- Escenario base: cliente 1 (CC 10 y 11), cliente 2 en pérdida (CC 20), CC 30 sin cliente ----
function c(centro, cliente, extra) {
  return Object.assign({
    centro_costo_id: centro, cliente_id: cliente, cliente: cliente === null ? null : 'Cliente ' + cliente, numero_cc: 'N' + centro
  }, extra);
}

function escenario(egresosSinCentro, utilidadTotal) {
  return {
    ingresos: [
      c(10, 1, { ingreso_real: '1000', ingreso_estimado: 0 }),
      c(11, 1, { ingreso_real: 500, ingreso_estimado: 0 }),
      c(20, 2, { ingreso_real: 800, ingreso_estimado: 0 })
    ],
    costos: [
      c(10, 1, { tipo: 'SUELDO', monto: 300 }),
      c(10, 1, { tipo: 'BODEGA', monto: '100' }),
      c(11, 1, { tipo: 'OTRO', monto: 50 }),
      c(20, 2, { tipo: 'SUELDO', monto: 900 }),
      c(30, null, { tipo: 'OTRO', monto: 20 })
    ],
    facturado: [c(10, 1, { ingreso_facturado: 1200 })],
    egresosSinCentro: egresosSinCentro,
    utilidadTotal: utilidadTotal
  };
}
// Σ margen = (1500 − 450) + (800 − 900) + (0 − 20) = 930; bodega = 100

const clientes = (res) => res.filas.filter((f) => f.tipo === 'CLIENTE');
const gg = (res) => res.filas[res.filas.length - 1];

describe('armarRentabilidad — cuadratura', () => {
  it('Σ margen − gastos generales = utilidad total, con bodega reasignada', () => {
    // gastos generales = 400 − 100 = 300; utilidad = 930 − 300 = 630
    const res = rent.armarRentabilidad(escenario(400, 630));
    expect(res.totales.suma_margenes).toBe(930);
    expect(res.totales.gastos_generales).toBe(300);
    expect(res.totales.suma_margenes - res.totales.gastos_generales).toBe(res.utilidad_total);
    expect(res.diferencia_conciliacion).toBe(0);
    expect(res.cuadra).toBe(true);
    expect(gg(res)).toMatchObject({ tipo: 'GASTOS_GENERALES', posicion: null, egresos_sin_centro: 400, consumo_bodega_reasignado: 100, gastos_generales: 300 });
  });

  it('gastos generales negativos cuando la bodega reasignada supera los egresos sin centro', () => {
    // 60 − 100 = −40; utilidad = 930 + 40 = 970
    const res = rent.armarRentabilidad(escenario(60, 970));
    expect(res.totales.gastos_generales).toBe(-40);
    expect(res.cuadra).toBe(true);
    expect(res.diferencia_conciliacion).toBe(0);
  });

  it('desajuste: cuadra false y la diferencia no se mete en gastos generales', () => {
    const res = rent.armarRentabilidad(escenario(400, 700));
    expect(res.cuadra).toBe(false);
    expect(res.diferencia_conciliacion).toBe(70);
    expect(res.totales.gastos_generales).toBe(300);
    expect(gg(res).gastos_generales).toBe(300);
  });
});

describe('armarRentabilidad — cliente en pérdida', () => {
  it('costos > ingresos: en_perdida, margen_pct negativo, último y contado en totales', () => {
    const res = rent.armarRentabilidad(escenario(400, 630));
    const cl = clientes(res);
    const c2 = cl.find((f) => f.cliente_id === 2);
    expect(c2).toMatchObject({ margen: -100, margen_pct: -12.5, en_perdida: true, origen_ingreso: 'CAJA' });
    expect(cl[cl.length - 1].cliente_id).toBe(2); // −100 < −20 (sin cliente)
    expect(cl.map((f) => f.posicion)).toEqual([1, 2, 3]);
    expect(res.totales.clientes_en_perdida).toBe(2); // cliente 2 y CC 30 sin cliente
  });
});

describe('armarRentabilidad — agrupación', () => {
  it('agrupa centros del mismo cliente, fila propia para centro sin cliente, GG al final', () => {
    const res = rent.armarRentabilidad(escenario(400, 630));
    const c1 = clientes(res).find((f) => f.cliente_id === 1);
    expect(c1.centros.map((x) => x.centro_costo_id)).toEqual([10, 11]);
    expect(c1).toMatchObject({ ingreso_real: 1500, costo_sueldos: 300, costo_bodega: 100, costo_otros: 50, costo_total: 450, margen: 1050, margen_pct: 70, ingreso_facturado: 1200, posicion: 1 });
    const sc = clientes(res).find((f) => f.cliente_id === null);
    expect(sc.cliente).toBe('Sin cliente (CC N30)');
    expect(sc.margen_pct).toBeNull(); // ingreso real 0
    expect(sc.origen_ingreso).toBe('SIN_INGRESO');
    expect(res.filas).toHaveLength(4);
    expect(gg(res).tipo).toBe('GASTOS_GENERALES');
    expect(gg(res).posicion).toBeNull();
  });

  it('dos centros sin cliente no se agrupan entre sí; sin numero_cc usa el id', () => {
    const res = rent.armarRentabilidad({
      ingresos: [], facturado: [], egresosSinCentro: 0, utilidadTotal: -30,
      costos: [
        { centro_costo_id: 40, cliente_id: null, tipo: 'OTRO', monto: 10 },
        { centro_costo_id: 41, cliente_id: null, tipo: 'OTRO', monto: 20 }
      ]
    });
    expect(clientes(res).map((f) => f.cliente).sort()).toEqual(['Sin cliente (CC 40)', 'Sin cliente (CC 41)']);
    expect(res.cuadra).toBe(true);
  });
});

describe('armarRentabilidad — fallback etiquetado (estimado)', () => {
  function conEstimado(estimado) {
    const e = escenario(400, 630);
    e.ingresos.push(c(30, null, { ingreso_real: 0, ingreso_estimado: estimado }));
    return rent.armarRentabilidad(e);
  }

  it('centro solo con estimado: CONTRATO_ESTIMADO, real 0, estimacion true', () => {
    const sc = clientes(conEstimado(500)).find((f) => f.cliente_id === null);
    expect(sc).toMatchObject({ origen_ingreso: 'CONTRATO_ESTIMADO', ingreso_real: 0, ingreso_estimado: 500, margen: -20, margen_pct: null });
    expect(conEstimado(500).estimacion).toBe(true);
    expect(conEstimado(0).estimacion).toBe(false);
  });

  it('variar el estimado no cambia la invariante', () => {
    const a = conEstimado(500);
    const b = conEstimado(99999);
    [a, b].forEach((r) => {
      expect(r.totales.suma_margenes).toBe(930);
      expect(r.diferencia_conciliacion).toBe(0);
      expect(r.cuadra).toBe(true);
    });
  });

  it('estimado evita que un cliente sin ingreso real aparezca en pérdida (D-172)', () => {
    const sc = clientes(conEstimado(500)).find((f) => f.cliente_id === null);
    expect(sc.margen_con_estimado).toBe(480);
    expect(sc.en_perdida).toBe(false);
    expect(conEstimado(500).totales.clientes_en_perdida).toBe(1);
  });

  it('MIXTO cuando hay real y estimado; OTRO_ESTIMADO va a egreso_estimado, fuera del margen', () => {
    const res = rent.armarRentabilidad({
      ingresos: [c(50, 5, { ingreso_real: 100, ingreso_estimado: 50 })],
      costos: [c(50, 5, { tipo: 'OTRO_ESTIMADO', monto: 30 }), c(50, 5, { tipo: 'DESCONOCIDO', monto: 999 })],
      facturado: [], egresosSinCentro: 0, utilidadTotal: 100
    });
    expect(clientes(res)[0]).toMatchObject({ origen_ingreso: 'MIXTO', margen: 100, egreso_estimado: 30, margen_con_estimado: 120 });
    expect(res.cuadra).toBe(true);
  });
});

// ---- Mocks de BD ----
function mockVistas(datos) {
  return jest.spyOn(db.sequelize, 'query').mockImplementation((sql) => {
    if (sql.indexOf('v_bi_rent_egresos_sin_centro') >= 0) return Promise.resolve([{ monto: datos.egresosSinCentro }]);
    if (sql.indexOf('v_bi_rent_ingresos') >= 0) return Promise.resolve(datos.ingresos);
    if (sql.indexOf('v_bi_rent_costos') >= 0) return Promise.resolve(datos.costos);
    if (sql.indexOf('v_bi_rent_facturado') >= 0) return Promise.resolve(datos.facturado);
    if (sql.indexOf('FROM centro_costos cc JOIN cajas') >= 0) return Promise.resolve(datos.centro || []);
    return Promise.reject(new Error('consulta inesperada: ' + sql));
  });
}

describe('rentabilidad(desde, hasta)', () => {
  it('cuadra con utilidad total = Σ tendencia.utilidad y pasa el rango a las consultas', async () => {
    const q = mockVistas(escenario('400', null));
    const tend = jest.spyOn(financiero, 'tendencia').mockResolvedValue([
      { periodo: '2026-10', utilidad: 400 }, { periodo: '2026-11', utilidad: 230 }
    ]);
    const r = await rent.rentabilidad('2026-10', '2026-11');
    expect(tend).toHaveBeenCalledWith('2026-10', '2026-11');
    expect(q).toHaveBeenCalledTimes(4);
    q.mock.calls.forEach((call) => expect(call[1].replacements).toEqual({ desde: '2026-10', hasta: '2026-11' }));
    expect(r.meta).toMatchObject({ desde: '2026-10', hasta: '2026-11', periodos: 2, utilidad_total: 630, diferencia_conciliacion: 0, cuadra: true, estimacion: false });
    expect(r.meta.totales.gastos_generales).toBe(300);
    expect(r.data[r.data.length - 1].tipo).toBe('GASTOS_GENERALES');
  });

  it('gastos generales negativos también cuadran vía servicio', async () => {
    mockVistas(escenario(60, null));
    jest.spyOn(financiero, 'tendencia').mockResolvedValue([{ periodo: '2026-11', utilidad: 970 }]);
    const r = await rent.rentabilidad('2026-11', '2026-11');
    expect(r.meta.totales.gastos_generales).toBe(-40);
    expect(r.meta.cuadra).toBe(true);
  });

  it('rango inválido rechaza sin consultar', async () => {
    const q = mockVistas(escenario(0, null));
    await expect(rent.rentabilidad('2026-11', '2026-01')).rejects.toMatchObject({ code: 'RANGO_INVALIDO' });
    expect(q).not.toHaveBeenCalled();
  });
});

describe('detalle(centroCostoId)', () => {
  const centro = { id: 10, numero_cc: 'N10', estado: 'ABIERTO', cliente_id: 1, cliente: 'Cliente 1', periodo: '2026-05' };

  it('404 CENTRO_NO_EXISTE', async () => {
    mockVistas({ centro: [] });
    await expect(rent.detalle(999)).rejects.toMatchObject({ code: 'CENTRO_NO_EXISTE', httpStatus: 404 });
  });

  it('desglose sueldos / epp_insumos / otros y por_periodo', async () => {
    mockVistas({
      centro: [centro],
      ingresos: [{ ingreso_real: 1000, ingreso_estimado: 0 }, { ingreso_real: '200', ingreso_estimado: 0 }],
      facturado: [{ ingreso_facturado: 1500 }],
      costos: [
        { periodo: '2026-05', tipo: 'SUELDO', monto: 300 },
        { periodo: '2026-05', tipo: 'BODEGA', monto: 100 },
        { periodo: '2026-06', tipo: 'SUELDO', monto: 200 },
        { periodo: '2026-06', tipo: 'OTRO', monto: 50 },
        { periodo: '2026-06', tipo: 'OTRO_ESTIMADO', monto: 40 }
      ]
    });
    const r = await rent.detalle(10, '2026-05', '2026-06');
    expect(r.meta).toEqual({ desde: '2026-05', hasta: '2026-06' });
    expect(r.data.ingreso).toEqual({ real: 1200, estimado: 0, facturado: 1500, origen_ingreso: 'CAJA' });
    expect(r.data.costos).toEqual({ sueldos: 500, epp_insumos: 100, otros: 50, otros_estimado: 40 });
    expect(r.data).toMatchObject({ costo_total: 650, margen: 550, margen_pct: 45.8, margen_con_estimado: 510, en_perdida: false });
    expect(r.data.por_periodo).toEqual([
      { periodo: '2026-05', sueldos: 300, epp_insumos: 100, otros: 0, otros_estimado: 0 },
      { periodo: '2026-06', sueldos: 200, epp_insumos: 0, otros: 50, otros_estimado: 40 }
    ]);
  });

  it('rango por defecto = período del centro .. mes actual', async () => {
    const q = mockVistas({ centro: [centro], ingresos: [], costos: [], facturado: [] });
    const r = await rent.detalle(10);
    expect(r.meta).toEqual({ desde: '2026-05', hasta: '2026-11' });
    expect(q.mock.calls[1][1].replacements).toEqual({ id: 10, desde: '2026-05', hasta: '2026-11' });
  });

  it('rango por defecto con tope de 36 meses', async () => {
    mockVistas({ centro: [Object.assign({}, centro, { periodo: '2023-01' })], ingresos: [], costos: [], facturado: [] });
    const r = await rent.detalle(10);
    expect(r.meta).toEqual({ desde: '2023-12', hasta: '2026-11' });
  });
});
