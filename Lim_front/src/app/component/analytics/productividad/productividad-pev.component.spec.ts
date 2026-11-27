import { ProductividadPevComponent } from './productividad-pev.component';
import { aCsv } from '../compartido/csv';

describe('ProductividadPevComponent', () => {
  it('por defecto cubre los últimos 3 meses', () => {
    const c = new ProductividadPevComponent(null, null, null);
    expect(c.desde < c.hasta).toBe(true);
  });

  it('aCsv: separador ;, coma decimal, BOM y comillas cuando hace falta', () => {
    const csv = aCsv([['Nombre', 'nombre'], ['Pct', 'pct']], [{ nombre: 'Pérez; "Ana"', pct: 97.8 }, { nombre: 'Luis', pct: null }]);
    expect(csv).toBe('﻿Nombre;Pct\r\n"Pérez; ""Ana""";97,8\r\nLuis;');
  });

  it('KPI Verificación: total sin supervisor; con supervisor, el % de su fila del ranking (obs. 1)', () => {
    const c = new ProductividadPevComponent(null, null, null);
    c.supervisores = [{ n_empleado: 1002, verificacion_pct: 61.1 }, { n_empleado: 1005, verificacion_pct: 100 }] as any;
    c.verificacionTotal = 87.8;
    c.supervisor = null;
    c.actualizarVerificacion();
    expect(c.verificacion).toBe(87.8);
    c.supervisor = 1002;
    c.actualizarVerificacion();
    expect(c.verificacion).toBe(61.1);
    c.supervisor = 9999; // supervisor sin fila en el período
    c.actualizarVerificacion();
    expect(c.verificacion).toBeNull();
  });

  it('aCsv: neutraliza texto que Excel ejecutaría como fórmula, sin tocar números negativos', () => {
    expect(aCsv([['S', 's'], ['N', 'n']], [{ s: '=HYPERLINK("x")', n: -3 }, { s: '@SUM(1)', n: 1 }]))
      .toBe('﻿S;N\r\n"\'=HYPERLINK(""x"")";-3\r\n\'@SUM(1);1');
  });
});
