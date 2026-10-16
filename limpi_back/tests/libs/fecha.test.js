/**
 * Tests unitarios de libs/fecha.js (sin BD). TASK_PLAN §1, helper de periodo/fecha America/Santiago.
 */
const fecha = require('../../libs/fecha');

describe('libs/fecha', () => {
  describe('esPeriodoValido', () => {
    it('acepta YYYY-MM válido', () => {
      expect(fecha.esPeriodoValido('2026-10')).toBe(true);
    });
    it('rechaza mes fuera de rango', () => {
      expect(fecha.esPeriodoValido('2026-13')).toBe(false);
      expect(fecha.esPeriodoValido('2026-00')).toBe(false);
    });
    it('rechaza formatos no string o mal formados', () => {
      expect(fecha.esPeriodoValido(202610)).toBe(false);
      expect(fecha.esPeriodoValido('2026-1')).toBe(false);
      expect(fecha.esPeriodoValido(null)).toBe(false);
    });
  });

  describe('esFechaValida', () => {
    it('acepta YYYY-MM-DD válido', () => {
      expect(fecha.esFechaValida('2026-10-16')).toBe(true);
    });
    it('rechaza formato inválido', () => {
      expect(fecha.esFechaValida('16-10-2026')).toBe(false);
      expect(fecha.esFechaValida('')).toBe(false);
      expect(fecha.esFechaValida(undefined)).toBe(false);
    });
  });

  describe('periodoSantiago', () => {
    it('deriva el periodo de una fecha YYYY-MM-DD simple', () => {
      expect(fecha.periodoSantiago('2026-06-15')).toBe('2026-06');
    });

    it('en el borde de mes UTC, una medianoche UTC del día 1 corresponde al mes anterior en Santiago', () => {
      // 2026-10-01T00:00:00Z == 2026-09-30 21:00 America/Santiago (UTC-3): debe caer en el mes anterior.
      expect(fecha.periodoSantiago('2026-10-01T00:00:00.000Z')).toBe('2026-09');
    });

    it('un DATETIME de MySQL (sin T, con espacio) cerca de medianoche UTC también respeta el borde de mes Santiago', () => {
      expect(fecha.periodoSantiago('2026-10-01 02:00:00')).toBe('2026-09');
      expect(fecha.periodoSantiago('2026-10-01 04:00:00')).toBe('2026-10');
    });

    it('devuelve null para valores inválidos o null/undefined', () => {
      expect(fecha.periodoSantiago(null)).toBeNull();
      expect(fecha.periodoSantiago(undefined)).toBeNull();
      expect(fecha.periodoSantiago('no-es-fecha')).toBeNull();
    });

    it('acepta instancias Date', () => {
      expect(fecha.periodoSantiago(new Date('2026-06-15T12:00:00Z'))).toBe('2026-06');
    });
  });

  describe('hoySantiago', () => {
    it('devuelve formato YYYY-MM-DD', () => {
      expect(fecha.hoySantiago()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('compararFechas', () => {
    it('ordena lexicográficamente (equivale a cronológico en YYYY-MM-DD)', () => {
      expect(fecha.compararFechas('2026-01-01', '2026-01-02')).toBeLessThan(0);
      expect(fecha.compararFechas('2026-01-02', '2026-01-01')).toBeGreaterThan(0);
      expect(fecha.compararFechas('2026-01-01', '2026-01-01')).toBe(0);
    });
  });
});
