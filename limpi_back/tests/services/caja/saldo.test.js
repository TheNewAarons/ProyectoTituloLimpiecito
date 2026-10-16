/**
 * Tests unitarios de services/caja/saldo.js (modelos y periodo.js mockeados, sin BD).
 * TASK_PLAN §1: "solo PAGADA suma; EN_ESPERA/ANULADA no; egresos anulados no suman;
 * históricos sin egreso_id suman".
 */
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

jest.mock('../../../services/caja/periodo', () => ({
  buscarCajaPorPeriodo: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({
  findAll: jest.fn(),
  sum: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Egreso', () => ({
  sum: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/CcEgreso', () => ({
  sum: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Liquidacion', () => ({
  findAll: jest.fn(),
  sum: jest.fn()
}));
jest.mock('../../../modelos/sistema_base/Centro_costo_trabajadore', () => ({
  findAll: jest.fn()
}));

const { buscarCajaPorPeriodo } = require('../../../services/caja/periodo');
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo');
const Egreso = require('../../../modelos/sistema_base/Egreso');
const CcEgreso = require('../../../modelos/sistema_base/CcEgreso');
const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const CentroCostoTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');

const { calcularSaldo, aEnteroCLP, finDePeriodo } = require('../../../services/caja/saldo');
const { EGRESO_ANULADO } = require('../../../services/constantes');

describe('services/caja/saldo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Liquidacion.findAll.mockResolvedValue([]); // pendientes EN_ESPERA, por defecto vacío
  });

  describe('aEnteroCLP', () => {
    it('devuelve 0 para null/undefined', () => {
      expect(aEnteroCLP(null)).toBe(0);
      expect(aEnteroCLP(undefined)).toBe(0);
    });
    it('convierte string DECIMAL a entero', () => {
      expect(aEnteroCLP('15000')).toBe(15000);
    });
    it('lanza MONTO_INVALIDO si no es entero seguro', () => {
      expect(() => aEnteroCLP(1.5)).toThrow(expect.objectContaining({ code: 'MONTO_INVALIDO' }));
      expect(() => aEnteroCLP(Number.MAX_SAFE_INTEGER + 10)).toThrow(expect.objectContaining({ code: 'MONTO_INVALIDO' }));
    });
  });

  describe('finDePeriodo', () => {
    it('calcula el último día del mes con hora 23:59:59', () => {
      expect(finDePeriodo('2026-02')).toBe('2026-02-28 23:59:59');
      expect(finDePeriodo('2026-04')).toBe('2026-04-30 23:59:59');
    });
  });

  describe('calcularSaldo', () => {
    it('lanza PERIODO_INVALIDO con formato incorrecto', async () => {
      await expect(calcularSaldo('2026/10')).rejects.toMatchObject({ code: 'PERIODO_INVALIDO' });
    });

    it('lanza CAJA_NO_EXISTE si periodo.buscarCajaPorPeriodo devuelve null', async () => {
      buscarCajaPorPeriodo.mockResolvedValue(null);
      await expect(calcularSaldo('2026-10')).rejects.toMatchObject({ code: 'CAJA_NO_EXISTE' });
    });

    it('caja CERRADA devuelve el movimiento congelado, sin recalcular, provisional=false', async () => {
      buscarCajaPorPeriodo.mockResolvedValue({
        id: 9,
        estado: 0,
        saldo_inicial: '100000',
        saldo_final: '150000',
        total_ingreso: '80000',
        total_egreso: '30000'
      });

      const resultado = await calcularSaldo('2026-09');

      expect(resultado.provisional).toBe(false);
      expect(resultado.saldo_inicial).toBe(100000);
      expect(resultado.saldo_final).toBe(150000);
      expect(resultado.egresos.total).toBe(30000);
      expect(resultado.egresos.generales).toBeNull();
      // no debe consultar sumas en vivo si la caja está cerrada
      expect(CentroCosto.sum).not.toHaveBeenCalled();
      expect(Egreso.sum).not.toHaveBeenCalled();
    });

    it('caja ABIERTA: solo egresos no anulados y liquidaciones PAGADA sin egreso_id impactan el saldo', async () => {
      buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '10000' });
      CentroCosto.sum.mockResolvedValue('200000'); // ingresos (precio_servicio)
      Egreso.sum.mockResolvedValue('50000'); // egresos generales no anulados
      CentroCosto.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]); // centros cerrados
      CcEgreso.sum.mockResolvedValue('10000');
      CentroCostoTrabajador.findAll.mockResolvedValue([{ liquidacioneId: 7 }, { liquidacioneId: null }]);
      Liquidacion.sum.mockResolvedValue('25000'); // histórico PAGADA sin egreso_id

      const resultado = await calcularSaldo('2026-10');

      expect(resultado.provisional).toBe(true);
      expect(resultado.ingresos).toBe(200000);
      expect(resultado.egresos.generales).toBe(50000);
      expect(resultado.egresos.centros).toBe(10000);
      expect(resultado.egresos.liquidaciones_historicas).toBe(25000);
      expect(resultado.egresos.total).toBe(85000);
      expect(resultado.saldo_final).toBe(10000 + 200000 - 85000);

      // egresos generales: NULL-safe, excluyen anulados pero cuentan estado NULL como no anulado
      // (Op.or: [{estado: null}, {estado: {Op.ne: EGRESO_ANULADO}}])
      const whereEgreso = Egreso.sum.mock.calls[0][1].where;
      const condiciones = whereEgreso[Op.or];
      expect(condiciones).toContainEqual({ estado: null });
      expect(condiciones).toContainEqual({ estado: { [Op.ne]: EGRESO_ANULADO } });

      // liquidaciones históricas: solo PAGADA y egreso_id null, filtradas por los ids del vínculo (sin null)
      const whereLiq = Liquidacion.sum.mock.calls[0][1].where;
      expect(whereLiq.estado_pago).toBe('PAGADA');
      expect(whereLiq.egreso_id).toBeNull();
      expect(whereLiq.id[Op.in]).toEqual([7]);
    });

    it('sin centros cerrados no consulta CcEgreso ni liquidaciones históricas (quedan en 0)', async () => {
      buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '0' });
      CentroCosto.sum.mockResolvedValue(null);
      Egreso.sum.mockResolvedValue(null);
      CentroCosto.findAll.mockResolvedValue([]);

      const resultado = await calcularSaldo('2026-10');

      expect(resultado.egresos.centros).toBe(0);
      expect(resultado.egresos.liquidaciones_historicas).toBe(0);
      expect(CcEgreso.sum).not.toHaveBeenCalled();
      expect(CentroCostoTrabajador.findAll).not.toHaveBeenCalled();
    });

    it('Model.sum devolviendo NaN (sin filas) se trata como 0, no como error', async () => {
      buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '0' });
      CentroCosto.sum.mockResolvedValue(NaN);
      Egreso.sum.mockResolvedValue(NaN);
      CentroCosto.findAll.mockResolvedValue([]);

      const resultado = await calcularSaldo('2026-10');

      expect(resultado.ingresos).toBe(0);
      expect(resultado.egresos.generales).toBe(0);
      expect(resultado.saldo_final).toBe(0);
    });

    it('liquidaciones EN_ESPERA se reportan en pendientes y no afectan egresos/saldo', async () => {
      buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '0' });
      CentroCosto.sum.mockResolvedValue(0);
      Egreso.sum.mockResolvedValue(0);
      CentroCosto.findAll.mockResolvedValue([]);
      Liquidacion.findAll.mockResolvedValue([{ liquido_pagar: '5000' }, { liquido_pagar: '3000' }]);

      const resultado = await calcularSaldo('2026-10');

      expect(resultado.pendientes).toEqual({ cantidad: 2, monto: 8000 });
      expect(resultado.saldo_final).toBe(0);
      const wherePendientes = Liquidacion.findAll.mock.calls[0][0].where;
      expect(wherePendientes.estado_pago).toBe('EN_ESPERA');
      expect(wherePendientes.fecha_creacion[Op.lte]).toBe('2026-10-31 23:59:59');
    });
  });
});
