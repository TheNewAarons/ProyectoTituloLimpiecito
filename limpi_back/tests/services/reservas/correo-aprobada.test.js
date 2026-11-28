/**
 * RF-BI-05 — correo de reserva confirmada: fecha en español, pago legible, dirección/vehículo y datos escapados.
 */
jest.mock('../../../modelos/sist_app/Extra', () => ({ findOne: jest.fn() }));
jest.mock('../../../modelos/sist_app/Extra_lavado', () => ({ findOne: jest.fn() }));

const Extra = require('../../../modelos/sist_app/Extra');
const ExtraLavado = require('../../../modelos/sist_app/Extra_lavado');
const { armarCorreoAprobada, fechaLarga } = require('../../../services/reservas/correo-aprobada');

const base = () => ({
  reserva: { id: 5, orden: 1124, fecha_reserva: new Date('2026-12-01T09:00:00Z'), hora_inicio: '09:00:00', hora_fin: '11:00:00', precio: 22000, precio_total: 22000, metodo_pago: 'SIMULADO', pagado: false },
  usuario: { nombre: 'Ana Rojas', correo: 'ana@correo.cl' },
  servicio: { nombre: 'Lavado completo' }
});

beforeEach(() => { jest.clearAllMocks(); Extra.findOne.mockResolvedValue(null); ExtraLavado.findOne.mockResolvedValue(null); });

it('fecha en español según Santiago (el legacy mostraba "Tue Dec 01 2026 06:00:00 GMT-0300")', () => {
  expect(fechaLarga(new Date('2026-12-01T09:00:00Z'))).toBe('martes 1 de diciembre de 2026');
  // Revisión: el día se lee en UTC, igual que las consultas (DATE_FORMAT). Reservas de la app guardadas a las 00:00
  // salían un día antes si se formateaba en hora de Chile.
  expect(fechaLarga(new Date('2026-12-01T00:00:00Z'))).toBe('martes 1 de diciembre de 2026');
  expect(fechaLarga(new Date('2026-12-01T02:00:00Z'))).toBe('martes 1 de diciembre de 2026');
});

it('arma asunto, destinatario, pago SIMULADO legible y total a pagar', async () => {
  const c = await armarCorreoAprobada(base());
  expect(c.to).toBe('ana@correo.cl');
  expect(c.subject).toBe('Tu reserva N° 1124 está confirmada');
  expect(c.html).toContain('martes 1 de diciembre de 2026');
  expect(c.html).toContain('09:00 - 11:00 hrs');
  expect(c.html).toContain('Se coordina con el equipo (sin cobro en línea)');
  expect(c.html).toContain('Total a pagar');
  expect(c.html).not.toContain('SIMULADO');
});

it('incluye dirección y vehículo de extra_lavados, y escapa el HTML del cliente', async () => {
  ExtraLavado.findOne.mockResolvedValue({ direccion: 'Calle <b>1</b>', tipo: 'Auto', marca: 'Kia', modelo: 'Rio', patente: 'ABCD12' });
  const d = base();
  d.usuario.nombre = '<script>x</script>Ana';
  d.reserva.metodo_pago = 'Transbank';
  d.reserva.pagado = true;
  const c = await armarCorreoAprobada(d);
  expect(c.html).toContain('Auto Kia Rio · ABCD12');
  expect(c.html).toContain('Calle &lt;b&gt;1&lt;/b&gt;');
  expect(c.html).not.toContain('<script>x</script>');
  expect(c.html).toContain('Webpay (Transbank)');
  expect(c.html).toContain('Total pagado');
});

describe('correos de rechazo y servicio realizado', () => {
  const { armarCorreoRechazada, armarCorreoFinalizada } = require('../../../services/reservas/correo-aprobada');

  it('rechazada: asunto claro, motivo escapado e invitación a reservar otro horario', async () => {
    const d = Object.assign(base(), { motivo: 'Sin equipo <b>ese</b> día' });
    const c = await armarCorreoRechazada(d);
    expect(c.subject).toBe('No pudimos confirmar tu reserva N° 1124');
    expect(c.html).toContain('Sin equipo &lt;b&gt;ese&lt;/b&gt; día');
    expect(c.html).toContain('reservar otro día u horario');
    expect(c.text).toContain('Motivo: Sin equipo <b>ese</b> día');
  });

  it('finalizada: asunto y resumen del servicio', async () => {
    const c = await armarCorreoFinalizada(base());
    expect(c.subject).toBe('¡Servicio realizado! Reserva N° 1124');
    expect(c.html).toContain('¡Servicio realizado!');
    expect(c.html).toContain('martes 1 de diciembre de 2026');
  });
});
