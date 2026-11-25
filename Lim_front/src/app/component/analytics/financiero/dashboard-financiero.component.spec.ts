import { DashboardFinancieroComponent } from './dashboard-financiero.component';

describe('DashboardFinancieroComponent', () => {
  it('se crea sin resumen y sin proyeccion', () => {
    const c = new DashboardFinancieroComponent(null, null, null);
    expect(c.proyeccionUtilidad).toBeNull();
  });
});
