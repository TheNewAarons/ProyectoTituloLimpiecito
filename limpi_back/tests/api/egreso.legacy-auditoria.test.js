/**
 * RNF-SEC-02 — Tests legacy de egreso (E1): transaccion + auditoria CREAR.
 * E2 (anulacion) ya esta cubierta por egreso.logica.test.js; aqui solo E1.
 */
jest.mock('../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../modelos/sistema_base/Caja', () => ({}));
jest.mock('../../modelos/sistema_base/Usuario', () => ({}));
jest.mock('../../modelos/sistema_base/Egreso', () => ({ create: jest.fn(), findById: jest.fn(), belongsTo: jest.fn() }));
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));

const db = require('../../database/database');
const Egreso = require('../../modelos/sistema_base/Egreso');
const { auditar } = require('../../services/auditoria');
const logica = require('../../api/apartado_base/egreso/logica');

function egresoInst(data) {
  const inst = Object.assign({}, data);
  inst.get = jest.fn(() => Object.assign({}, inst));
  return inst;
}

const t = { LOCK: { UPDATE: 'L' } };
const ctxToken = { usuario: { id: 9, contexto: 'usuarios' }, ip: '1.1.1.1', motivoSinToken: null };
const ctxLegacy = { usuario: { id: null, contexto: 'sistema' }, ip: null, motivoSinToken: 'LEGACY_SIN_TOKEN' };

describe('egreso: E1 crearEgreso', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.sequelize.transaction.mockImplementation((cb) => Promise.resolve().then(() => cb(t)));
    auditar.mockResolvedValue({});
  });

  it('audita CREAR con despues = fila creada y transaction t', async () => {
    const creado = egresoInst({ id: 10, monto: 100 });
    Egreso.create.mockResolvedValue(creado);
    const r = await logica.crearEgresoDB({ monto: 100 }, ctxToken);
    expect(r).toBe(creado);
    expect(Egreso.create).toHaveBeenCalledWith({ monto: 100 }, { transaction: t });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: t, usuario: ctxToken.usuario, entidad: 'egresos', entidad_id: 10,
      accion: 'CREAR', despues: creado, ip: '1.1.1.1'
    }));
  });

  it('legacy sin token audita con sistema y motivo LEGACY_SIN_TOKEN', async () => {
    Egreso.create.mockResolvedValue(egresoInst({ id: 11, monto: 100 }));
    await logica.crearEgresoDB({ monto: 100 }, ctxLegacy);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      usuario: { id: null, contexto: 'sistema' }, motivo: 'LEGACY_SIN_TOKEN'
    }));
  });

  it('si auditar falla la promesa rechaza (rollback)', async () => {
    Egreso.create.mockResolvedValue(egresoInst({ id: 12, monto: 100 }));
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    await expect(logica.crearEgresoDB({ monto: 100 }, ctxToken)).rejects.toThrow('fallo auditoria');
  });
});
