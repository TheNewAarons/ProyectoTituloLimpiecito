import { aInputLocal, aIso } from './crear-anuncio.component';

// RF-WEB-03: conversión entre <input type="datetime-local"> (hora local) y el ISO con zona que exige el backend.
describe('CrearAnuncioComponent fechas', () => {
  it('ida y vuelta conserva el minuto local', () => {
    const local = '2026-12-24T18:30';
    expect(aInputLocal(aIso(local))).toBe(local);
  });

  it('aIso entrega ISO 8601 con zona (Z)', () => {
    expect(aIso('2026-05-10T09:05')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('vacío o null: sin fecha (sin expiración)', () => {
    expect(aIso('')).toBe('');
    expect(aInputLocal(null)).toBe('');
  });
});
