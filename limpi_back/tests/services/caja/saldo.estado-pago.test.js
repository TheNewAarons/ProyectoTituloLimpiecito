/**
 * RF-FAC-01 — Complementa tests/services/caja/saldo.test.js: verifica explicitamente que el
 * filtro `estado_pago` de services/caja/saldo.js excluye PENDIENTE/ANULADA del saldo de caja
 * (egresos generales y cc_egresos de centros cerrados), y que el historico (filas sin
 * estado_pago, default PAGADA via migracion) sigue sumando igual que antes.
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

const { calcularSaldo } = require('../../../services/caja/saldo');

describe('services/caja/saldo: filtro estado_pago (RF-FAC-01)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Liquidacion.findAll.mockResolvedValue([]);
    CentroCostoTrabajador.findAll.mockResolvedValue([]);
  });

  it('Egreso.sum solo cuenta estado_pago=PAGADA: una factura PENDIENTE no suma al saldo', async () => {
    buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '0' });
    CentroCosto.sum.mockResolvedValue(0);
    Egreso.sum.mockResolvedValue('50000'); // simula que el mock solo "ve" las PAGADA (el where real filtra en BD)
    CentroCosto.findAll.mockResolvedValue([]);

    const resultado = await calcularSaldo('2026-10');

    const whereEgreso = Egreso.sum.mock.calls[0][1].where;
    expect(whereEgreso.estado_pago).toBe('PAGADA');
    expect(resultado.egresos.generales).toBe(50000);
  });

  it('CcEgreso.sum (centros cerrados) tambien exige estado_pago=PAGADA', async () => {
    buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '0' });
    CentroCosto.sum.mockResolvedValue(0);
    Egreso.sum.mockResolvedValue(0);
    CentroCosto.findAll.mockResolvedValue([{ id: 1 }]);
    CcEgreso.sum.mockResolvedValue('7000');

    await calcularSaldo('2026-10');

    const whereCcEgreso = CcEgreso.sum.mock.calls[0][1].where;
    expect(whereCcEgreso.estado_pago).toBe('PAGADA');
  });

  it('historico intacto: filas existentes sin estado_pago explicito siguen sumando igual (el default de la migracion es PAGADA, el where solo filtra por ese valor)', async () => {
    buscarCajaPorPeriodo.mockResolvedValue({ id: 5, estado: 1, saldo_inicial: '100000' });
    CentroCosto.sum.mockResolvedValue('200000');
    Egreso.sum.mockResolvedValue('80000'); // filas historicas con estado_pago default 'PAGADA'
    CentroCosto.findAll.mockResolvedValue([]);

    const resultado = await calcularSaldo('2026-10');

    expect(resultado.saldo_final).toBe(100000 + 200000 - 80000);
    expect(resultado.egresos.generales).toBe(80000);
  });
});
