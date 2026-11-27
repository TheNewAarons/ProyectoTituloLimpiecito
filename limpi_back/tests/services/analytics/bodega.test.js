/**
 * RF-BI-03 — services/analytics/bodega: agregaciones puras (top, consumo, frecuencia), mes en America/Santiago
 * y validación de parámetros. Las consultas se prueban en tests/api/analytics-bodega.v1.test.js.
 */
const s = require('../../../services/analytics/bodega');

const R = { desde: '2026-09', hasta: '2026-11' };
const linea = (o) => Object.assign({
  producto_id: 1, producto: 'Cloro', cantidad_pedida: 5, cantidad_asignada: 5, solicitud_id: 1, estado: 'ENTREGADA',
  created_at: new Date('2026-10-10T15:00:00Z'), entregada_at: new Date('2026-10-12T15:00:00Z'),
  trabajador_id: null, usuario_id: null, centro_costo_id: null
}, o);

const detalles = async (fn) => { try { await fn(); } catch (e) { return { code: e.code, status: e.httpStatus }; } return null; };

describe('rango y ventana', () => {
  it('por defecto: 6 meses terminando en el mes actual; valida formato y orden', async () => {
    const r = s.rango(undefined, '2026-11');
    expect(r).toEqual({ desde: '2026-06', hasta: '2026-11' });
    expect((await detalles(() => s.rango('2026-13', '2026-11'))).code).toBe('PERIODO_INVALIDO');
    expect((await detalles(() => s.rango('2026-12', '2026-11'))).code).toBe('RANGO_INVALIDO');
  });

  it('la ventana UTC cubre el rango con 1 día de margen', () => {
    const v = s.ventanaUtc(R);
    expect(v.ini.toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(v.fin.toISOString()).toBe('2026-12-02T00:00:00.000Z');
  });
});

describe('armarTop', () => {
  it('ordena por cantidad pedida, cuenta solicitudes distintas y suma lo entregado', () => {
    const top = s.armarTop([
      linea({ solicitud_id: 1, cantidad_pedida: 5, cantidad_asignada: 5 }),
      linea({ solicitud_id: 2, cantidad_pedida: 3, cantidad_asignada: 0, estado: 'PENDIENTE', entregada_at: null }),
      linea({ producto_id: 2, producto: 'Bolsas', solicitud_id: 2, cantidad_pedida: 20, estado: 'PARCIAL', entregada_at: null })
    ], R, 10);
    expect(top).toEqual([
      { posicion: 1, producto_id: 2, producto: 'Bolsas', cantidad_pedida: 20, cantidad_entregada: 0, solicitudes: 1 },
      { posicion: 2, producto_id: 1, producto: 'Cloro', cantidad_pedida: 8, cantidad_entregada: 5, solicitudes: 2 }
    ]);
    expect(s.armarTop([linea(), linea({ producto_id: 2, cantidad_pedida: 9 })], R, 1)).toHaveLength(1);
  });

  it('el mes se asigna en Santiago: 2026-12-01 02:00 UTC todavía es noviembre', () => {
    const top = s.armarTop([linea({ created_at: new Date('2026-12-01T02:00:00Z'), entregada_at: null, estado: 'PENDIENTE' })], R, 10);
    expect(top[0].cantidad_pedida).toBe(5);
    expect(s.armarTop([linea({ created_at: new Date('2026-12-01T04:00:00Z'), entregada_at: null, estado: 'PENDIENTE' })], R, 10)).toEqual([]);
  });

  it('pedido fuera del rango pero entregado dentro: no entra al ranking (solo cuenta lo pedido)', () => {
    expect(s.armarTop([linea({ created_at: new Date('2026-08-20T15:00:00Z') })], R, 10)).toEqual([]);
  });
});

describe('armarConsumo', () => {
  const lineas = [
    linea({ solicitud_id: 1, trabajador_id: 7, t_nombre: 'Ana', t_apellido: 'Pérez', centro_costo_id: 3, numero_cc: 'CC-3', cliente: 'Hospital' }),
    linea({ solicitud_id: 2, producto_id: 2, cantidad_asignada: 4, usuario_id: 1, u_nombre: 'Admin', u_apellido: 'Uno', centro_costo_id: 3, numero_cc: 'CC-3', cliente: 'Hospital', entregada_at: new Date('2026-11-05T15:00:00Z') }),
    linea({ solicitud_id: 3, estado: 'LISTA_ENTREGA', entregada_at: null, trabajador_id: 7 }) // aún no entregada: no es consumo
  ];

  it('por mes: todos los meses del rango, con 0 donde no hubo entregas; filtra por producto', () => {
    expect(s.armarConsumo(lineas, R, 'mes', null)).toEqual([
      { periodo: '2026-09', cantidad: 0, solicitudes: 0 },
      { periodo: '2026-10', cantidad: 5, solicitudes: 1 },
      { periodo: '2026-11', cantidad: 4, solicitudes: 1 }
    ]);
    expect(s.armarConsumo(lineas, R, 'mes', 2).map((f) => f.cantidad)).toEqual([0, 0, 4]);
  });

  it('por supervisor: trabajador de la app o usuario web marcado "(web)"', () => {
    expect(s.armarConsumo(lineas, R, 'supervisor', null)).toEqual([
      { id: 7, tipo: 'TRABAJADOR', etiqueta: 'Ana Pérez', cantidad: 5, solicitudes: 1, productos: 1 },
      { id: 1, tipo: 'USUARIO', etiqueta: 'Admin Uno (web)', cantidad: 4, solicitudes: 1, productos: 1 }
    ]);
  });

  it('por centro de costo: número de CC y cliente', () => {
    expect(s.armarConsumo(lineas, R, 'centro_costo', null)).toEqual([
      { id: 3, etiqueta: 'CC CC-3 · Hospital', cantidad: 9, solicitudes: 2, productos: 2 }
    ]);
  });
});

describe('armarFrecuencia', () => {
  it('órdenes distintas, cantidad total, última compra y días promedio entre compras', () => {
    const f = s.armarFrecuencia([
      { orden_id: 1, producto_id: 1, producto: 'Cloro', cantidad: 10, enviada_at: new Date('2026-09-01T15:00:00Z') },
      { orden_id: 2, producto_id: 1, producto: 'Cloro', cantidad: 5, enviada_at: new Date('2026-09-11T15:00:00Z') },
      { orden_id: 3, producto_id: 1, producto: 'Cloro', cantidad: 5, enviada_at: new Date('2026-10-01T15:00:00Z') },
      { orden_id: 3, producto_id: 2, producto: 'Bolsas', cantidad: 50, enviada_at: null, created_at: new Date('2026-10-01T15:00:00Z') }
    ], R);
    expect(f).toEqual([
      { producto_id: 1, producto: 'Cloro', ordenes: 3, cantidad: 20, ultima_compra: '2026-10-01T15:00:00.000Z', dias_promedio_entre_compras: 15 },
      { producto_id: 2, producto: 'Bolsas', ordenes: 1, cantidad: 50, ultima_compra: '2026-10-01T15:00:00.000Z', dias_promedio_entre_compras: null }
    ]);
  });
});

describe('RF-BOD-04: merma de recepciones', () => {
  const rec = (o) => Object.assign({
    producto_id: 1, producto: 'Cloro', cantidad: 9, cantidad_rechazada: 1, motivo_rechazo: 'Roto', costo_unitario: null, costo_oc: 1000,
    fecha_recepcion: new Date('2026-10-10T15:00:00Z')
  }, o);

  it('agrupa por producto: % merma, costo (real o de la OC), último motivo; incluye productos sin merma', () => {
    const a = s.armarMerma([
      rec({}),
      rec({ cantidad: 0, cantidad_rechazada: 2, motivo_rechazo: 'Vencido', costo_unitario: 1200, fecha_recepcion: new Date('2026-11-05T15:00:00Z') }),
      rec({ producto_id: 2, producto: 'Guantes', cantidad: 10, cantidad_rechazada: 0, motivo_rechazo: null }),
      rec({ fecha_recepcion: new Date('2026-07-01T15:00:00Z') }) // fuera de rango
    ], R);
    expect(a.productos).toEqual([
      { producto_id: 1, producto: 'Cloro', recibido: 9, rechazado: 3, porcentaje_merma: 25, costo_merma: 1000 + 2400, recepciones_con_rechazo: 2, ultimo_motivo: 'Vencido' },
      { producto_id: 2, producto: 'Guantes', recibido: 10, rechazado: 0, porcentaje_merma: 0, costo_merma: 0, recepciones_con_rechazo: 0, ultimo_motivo: null }
    ]);
    expect(a.por_mes).toEqual([
      { periodo: '2026-09', recibido: 0, rechazado: 0 }, { periodo: '2026-10', recibido: 19, rechazado: 1 }, { periodo: '2026-11', recibido: 0, rechazado: 2 }
    ]);
    expect(a.totales).toEqual({ recibido: 19, rechazado: 3, costo_merma: 3400, porcentaje_merma: 13.6 });
  });

  it('sin recepciones: listas vacías y 0 %', () => {
    expect(s.armarMerma([], R).totales).toEqual({ recibido: 0, rechazado: 0, costo_merma: 0, porcentaje_merma: 0 });
  });
});

describe('primer día del flujo nuevo', () => {
  it('criterio RF-BI-03: la solicitud del primer día del flujo (1 dic 00:30 Santiago) cuenta en ese mes', () => {
    const linea = {
      producto_id: 1, producto: 'Cloro', cantidad_pedida: 4, cantidad_asignada: 4, solicitud_id: 1, estado: 'ENTREGADA',
      created_at: new Date('2025-12-01T03:30:00Z'), entregada_at: new Date('2025-12-01T03:30:00Z'), trabajador_id: null, usuario_id: null, centro_costo_id: null
    };
    const r = { desde: '2025-12', hasta: '2025-12' };
    expect(s.armarTop([linea], r, 10)[0].cantidad_pedida).toBe(4);
    expect(s.armarConsumo([linea], r, 'mes', null)).toEqual([expect.objectContaining({ periodo: '2025-12', cantidad: 4 })]);
  });
});
