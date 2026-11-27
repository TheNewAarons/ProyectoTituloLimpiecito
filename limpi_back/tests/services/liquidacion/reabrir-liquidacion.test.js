/**
 * Reabrir liquidación: solo cerradas, con pago EN_ESPERA y su centro de costo abierto; auditado con motivo.
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn((fn) => fn({ LOCK: { UPDATE: 'UPDATE' } })) }
}));
jest.mock('../../../modelos/sistema_base/Liquidacion', () => ({ findById: jest.fn(), update: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Centro_costo_trabajadore', () => ({ findOne: jest.fn(), belongsTo: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Trabajadore', () => ({ belongsTo: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({ belongsTo: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Salude', () => ({}));
jest.mock('../../../modelos/sistema_base/Instituto_previsione', () => ({}));
jest.mock('../../../modelos/sistema_base/Seguro', () => ({}));
jest.mock('../../../modelos/sistema_base/Cliente', () => ({}));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../../services/centro-costo/codigo-reapertura', () => ({ emitirCodigo: jest.fn(), consumirCodigo: jest.fn() }));
jest.mock('../../../services/liquidaciones/pago', () => ({}));
jest.mock('../../../modelos/sistema_base/Auditoria', () => ({ findAll: jest.fn() }));

const Liquidacion = require('../../../modelos/sistema_base/Liquidacion');
const CentroTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');
const { auditar } = require('../../../services/auditoria');
const { reabrirLiquidacionDB } = require('../../../api/apartado_base/liquidacion/logica');
const { reabrir, pedirCodigoReapertura } = require('../../../api/apartado_base/liquidacion/controlador-v1');
const Usuario = require('../../../modelos/sistema_base/Usuario');
const codigoSrv = require('../../../services/centro-costo/codigo-reapertura');
const AppError = require('../../../libs/app-error');

const fila = (d) => Object.assign({ get: () => Object.assign({}, d) }, d);
const ctx = { usuario: { id: 1, contexto: 'usuarios' }, motivo: 'cerrada por error', ip: 'x' };
const cerrada = { id: 7, estado: 0, estado_pago: 'EN_ESPERA' };
const conCentro = (estado) => CentroTrabajador.findOne.mockResolvedValue({
  centro_costo: { id: 3, estado: estado, numero_cc: 42 }, trabajadore: { nombre: 'Ana', apellido: 'Rojas' }
});

describe('reabrirLiquidacionDB', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reabre (estado 1) y audita REAPERTURA con motivo', async () => {
    Liquidacion.findById.mockResolvedValue(fila(cerrada));
    conCentro(1);
    const r = await reabrirLiquidacionDB(7, ctx);
    expect(r.estado).toBe(1);
    expect(Liquidacion.update).toHaveBeenCalledWith({ estado: 1 }, expect.objectContaining({ where: { id: 7 } }));
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'REAPERTURA', entidad: 'liquidaciones', motivo: 'cerrada por error' }));
  });

  it.each([
    [{ estado: 1, estado_pago: 'EN_ESPERA' }, 1, 'LIQUIDACION_NO_CERRADA'],
    [{ estado: 0, estado_pago: 'PAGADA' }, 1, 'LIQUIDACION_PAGADA'],
    [{ estado: 0, estado_pago: 'ANULADA' }, 1, 'LIQUIDACION_ANULADA'],
    [{ estado: 0, estado_pago: 'EN_ESPERA' }, 0, 'CENTRO_CERRADO']
  ])('rechaza %o con centro estado %s -> %s', async (datos, estadoCentro, codigo) => {
    Liquidacion.findById.mockResolvedValue(fila(Object.assign({ id: 7 }, datos)));
    conCentro(estadoCentro);
    await expect(reabrirLiquidacionDB(7, ctx)).rejects.toMatchObject({ code: codigo });
    expect(Liquidacion.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('404 si no existe', async () => {
    Liquidacion.findById.mockResolvedValue(null);
    await expect(reabrirLiquidacionDB(99, ctx)).rejects.toMatchObject({ code: 'LIQUIDACION_NO_EXISTE' });
  });
});

describe('handlers: motivo -> código por correo -> reabre', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pedir código: motivo corto -> 400 sin tocar BD ni enviar correo', async () => {
    await expect(pedirCodigoReapertura({ params: { id: '7' }, body: { motivo: 'x' }, usuario: { id: 1 } }, {}))
      .rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO' });
    expect(Liquidacion.findById).not.toHaveBeenCalled();
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('pedir código: valida antes de enviar; envía al correo de la BD con clave y descripción de la liquidación', async () => {
    Liquidacion.findById.mockResolvedValue(fila(Object.assign({}, cerrada, { estado_pago: 'PAGADA' })));
    conCentro(1);
    await expect(pedirCodigoReapertura({ params: { id: '7' }, body: { motivo: 'cerrada por error' }, usuario: { id: 1 } }, {}))
      .rejects.toMatchObject({ code: 'LIQUIDACION_PAGADA' });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();

    Liquidacion.findById.mockResolvedValue(fila(cerrada));
    Usuario.findById.mockResolvedValue({ id: 1, nombre: 'Admin', correo: 'bd@limpiecito.cl' });
    codigoSrv.emitirCodigo.mockResolvedValue({ correo: 'b***@limpiecito.cl', vigencia_segundos: 600 });
    const res = { json: jest.fn() };
    await pedirCodigoReapertura({ params: { id: '7' }, body: { motivo: 'cerrada por error' }, usuario: { id: 1 } }, res);
    expect(codigoSrv.emitirCodigo).toHaveBeenCalledWith(
      { id: 1, nombre: 'Admin', correo: 'bd@limpiecito.cl' },
      { clave: 'liq:7', descripcion: 'la liquidación de Ana Rojas (centro de costo N° 42)' },
      'cerrada por error'
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true, data: { correo: 'b***@limpiecito.cl', vigencia_segundos: 600 }, meta: {} });
  });

  it('reabrir: código inválido -> no reabre', async () => {
    codigoSrv.consumirCodigo.mockImplementationOnce(() => { throw new AppError('CODIGO_INVALIDO', 'x', 400); });
    await expect(reabrir({ params: { id: '7' }, body: { codigo: '000000' }, usuario: { id: 1 } }, {}))
      .rejects.toMatchObject({ code: 'CODIGO_INVALIDO' });
    expect(codigoSrv.consumirCodigo).toHaveBeenCalledWith(1, 'liq:7', '000000');
    expect(Liquidacion.update).not.toHaveBeenCalled();
  });

  it('reabrir: código válido -> audita el motivo que llegó por correo', async () => {
    Liquidacion.findById.mockResolvedValue(fila(cerrada));
    conCentro(1);
    codigoSrv.consumirCodigo.mockReturnValueOnce('cerrada por error');
    const res = { json: jest.fn() };
    await reabrir({ params: { id: '7' }, body: { codigo: '123456' }, usuario: { id: 1, contexto: 'usuarios' } }, res);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ motivo: 'cerrada por error [confirmado con código por correo]' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});

describe('modificadas', () => {
  const Auditoria = require('../../../modelos/sistema_base/Auditoria');
  const { modificadas } = require('../../../api/apartado_base/liquidacion/controlador-v1');

  it('sin ids válidos no consulta', async () => {
    const res = { json: jest.fn() };
    await modificadas({ query: { ids: 'x,-1' } }, res);
    expect(Auditoria.findAll).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true, data: { ids: [] }, meta: {} });
  });

  it('devuelve los ids con reapertura/edición', async () => {
    Auditoria.findAll.mockResolvedValue([{ entidad_id: '7' }]);
    const res = { json: jest.fn() };
    await modificadas({ query: { ids: '7,8' } }, res);
    expect(Auditoria.findAll.mock.calls[0][0].where.entidad_id).toBeDefined();
    expect(res.json).toHaveBeenCalledWith({ ok: true, data: { ids: [7] }, meta: {} });
  });
});
