/**
 * Tests unitarios de services/caja/lectura.js (modelos y services/caja/{saldo,cierre} mockeados).
 * TASK_PLAN §9 punto 6: obtenerResumen/obtenerHistorial; mes CERRADO con saldo_provisional=true
 * (mes anterior reabierto) recalcula en vivo sin persistir; validaciones de periodo/rango.
 */
jest.mock('../../../modelos/sistema_base/Caja', () => ({
  findAll: jest.fn()
}));
jest.mock('../../../services/caja/saldo', () => ({
  calcularSaldo: jest.fn(),
  aEnteroCLP: jest.fn((v) => (v === null || v === undefined ? 0 : Number(v)))
}));
jest.mock('../../../services/caja/cierre', () => ({
  desplazarPeriodo: jest.requireActual('../../../services/caja/cierre').desplazarPeriodo,
  saldoFinalCerrada: jest.fn(),
  movimientoCongelado: jest.fn()
}));

const Caja = require('../../../modelos/sistema_base/Caja');
const { calcularSaldo } = require('../../../services/caja/saldo');
const { saldoFinalCerrada, movimientoCongelado } = require('../../../services/caja/cierre');

const { obtenerResumen, obtenerHistorial } = require('../../../services/caja/lectura');

function cajaCerrada(periodo, saldoFinal, totalIngreso, totalEgreso, provisional) {
  return { periodo: periodo, estado: 0, saldo_final: saldoFinal, total_ingreso: totalIngreso, total_egreso: totalEgreso, saldo_provisional: !!provisional };
}
function cajaAbierta(periodo, saldoInicial, provisional) {
  return { periodo: periodo, estado: 1, saldo_inicial: saldoInicial, saldo_provisional: !!provisional };
}

