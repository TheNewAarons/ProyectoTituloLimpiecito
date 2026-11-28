/**
 * RF-BI-05 — demanda de reservas: indicadores del período, proyección de 4 semanas y alerta de cupos.
 */
jest.mock('../../../database/database', () => ({ sequelize: { query: jest.fn(), define: jest.fn(() => new Proxy({}, { get: () => () => {} })) } }));

const { describir, proyectar, filtros } = require('../../../services/analytics/demanda');

const HOY = '2026-11-27'; // viernes
const fila = (dia, hora, extra) => Object.assign({ dia: dia, hora: hora, estado: 2, precio_total: 10000, servicio_id: 1, servicio: 'Lavado', categoria_id: 2, categoria: 'Lavado de vehiculos' }, extra);

describe('filtros', () => {
  it('por defecto los últimos 12 meses; valida período y categoría', () => {
    expect(filtros({ hasta: '2026-11' })).toEqual({ desde: '2025-12', hasta: '2026-11', categoria_id: null });
    expect(filtros({ desde: '2026-01', hasta: '2026-03', categoria_id: '2' }).categoria_id).toBe(2);
    expect(() => filtros({ hasta: '2026-13' })).toThrow();
    expect(() => filtros({ desde: '2026-05', hasta: '2026-03' })).toThrow();
    expect(() => filtros({ hasta: '2026-11', categoria_id: '1;DROP' })).toThrow();
  });
});

describe('describir', () => {
  const filas = [
    fila('2026-11-02', '09:00'), // lunes
    fila('2026-11-09', '09:00', { servicio_id: 2, servicio: 'Oficina', precio_total: 80000 }), // lunes
    fila('2026-11-03', '15:00'), // martes
    fila('2026-11-03', '15:00', { estado: 4 }), // rechazada: no cuenta como demanda
    fila('2026-10-20', '11:00') // martes, otro mes
  ];
  const d = describir(filas);

  it('mapa de calor lunes primero, por hora de inicio, sin rechazadas', () => {
    expect(d.mapa_calor.horas).toEqual(['09:00', '11:00', '15:00']);
    expect(d.mapa_calor.dias[0]).toEqual({ dia: 'Lunes', valores: [2, 0, 0] });
    expect(d.mapa_calor.dias[1]).toEqual({ dia: 'Martes', valores: [0, 1, 1] });
    expect(d.mapa_calor.dias[6].dia).toBe('Domingo');
  });

  it('ranking por reservas y luego monto; temporada por mes; resumen con tasa de rechazo', () => {
    expect(d.ranking.map((r) => [r.servicio, r.reservas, r.monto])).toEqual([['Lavado', 3, 30000], ['Oficina', 1, 80000]]);
    expect(d.temporada.map((t) => [t.periodo, t.total])).toEqual([['2026-10', 1], ['2026-11', 3]]);
    expect(d.resumen).toMatchObject({ reservas: 4, rechazadas: 1, tasa_rechazo: 20, monto: 110000, dia_pico: 'Lunes', servicio_top: 'Lavado' });
  });

  it('sin datos no falla', () => {
    expect(describir([]).resumen).toMatchObject({ reservas: 0, tasa_rechazo: 0, dia_pico: null, servicio_top: null });
  });
});

