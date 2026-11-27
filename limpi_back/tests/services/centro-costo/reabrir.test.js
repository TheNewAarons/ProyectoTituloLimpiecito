/**
 * Reabrir centro de costo: solo cerrados, solo con la caja de su mes abierta, auditado con motivo.
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn((fn) => fn({ LOCK: { UPDATE: 'UPDATE' } })) }
}));
jest.mock('../../../modelos/sistema_base/Centro_costo', () => ({ findById: jest.fn(), update: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Caja', () => ({ findById: jest.fn() }));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../../services/centro-costo/codigo-reapertura', () => ({ emitirCodigo: jest.fn(), consumirCodigo: jest.fn() }));
jest.mock('../../../middleware/auth', () => ({ autenticar: function autenticar() {}, requerirRol: jest.fn(() => function rol() {}) }));

const Centro = require('../../../modelos/sistema_base/Centro_costo');
const Caja = require('../../../modelos/sistema_base/Caja');
const { auditar } = require('../../../services/auditoria');
const { reabrirCentroCosto } = require('../../../services/centro-costo/cierre');
const { reabrir, pedirCodigo } = require('../../../api/v1/centros-costo/routes');
const Usuario = require('../../../modelos/sistema_base/Usuario');
const codigoSrv = require('../../../services/centro-costo/codigo-reapertura');
const AppError = require('../../../libs/app-error');
const rolesReabrir = require('../../../middleware/auth').requerirRol.mock.calls.map((c) => c.slice());

it('pedir código y reabrir son solo para Administrador', () => {
  expect(rolesReabrir).toEqual([['Administrador'], ['Administrador']]);
});

const cerrado = { estado: 0, cajaId: 14, fecha_cierre: '2026-11-27', total_costos: 10, utilidad: 5 };
const fila = (d) => Object.assign({ get: () => Object.assign({}, d) }, d);
const opciones = { usuario: { id: 1, contexto: 'usuarios' }, motivo: 'cerrado por error', ip: 'x' };

describe('reabrirCentroCosto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reabre, limpia montos de cierre y audita REAPERTURA con motivo', async () => {
    Centro.findById.mockResolvedValue(fila(cerrado));
    Caja.findById.mockResolvedValue({ estado: 1, periodo: '2026-12' });
    const r = await reabrirCentroCosto(115, opciones);
    const datos = { estado: 1, fecha_cierre: null, total_costos: null, utilidad: null };
    expect(Centro.update).toHaveBeenCalledWith(datos, expect.objectContaining({ where: { id: 115 } }));
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'REAPERTURA', entidad: 'centro_costos', entidad_id: 115, motivo: 'cerrado por error',
      antes: expect.objectContaining({ estado: 0, total_costos: 10 })
    }));
    expect(r.estado).toBe(1);
  });

  it('caja del mes cerrada: 409 MES_CERRADO y no modifica', async () => {
    Centro.findById.mockResolvedValue(fila(cerrado));
    Caja.findById.mockResolvedValue({ estado: 0, periodo: '2026-11' });
    await expect(reabrirCentroCosto(115, opciones)).rejects.toMatchObject({ code: 'MES_CERRADO', httpStatus: 409 });
    expect(Centro.update).not.toHaveBeenCalled();
  });

  it('centro ya abierto: 409; inexistente: 404', async () => {
    Centro.findById.mockResolvedValueOnce(fila(Object.assign({}, cerrado, { estado: 1 })));
    await expect(reabrirCentroCosto(1, opciones)).rejects.toMatchObject({ code: 'CENTRO_NO_CERRADO' });
    Centro.findById.mockResolvedValueOnce(null);
    await expect(reabrirCentroCosto(1, opciones)).rejects.toMatchObject({ httpStatus: 404 });
    expect(Centro.update).not.toHaveBeenCalled();
  });

  it('pedir código: motivo corto -> 400 sin tocar BD ni enviar correo', async () => {
    await expect(pedirCodigo({ params: { id: '115' }, body: { motivo: 'x' }, usuario: { id: 1 } }, {}))
      .rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO', httpStatus: 400 });
    expect(Centro.findById).not.toHaveBeenCalled();
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('handler: código inválido -> no reabre', async () => {
    codigoSrv.consumirCodigo.mockImplementationOnce(() => { throw new AppError('CODIGO_INVALIDO', 'x', 400); });
    await expect(reabrir({ params: { id: '115' }, body: { codigo: '000000' }, usuario: { id: 1 } }, {}))
      .rejects.toMatchObject({ code: 'CODIGO_INVALIDO' });
    expect(codigoSrv.consumirCodigo).toHaveBeenCalledWith(1, 115, '000000');
    expect(Centro.findById).not.toHaveBeenCalled();
  });

  it('handler: código válido -> reabre y audita el motivo que llegó por correo (no uno del body)', async () => {
    Centro.findById.mockResolvedValue(fila(cerrado));
    Caja.findById.mockResolvedValue({ estado: 1, periodo: '2026-12' });
    codigoSrv.consumirCodigo.mockReturnValueOnce('cerrado por error');
    const res = { json: jest.fn() };
    await reabrir({ params: { id: '115' }, body: { motivo: 'otro motivo', codigo: '123456' }, usuario: { id: 1 } }, res);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ motivo: 'cerrado por error [confirmado con código por correo]' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('pedir código: valida el centro antes de enviar y usa el correo de la BD', async () => {
    Centro.findById.mockResolvedValue(fila(Object.assign({ id: 115 }, cerrado)));
    Caja.findById.mockResolvedValue({ estado: 0, periodo: '2026-11' });
    const body = { motivo: 'cerrado por error' };
    await expect(pedirCodigo({ params: { id: '115' }, body: body, usuario: { id: 1 } }, {})).rejects.toMatchObject({ code: 'MES_CERRADO' });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();

    Caja.findById.mockResolvedValue({ estado: 1, periodo: '2026-12' });
    Usuario.findById.mockResolvedValue({ id: 1, nombre: 'Ana', correo: 'bd@limpiecito.cl' });
    codigoSrv.emitirCodigo.mockResolvedValue({ correo: 'b***@limpiecito.cl', vigencia_segundos: 600 });
    const res = { json: jest.fn() };
    await pedirCodigo({ params: { id: '115' }, body: body, usuario: { id: 1, correo: 'token@viejo.cl' } }, res);
    expect(codigoSrv.emitirCodigo).toHaveBeenCalledWith(
      { id: 1, nombre: 'Ana', correo: 'bd@limpiecito.cl' }, expect.objectContaining({ id: 115 }), 'cerrado por error'
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true, data: { correo: 'b***@limpiecito.cl', vigencia_segundos: 600 }, meta: {} });
  });
});
