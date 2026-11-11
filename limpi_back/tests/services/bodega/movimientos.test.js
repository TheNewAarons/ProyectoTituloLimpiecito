/**
 * RF-BOD-04 — Límites de día en America/Santiago para el filtro de movimientos (incluye cambios de horario).
 */
jest.mock('../../../modelos/sistema_bodega/Movimiento_bodega', () => ({}));
jest.mock('../../../modelos/sistema_base/Producto', () => ({}));

const { inicioDiaSantiago } = require('../../../services/bodega/movimientos');

const fechaSantiago = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));

describe('inicioDiaSantiago', () => {
  it.each([
    ['2026-11-10', '2026-11-10T03:00:00.000Z'], // verano (UTC-3)
    ['2026-07-10', '2026-07-10T04:00:00.000Z'], // invierno (UTC-4)
    ['2026-09-06', '2026-09-06T04:00:00.000Z'], // empieza el verano: 00:00 no existe, el día parte a las 01:00 (UTC-3)
    ['2026-04-05', '2026-04-05T04:00:00.000Z'] // termina el verano: el día parte a las 00:00 en UTC-4
  ])('%s parte en %s', (fecha, esperado) => {
    expect(inicioDiaSantiago(fecha).toISOString()).toBe(esperado);
  });

  it.each(['2026-09-05', '2026-09-06', '2026-09-07', '2026-04-04', '2026-04-05', '2026-01-01', '2026-12-31'])(
    '%s: el instante cae en ese día y 1 ms antes cae en el día anterior', (fecha) => {
      const ms = inicioDiaSantiago(fecha).getTime();
      expect(fechaSantiago(ms)).toBe(fecha);
      expect(fechaSantiago(ms - 1) < fecha).toBe(true);
    });

  it('el fin de un día (diasExtra = 1) es el inicio del siguiente', () => {
    expect(inicioDiaSantiago('2026-09-05', 1).toISOString()).toBe(inicioDiaSantiago('2026-09-06').toISOString());
  });
});