describe('proyectar', () => {
  const cupos = [0, 2, 2, 2, 2, 2, 2]; // domingo sin horario, 2 cupos el resto

  it('sin 8 semanas de historial se desactiva con mensaje', () => {
    const p = proyectar([], [], cupos, HOY, '2026-11-01');
    expect(p.disponible).toBe(false);
    expect(p.mensaje).toMatch(/8 semanas/);
    expect(proyectar([], [], cupos, HOY, null).disponible).toBe(false);
  });

  it('promedia por día de la semana sobre 8 semanas, 28 días desde mañana, en 4 semanas', () => {
    // 16 reservas en lunes durante las 8 semanas -> 2 por lunes; 4 en martes -> 0,5
    const historial = [];
    for (let i = 0; i < 16; i++) historial.push(fila('2026-11-23', '09:00'));
    for (let i = 0; i < 4; i++) historial.push(fila('2026-11-24', '09:00'));
    historial.push(fila('2026-11-23', '09:00', { estado: 4 })); // rechazada no suma
    const p = proyectar(historial, [], cupos, HOY, '2026-01-01');
    expect(p.disponible).toBe(true);
    expect(p.dias).toHaveLength(28);
    expect(p.dias[0].fecha).toBe('2026-11-28');
    const lunes = p.dias.find((x) => x.fecha === '2026-11-30');
    expect(lunes).toMatchObject({ dia: 'Lunes', proyectado: 2, capacidad: 2, ocupacion: 100, excede: false });
    expect(p.dias.find((x) => x.fecha === '2026-12-01')).toMatchObject({ dia: 'Martes', proyectado: 0.5 });
    expect(p.semanas).toHaveLength(4);
    expect(p.semanas[0]).toMatchObject({ desde: '2026-11-28', hasta: '2026-12-04', capacidad: 12 });
  });

  it('alerta cuando las agendadas o la proyección (redondeada) superan los cupos; 0,1 en un día sin horario no alerta', () => {
    const historial = [fila('2026-11-22', '09:00')]; // 1 domingo en 8 semanas -> 0,1
    const futuras = [fila('2026-12-01', '09:00'), fila('2026-12-01', '11:00'), fila('2026-12-01', '15:00', { estado: 3 }), fila('2026-12-01', '17:00', { estado: 1 })];
    const p = proyectar(historial, futuras, cupos, HOY, '2026-01-01');
    expect(p.dias.find((x) => x.fecha === '2026-11-29')).toMatchObject({ dia: 'Domingo', excede: false });
    const martes = p.dias.find((x) => x.fecha === '2026-12-01');
    expect(martes).toMatchObject({ agendadas: 3, excede: true }); // finalizada (1) no ocupa cupo
    expect(p.alertas).toEqual([expect.objectContaining({ fecha: '2026-12-01', demanda: 3, capacidad: 2 })]);
  });
});

describe('armarDia (agenda de un día)', () => {
  const { armarDia } = require('../../../services/analytics/demanda');
  const bloques = [
    { categoria_id: 2, categoria: 'Lavado', dia: 'Martes', inicio: '09:00', fin: '11:00', cant_servicios: 4 },
    { categoria_id: 2, categoria: 'Lavado', dia: 'Martes', inicio: '11:00', fin: '13:00', cant_servicios: 4 },
    { categoria_id: 2, categoria: 'Lavado', dia: 'Miercoles', inicio: '09:00', fin: '11:00', cant_servicios: 4 }
  ];
  const res = (hora, estado, extra) => Object.assign({ id: 1, orden: 10, hora: hora, hora_fin: '11:00', estado: estado, cantidad: 1, precio_total: 22000,
    metodo_pago: 'Transbank', servicio: 'Lavado completo', categoria_id: 2, categoria: 'Lavado', cliente: 'Ana', celular: '9' }, extra);

  it('ocupación por bloque del día de la semana (aprobadas + en proceso), rechazadas listadas pero sin ocupar cupo', () => {
    const d = armarDia('2026-12-01', bloques, [res('09:00', 2), res('09:00', 3, { metodo_pago: 'SIMULADO' }), res('09:00', 4)]);
    expect(d).toMatchObject({ dia: 'Martes', atiende: true, resumen: { reservas: 3, ocupan_cupo: 2, cupos: 8 } });
    expect(d.categorias[0].bloques).toEqual([
      { inicio: '09:00', fin: '11:00', cupos: 4, aprobadas: 1, en_proceso: 1, ocupados: 2, libres: 2 },
      { inicio: '11:00', fin: '13:00', cupos: 4, aprobadas: 0, en_proceso: 0, ocupados: 0, libres: 4 }
    ]);
    expect(d.reservas.map((r) => [r.estado_texto, r.origen])).toEqual([['Aprobada', 'App'], ['En proceso', 'Web (simulada)'], ['Rechazada', 'App']]);
  });

  it('día sin horario: no atiende, pero una reserva existente se muestra como fuera de horario', () => {
    const d = armarDia('2026-12-06', bloques, [res('09:00', 2)]); // domingo
    expect(d.atiende).toBe(false);
    expect(d.categorias[0].bloques[0]).toMatchObject({ inicio: '09:00', cupos: 0, ocupados: 1, fuera_de_horario: true });
  });
});
