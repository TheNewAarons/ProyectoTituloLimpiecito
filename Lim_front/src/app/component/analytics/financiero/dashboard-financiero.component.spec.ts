import { DashboardFinancieroComponent } from './dashboard-financiero.component';
import { ResumenFinanciero } from '../../../model/analytics';

describe('DashboardFinancieroComponent', () => {
  it('se crea sin resumen y sin proyeccion', () => {
    const c = new DashboardFinancieroComponent(null, null, null);
    expect(c.proyeccionUtilidad).toBeNull();
    expect(c.proyeccionRegresion).toBeNull();
  });

  it('expone la regresión solo cuando el backend la entrega', () => {
    const c = new DashboardFinancieroComponent(null, null, null);
    const pm = { ingresos: 10, egresos: 4, utilidad: 6 };
    c.resumen = { proyeccion: { insuficiente: false, meses_historia: 4, promedio_movil: pm, regresion: null, estimacion: true } } as ResumenFinanciero;
    expect(c.proyeccionUtilidad).toBe(6);
    expect(c.proyeccionRegresion).toBeNull();
    c.resumen.proyeccion.regresion = { periodo: '2026-12', ingresos: 12, egresos: 5, utilidad: 7 };
    expect(c.proyeccionRegresion).toBe(7);
  });
});
