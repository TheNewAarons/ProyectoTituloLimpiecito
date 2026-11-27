import { RentabilidadComponent } from './rentabilidad.component';
import { FilaRentabilidad } from '../../../model/analytics';

describe('RentabilidadComponent', () => {
  it('por defecto cubre los últimos 3 meses y marca como estimado solo CONTRATO_ESTIMADO y MIXTO', () => {
    const c = new RentabilidadComponent(null, null, null);
    expect(c.desde < c.hasta).toBe(true);
    const f = (origen: string): FilaRentabilidad => ({ origen_ingreso: origen } as FilaRentabilidad);
    expect(c.esEstimado(f('MIXTO'))).toBe(true);
    expect(c.esEstimado(f('CONTRATO_ESTIMADO'))).toBe(true);
    expect(c.esEstimado(f('CAJA'))).toBe(false);
  });
});
