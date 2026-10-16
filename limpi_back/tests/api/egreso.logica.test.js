/**
 * Tests de api/apartado_base/egreso (anulacion E5): transaccion + auditoria ANULAR, rechazo de
 * egresos tipo 2 y de cajas cerradas, y mapeo de errores del controlador sin filtrar detalles.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../modelos/sistema_base/Caja', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_base/Usuario', () => ({}));
jest.mock('../../modelos/sistema_base/Egreso', () => ({ findById: jest.fn(), belongsTo: jest.fn() }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));

const db = require('../../database/database');
const Caja = require('../../modelos/sistema_base/Caja');
const Egreso = require('../../modelos/sistema_base/Egreso');
const { auditar } = require('../../services/auditoria');
const logica = require('../../api/apartado_base/egreso/logica');
const controlador = require('../../api/apartado_base/egreso/controlador');

function egresoInst(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  inst.update = jest.fn((c) => { Object.assign(inst, c); return Promise.resolve(inst); });
  return inst;
}

describe('egreso: anulacion', () => {
  const t = { LOCK: { UPDATE: 'L' } };
  beforeEach(() => {
    jest.clearAllMocks();
    db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb(t)));
    auditar.mockResolvedValue({});
  });

  it('anula egreso general de caja ABIERTA con auditoria ANULAR (antes/despues)', async () => {
    const e = egresoInst({ id: 5, tipo: 1, estado: 1, cajaId: 2, monto: 100 });
    Egreso.findById.mockResolvedValue(e);
    Caja.findById.mockResolvedValue({ id: 2, estado: 1, periodo: '2026-10' });
    const r = await logica.eliminarEgresoDB(5, { usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1' });
    expect(r).toBe(1);
    expect(e.update).toHaveBeenCalledWith({ estado: -1 }, { transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'ANULAR', entidad: 'egresos', entidad_id: 5, transaction: t,
      usuario: { id: 9, contexto: 'usuarios' }, antes: expect.objectContaining({ estado: 1 })
    }));
  });

  it('rechaza egreso de pago de liquidacion (tipo 2) sin modificar ni auditar', async () => {
    const e = egresoInst({ id: 6, tipo: 2, estado: 1, cajaId: 2 });
    Egreso.findById.mockResolvedValue(e);
    await expect(logica.eliminarEgresoDB(6)).rejects.toMatchObject({ code: 'EGRESO_PAGO_LIQUIDACION', httpStatus: 409 });
    expect(e.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('rechaza si la caja del egreso esta cerrada', async () => {
    const e = egresoInst({ id: 7, tipo: 1, estado: 1, cajaId: 3 });
    Egreso.findById.mockResolvedValue(e);
    Caja.findById.mockResolvedValue({ id: 3, estado: 0, periodo: '2026-09' });
    await expect(logica.eliminarEgresoDB(7)).rejects.toMatchObject({ code: 'CAJA_CERRADA', httpStatus: 409 });
    expect(e.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si falla la auditoria la promesa rechaza (rollback por la transaccion)', async () => {
    Egreso.findById.mockResolvedValue(egresoInst({ id: 8, tipo: 1, estado: 1, cajaId: 2 }));
    Caja.findById.mockResolvedValue({ id: 2, estado: 1 });
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.eliminarEgresoDB(8)).rejects.toThrow('fallo auditoria');
  });

  it('egreso inexistente o ya anulado devuelve 0 sin auditar', async () => {
    Egreso.findById.mockResolvedValueOnce(null);
    expect(await logica.eliminarEgresoDB(1)).toBe(0);
    Egreso.findById.mockResolvedValueOnce(egresoInst({ id: 2, estado: -1 }));
    expect(await logica.eliminarEgresoDB(2)).toBe(0);
    expect(auditar).not.toHaveBeenCalled();
  });
});

describe('egreso: controlador eliminarEgreso', () => {
  function resFalso() {
    const res = { status: jest.fn(() => res), json: jest.fn(() => res), send: jest.fn(() => res) };
    return res;
  }
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb({ LOCK: { UPDATE: 'L' } })));
  });
  afterEach(() => console.error.mockRestore());

  it('AppError se mapea a su status con codigo', async () => {
    Egreso.findById.mockResolvedValue(egresoInst({ id: 6, tipo: 2, estado: 1 }));
    const res = resFalso();
    await controlador.eliminarEgreso({ params: { id: 6 } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: expect.objectContaining({ code: 'EGRESO_PAGO_LIQUIDACION' }) });
  });

  it('error inesperado responde 500 generico sin filtrar el mensaje interno', async () => {
    Egreso.findById.mockRejectedValue(new Error('SELECT secreto FROM tabla'));
    const res = resFalso();
    await controlador.eliminarEgreso({ params: { id: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secreto');
  });
});