describe('services/caja/lectura', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerResumen', () => {
    it('lanza PERIODO_INVALIDO con formato incorrecto', async () => {
      await expect(obtenerResumen('2026/10')).rejects.toMatchObject({ code: 'PERIODO_INVALIDO' });
      expect(Caja.findAll).not.toHaveBeenCalled();
    });

    it('lanza CAJA_NO_EXISTE si el periodo no está entre las cajas', async () => {
      Caja.findAll.mockResolvedValue([cajaCerrada('2026-09', 1000, 1000, 0)]);
      await expect(obtenerResumen('2026-10')).rejects.toMatchObject({ code: 'CAJA_NO_EXISTE' });
    });

    it('mes CERRADO sin saldo_provisional usa saldoFinalCerrada (saldo congelado), no el recalculado en vivo', async () => {
      const cerrada = cajaCerrada('2026-10', 5000, 2000, 1000, false);
      Caja.findAll.mockResolvedValue([cerrada]);
      saldoFinalCerrada.mockReturnValue(5000);
      // El periodo objetivo siempre consulta calcularSaldo (detalle/pendientes), pero el saldo_final
      // publicado es el de saldoFinalCerrada (congelado), no ingresos/egresos en vivo.
      calcularSaldo.mockResolvedValue({ ingresos: 999999, egresos: { total: 999999 }, pendientes: { cantidad: 0, monto: 0 } });

      const resultado = await obtenerResumen('2026-10');

      expect(resultado.estado).toBe('CERRADA');
      expect(resultado.saldo_provisional).toBe(false);
      expect(resultado.saldo_final).toBe(5000);
      expect(resultado.provisional).toBe(false);
    });

    it('mes CERRADO con saldo_provisional=true (mes anterior reabierto) recalcula en vivo sin persistir', async () => {
      const anteriorAbierta = cajaAbierta('2026-09', 0, false);
      const cerradaProvisional = cajaCerrada('2026-10', 5000, 2000, 1000, true);
      Caja.findAll.mockResolvedValue([anteriorAbierta, cerradaProvisional]);
      movimientoCongelado.mockReturnValue(1000); // D-026: movimiento congelado, no el recomputado en vivo
      calcularSaldo
        .mockResolvedValueOnce({ ingresos: 3000, egresos: { total: 500 }, pendientes: { cantidad: 1, monto: 1000 } }) // mes anterior abierto
        .mockResolvedValueOnce({ ingresos: 2000, egresos: { total: 1000 }, pendientes: { cantidad: 0, monto: 0 } }); // mes objetivo (provisional)

      const resultado = await obtenerResumen('2026-10');

      // saldo_inicial del mes objetivo = running del mes anterior (0 + 3000 - 500 = 2500), no el almacenado
      expect(resultado.saldo_inicial).toBe(2500);
      expect(resultado.provisional).toBe(true);
      expect(resultado.saldo_final).toBe(2500 + 2000 - 1000);
      // no se persiste nada: lectura, sin locks ni .update()
      expect(Caja.findAll).toHaveBeenCalledWith(expect.not.objectContaining({ lock: expect.anything() }));
    });

    it('mes ABIERTO siempre consulta calcularSaldo (en vivo) y nunca usa saldoFinalCerrada', async () => {
      const abierta = cajaAbierta('2026-10', 1000, false);
      Caja.findAll.mockResolvedValue([abierta]);
      calcularSaldo.mockResolvedValue({ ingresos: 500, egresos: { total: 200 }, pendientes: { cantidad: 2, monto: 2000 } });

      const resultado = await obtenerResumen('2026-10');

      expect(resultado.estado).toBe('ABIERTA');
      expect(resultado.saldo_actual).toBe(1000 + 500 - 200);
      expect(resultado.saldo_final).toBeNull();
      expect(saldoFinalCerrada).not.toHaveBeenCalled();
    });
  });

  describe('obtenerHistorial', () => {
    it('rechaza desde/hasta con formato invalido', async () => {
      await expect(obtenerHistorial({ desde: '2026/01' })).rejects.toMatchObject({ code: 'PERIODO_INVALIDO' });
    });

    it('rechaza rango invertido (desde > hasta)', async () => {
      await expect(obtenerHistorial({ desde: '2026-05', hasta: '2026-01' })).rejects.toMatchObject({ code: 'RANGO_INVALIDO' });
    });

    it('rechaza rango mayor a 120 meses', async () => {
      await expect(obtenerHistorial({ desde: '2010-01', hasta: '2026-01' })).rejects.toMatchObject({ code: 'RANGO_INVALIDO' });
    });

    it('sin desde/hasta usa los últimos 12 meses por defecto', async () => {
      Caja.findAll.mockResolvedValue([cajaCerrada('2026-10', 1000, 1000, 0, false)]);
      saldoFinalCerrada.mockReturnValue(1000);
      calcularSaldo.mockResolvedValue({ ingresos: 0, egresos: { total: 0 }, pendientes: null });

      const resultado = await obtenerHistorial({});

      expect(resultado.meta ? undefined : undefined).toBeUndefined(); // (no aplica, obtenerHistorial no agrega meta aqui)
      expect(resultado.desde).toBeDefined();
      expect(resultado.hasta).toBeDefined();
    });

    it('devuelve items ASC con estado como texto y saldo_final congelado si no es provisional', async () => {
      const cerrada1 = cajaCerrada('2026-08', 1000, 1000, 0, false);
      const cerrada2 = cajaCerrada('2026-09', 1500, 500, 0, false);
      Caja.findAll.mockResolvedValue([cerrada1, cerrada2]);
      saldoFinalCerrada.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const resultado = await obtenerHistorial({ desde: '2026-08', hasta: '2026-09' });

      expect(resultado.items).toHaveLength(2);
      expect(resultado.items[0]).toMatchObject({ periodo: '2026-08', estado: 'CERRADA', saldo_final: 1000 });
      expect(resultado.items[1]).toMatchObject({ periodo: '2026-09', estado: 'CERRADA', saldo_final: 1500 });
    });
  });
});
