import { ProductividadPevComponent, aCsv } from './productividad-pev.component';

describe('ProductividadPevComponent', () => {
  it('por defecto cubre los últimos 3 meses', () => {
    const c = new ProductividadPevComponent(null, null);
    expect(c.desde < c.hasta).toBe(true);
  });

  it('aCsv: separador ;, coma decimal, BOM y comillas cuando hace falta', () => {
    const csv = aCsv([['Nombre', 'nombre'], ['Pct', 'pct']], [{ nombre: 'Pérez; "Ana"', pct: 97.8 }, { nombre: 'Luis', pct: null }]);
    expect(csv).toBe('﻿Nombre;Pct\r\n"Pérez; ""Ana""";97,8\r\nLuis;');
  });

  it('aCsv: neutraliza texto que Excel ejecutaría como fórmula, sin tocar números negativos', () => {
    expect(aCsv([['S', 's'], ['N', 'n']], [{ s: '=HYPERLINK("x")', n: -3 }, { s: '@SUM(1)', n: 1 }]))
      .toBe('﻿S;N\r\n"\'=HYPERLINK(""x"")";-3\r\n\'@SUM(1);1');
  });
});
