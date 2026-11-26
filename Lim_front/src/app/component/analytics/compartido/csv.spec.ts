import { variacionMensual } from './csv';

describe('variacionMensual', () => {
  const v = (p: { periodo: string, u: number }): number => p.u;

  it('calcula % contra el mes anterior y nombra ese mes', () => {
    expect(variacionMensual([{ periodo: '2026-10', u: 100 }, { periodo: '2026-11', u: 112 }], v)).toEqual({ pct: 12, vs: 'octubre' });
  });

  it('cruza el año (enero vs diciembre)', () => {
    expect(variacionMensual([{ periodo: '2025-12', u: 200 }, { periodo: '2026-01', u: 100 }], v)).toEqual({ pct: -50, vs: 'diciembre' });
  });

  it('base negativa: menos pérdida es mejora', () => {
    expect(variacionMensual([{ periodo: '2026-10', u: -100 }, { periodo: '2026-11', u: -50 }], v).pct).toBe(50);
  });

  it('null sin base, con un solo punto o con un mes faltante', () => {
    expect(variacionMensual([{ periodo: '2026-10', u: 0 }, { periodo: '2026-11', u: 10 }], v)).toBeNull();
    expect(variacionMensual([{ periodo: '2026-11', u: 10 }], v)).toBeNull();
    expect(variacionMensual([{ periodo: '2026-08', u: 10 }, { periodo: '2026-11', u: 10 }], v)).toBeNull();
  });
});
