/**
 * RNF-SEC-02 — anular ingreso/egreso en dos pasos: motivo -> código por correo -> anulación auditada con ese motivo.
 */
jest.mock('../../services/facturas/pago', () => ({ anular: jest.fn() }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/CcIngreso', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Egreso', () => ({ findById: jest.fn() }));
jest.mock('../../services/centro-costo/codigo-reapertura', () => ({ emitirCodigo: jest.fn(), consumirCodigo: jest.fn() }));
jest.mock('../../modelos/sistema_base/Caja', () => ({ findById: jest.fn() }));
jest.mock('../../api/apartado_base/egreso/logica', () => ({ eliminarEgresoDB: jest.fn() }));

const pago = require('../../services/facturas/pago');
const Usuario = require('../../modelos/sistema_base/Usuario');
const CcIngreso = require('../../modelos/sistema_base/CcIngreso');
const Egreso = require('../../modelos/sistema_base/Egreso');
const codigoSrv = require('../../services/centro-costo/codigo-reapertura');
const Caja = require('../../modelos/sistema_base/Caja');
const egresoLegacy = require('../../api/apartado_base/egreso/logica');
const { verificar, pedirCodigo, anular, rutaReemplazada } = require('../../api/v1/facturas/anular-codigo');

const res = () => { const r = { json: jest.fn() }; r.status = jest.fn(() => r); return r; };
const req = (body, id) => ({ params: { id: id || '12' }, body: body, usuario: { id: 1, contexto: 'usuarios' }, ip: '1.2.3.4' });

beforeEach(() => jest.clearAllMocks());

describe('pedir código', () => {
  it('egreso: describe el documento y monto, liga la clave al registro y no anula nada', async () => {
    Egreso.findById.mockResolvedValue({ id: 12, estado_pago: 'PAGADA', tipo_documento: 'FACTURA', numero_documento: '4567', monto: 120000, cajaId: 3 });
    Caja.findById.mockResolvedValue({ id: 3, estado: 1, periodo: '2026-11' });
    Usuario.findById.mockResolvedValue({ nombre: 'Ana', correo: 'a@b.cl' });
    codigoSrv.emitirCodigo.mockResolvedValue({ correo: 'a***@b.cl', vigencia_segundos: 600 });
    const r = res();
    await pedirCodigo('egresos')(req({ motivo: '  factura duplicada  ' }), r);
    expect(codigoSrv.emitirCodigo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, correo: 'a@b.cl' }),
      { clave: 'egr-anular:12', descripcion: expect.stringMatching(/^el egreso N° 12 \(FACTURA 4567, \$120.000\)$/), accion: 'anular' },
      'factura duplicada'
    );
    expect(pago.anular).not.toHaveBeenCalled();
    expect(r.json).toHaveBeenCalledWith({ ok: true, data: { correo: 'a***@b.cl', vigencia_segundos: 600 }, meta: {} });
  });

  it.each([
    [{ motivo: 'abc' }, 'MOTIVO_REQUERIDO'],
    [{}, 'MOTIVO_REQUERIDO'],
    [{ motivo: 'x'.repeat(501) }, 'MOTIVO_REQUERIDO']
  ])('rechaza motivo inválido %j sin enviar correo', async (body, code) => {
    await expect(pedirCodigo('ingresos')(req(body), res())).rejects.toMatchObject({ code: code, httpStatus: 400 });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('no envía código si el registro no existe (404) o ya está anulado (409)', async () => {
    CcIngreso.findById.mockResolvedValueOnce(null);
    await expect(pedirCodigo('ingresos')(req({ motivo: 'motivo válido' }), res())).rejects.toMatchObject({ code: 'REGISTRO_NO_EXISTE', httpStatus: 404 });
    CcIngreso.findById.mockResolvedValueOnce({ id: 12, estado_pago: 'ANULADA', monto: 1 });
    await expect(pedirCodigo('ingresos')(req({ motivo: 'motivo válido' }), res())).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO', httpStatus: 409 });
    await expect(pedirCodigo('ingresos')(req({ motivo: 'motivo válido' }, 'abc'), res())).rejects.toMatchObject({ code: 'ID_INVALIDO' });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });
});

describe('anular con código', () => {
  it('ingreso: usa el motivo ligado al código, la config de ingresos (no impacta caja) y responde el registro', async () => {
    codigoSrv.consumirCodigo.mockReturnValue('cliente no pagará');
    pago.anular.mockResolvedValue({ id: 12, estado_pago: 'ANULADA' });
    const r = res();
    await anular('ingresos')(req({ codigo: '123456' }), r);
    expect(codigoSrv.consumirCodigo).toHaveBeenCalledWith(1, 'ing-anular:12', '123456');
    expect(pago.anular).toHaveBeenCalledWith(
      expect.objectContaining({ entidad: 'cc_ingresos', impactaCaja: false }),
      12,
      { motivo: 'cliente no pagará [confirmado con código por correo]', usuario: { id: 1, contexto: 'usuarios' }, ip: '1.2.3.4' }
    );
    expect(r.json).toHaveBeenCalledWith({ ok: true, data: { id: 12, estado_pago: 'ANULADA' }, meta: {} });
  });

  it('egreso de factura: la clave es distinta a la de ingreso y usa la config que impacta caja', async () => {
    codigoSrv.consumirCodigo.mockReturnValue('duplicado');
    Egreso.findById.mockResolvedValue({ id: 12, tipo_documento: 'FACTURA', estado_pago: 'PAGADA' });
    pago.anular.mockResolvedValue({ id: 12 });
    await anular('egresos')(req({ codigo: '654321' }), res());
    expect(codigoSrv.consumirCodigo).toHaveBeenCalledWith(1, 'egr-anular:12', '654321');
    expect(pago.anular.mock.calls[0][0]).toMatchObject({ entidad: 'egresos', impactaCaja: true });
  });

  it('un código inválido no anula', async () => {
    codigoSrv.consumirCodigo.mockImplementation(() => { throw Object.assign(new Error('x'), { code: 'CODIGO_INVALIDO' }); });
    await expect(anular('egresos')(req({ codigo: '000000' }), res())).rejects.toMatchObject({ code: 'CODIGO_INVALIDO' });
    expect(pago.anular).not.toHaveBeenCalled();
  });
});

it('la ruta antigua sin código responde 410 con las rutas nuevas', () => {
  const r = res();
  rutaReemplazada('egresos')(req({ motivo: 'x' }), r);
  expect(r.status).toHaveBeenCalledWith(410);
  expect(r.json.mock.calls[0][0]).toMatchObject({ ok: false, error: { code: 'RUTA_REEMPLAZADA' } });
});

describe('AUT-030: egresos antiguos (sin documento, antes "Eliminar")', () => {
  const legacy = { id: 1, tipo_documento: null, estado: 1, tipo: 1, estado_pago: 'PAGADA', monto: 650000, cajaId: 1 };

  it('no envía código si la caja del egreso está cerrada (el usuario no gasta el código)', async () => {
    Egreso.findById.mockResolvedValue(legacy);
    Caja.findById.mockResolvedValue({ id: 1, estado: 0, periodo: '2025-11' });
    await expect(pedirCodigo('egresos')(req({ motivo: 'motivo válido' }, '1'), res()))
      .rejects.toMatchObject({ code: 'CAJA_CERRADA', httpStatus: 409, message: expect.stringMatching(/2025-11/) });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('no envía código para el egreso del pago de una liquidación, ni si ya estaba anulado (estado -1)', async () => {
    Egreso.findById.mockResolvedValueOnce(Object.assign({}, legacy, { tipo: 2 }));
    await expect(pedirCodigo('egresos')(req({ motivo: 'motivo válido' }, '1'), res())).rejects.toMatchObject({ code: 'EGRESO_PAGO_LIQUIDACION' });
    Egreso.findById.mockResolvedValueOnce(Object.assign({}, legacy, { estado: -1 }));
    await expect(pedirCodigo('egresos')(req({ motivo: 'motivo válido' }, '1'), res())).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO' });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('con caja abierta pide el código y al confirmar anula con la lógica legacy (estado -1) y el motivo del usuario', async () => {
    Egreso.findById.mockResolvedValue(legacy);
    Caja.findById.mockResolvedValue({ id: 1, estado: 1, periodo: '2026-11' });
    Usuario.findById.mockResolvedValue({ nombre: 'Ana', correo: 'a@b.cl' });
    codigoSrv.emitirCodigo.mockResolvedValue({ correo: 'a***@b.cl' });
    await pedirCodigo('egresos')(req({ motivo: 'cargado dos veces' }, '1'), res());
    expect(codigoSrv.emitirCodigo.mock.calls[0][1]).toEqual({ clave: 'egr-anular:1', descripcion: 'el egreso N° 1 ($650.000)', accion: 'anular' });

    codigoSrv.consumirCodigo.mockReturnValue('cargado dos veces');
    egresoLegacy.eliminarEgresoDB.mockResolvedValue(1);
    const r = res();
    await anular('egresos')(req({ codigo: '123456' }, '1'), r);
    expect(egresoLegacy.eliminarEgresoDB).toHaveBeenCalledWith(1, {
      motivo: 'cargado dos veces [confirmado con código por correo]', usuario: { id: 1, contexto: 'usuarios' }, ip: '1.2.3.4'
    });
    expect(pago.anular).not.toHaveBeenCalled();
    expect(r.json).toHaveBeenCalledWith({ ok: true, data: { id: 1, estado: -1 }, meta: {} });
  });

  it('si al confirmar ya no existe o ya estaba anulado (0 filas) responde 409', async () => {
    Egreso.findById.mockResolvedValue(legacy);
    codigoSrv.consumirCodigo.mockReturnValue('x motivo');
    egresoLegacy.eliminarEgresoDB.mockResolvedValue(0);
    await expect(anular('egresos')(req({ codigo: '123456' }, '1'), res())).rejects.toMatchObject({ code: 'ESTADO_PAGO_INVALIDO', httpStatus: 409 });
  });
});

describe('verificar (antes de pedir el motivo)', () => {
  it('caja cerrada o pago de liquidación: responde 200 con anulable=false y el motivo (no es un error HTTP)', async () => {
    Egreso.findById.mockResolvedValueOnce({ id: 1, tipo_documento: null, estado: 1, tipo: 1, cajaId: 1 });
    Caja.findById.mockResolvedValue({ id: 1, estado: 0, periodo: '2025-11' });
    const r = res();
    await verificar('egresos')(req({}, '1'), r);
    expect(r.json.mock.calls[0][0]).toMatchObject({ ok: true, data: { anulable: false, code: 'CAJA_CERRADA', mensaje: expect.stringMatching(/2025-11/) } });

    Egreso.findById.mockResolvedValueOnce({ id: 419, tipo_documento: null, estado: 1, tipo: 2, cajaId: 13 });
    const r2 = res();
    await verificar('egresos')(req({}, '419'), r2);
    expect(r2.json.mock.calls[0][0].data).toMatchObject({ anulable: false, code: 'EGRESO_PAGO_LIQUIDACION', mensaje: expect.stringMatching(/Liquidaciones/) });
    expect(r.status).not.toHaveBeenCalled();
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });

  it('registro inexistente sí es un error (404)', async () => {
    CcIngreso.findById.mockResolvedValue(null);
    await expect(verificar('ingresos')(req({}, '99'), res())).rejects.toMatchObject({ code: 'REGISTRO_NO_EXISTE', httpStatus: 404 });
  });

  it('anulable: responde ok sin enviar código', async () => {
    CcIngreso.findById.mockResolvedValue({ id: 3, estado_pago: 'PENDIENTE' });
    const r = res();
    await verificar('ingresos')(req({}, '3'), r);
    expect(r.json).toHaveBeenCalledWith({ ok: true, data: { id: 3, anulable: true }, meta: {} });
    expect(codigoSrv.emitirCodigo).not.toHaveBeenCalled();
  });
});
