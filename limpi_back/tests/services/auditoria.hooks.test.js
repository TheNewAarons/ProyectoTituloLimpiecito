/**
 * RNF-SEC-02 (cobertura completa) — hooks globales de auditoría (services/auditoria/hooks.js).
 * Sequelize real sin conexión: los hooks se disparan con runHooks; auditar() mockeado.
 */
jest.mock('../../services/auditoria', () => ({ auditar: jest.fn() }));

const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const { auditar } = require('../../services/auditoria');
const { registrarHooksAuditoria, middlewareContexto } = require('../../services/auditoria/hooks');

const sequelize = new Sequelize('bd_prueba', 'u', 'p', { dialect: 'mysql', logging: false, operatorsAliases: false });
const Seguro = sequelize.define('seguro', { nombre: Sequelize.STRING, tasa: Sequelize.INTEGER }, { tableName: 'seguros' });
const Caja = sequelize.define('caja', { saldo: Sequelize.INTEGER }, { tableName: 'cajas' });
const Temporal = sequelize.define('doc_subida', { x: Sequelize.STRING }, { tableName: 'doc_subidas' });
registrarHooksAuditoria(sequelize);

const txPropia = { id: 'tx-propia' };
sequelize.transaction = jest.fn(cb => Promise.resolve().then(() => cb(txPropia)));

function existente(Modelo, valores) {
  // Simula una fila leída de BD: valores previos = actuales y sin campos marcados como cambiados.
  const inst = Modelo.build(valores, { isNewRecord: false, raw: true });
  inst._previousDataValues = Object.assign({}, inst.dataValues);
  inst._changed = {};
  return inst;
}

function enPeticion(req, fn) {
  return new Promise((resolve, reject) => middlewareContexto(req, {}, () => fn().then(resolve, reject)));
}

beforeEach(() => {
  jest.clearAllMocks();
  auditar.mockResolvedValue({ id: 1 });
});

describe('hooks globales de auditoría', () => {
  it('EDITAR registra solo los campos cambiados con valor anterior y nuevo', async () => {
    const s = existente(Seguro, { id: 7, nombre: 'Fonasa', tasa: 7 });
    s.set({ nombre: 'Fonasa', tasa: 8 });
    const opts = { transaction: { id: 'tx-llamador' } };
    await Seguro.runHooks('beforeUpdate', s, opts);
    await Seguro.runHooks('afterUpdate', s, opts);
    expect(auditar).toHaveBeenCalledTimes(1);
    expect(auditar.mock.calls[0][0]).toMatchObject({
      transaction: opts.transaction, entidad: 'seguros', entidad_id: 7, accion: 'EDITAR'
    });
    expect(auditar.mock.calls[0][0].antes).toEqual({ tasa: 7 });
    expect(auditar.mock.calls[0][0].despues).toEqual({ tasa: 8 });
  });

  it('EDITAR sin cambios reales no registra nada', async () => {
    const s = existente(Seguro, { id: 7, nombre: 'Fonasa', tasa: 7 });
    s.set({ tasa: 7 });
    await Seguro.runHooks('beforeUpdate', s, {});
    await Seguro.runHooks('afterUpdate', s, {});
    expect(auditar).not.toHaveBeenCalled();
  });

  it('sin transacción del llamador abre una propia', async () => {
    const s = Seguro.build({ id: 3, nombre: 'Banmedica', tasa: 7 });
    await Seguro.runHooks('afterCreate', s, {});
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(auditar.mock.calls[0][0]).toMatchObject({ transaction: txPropia, entidad: 'seguros', accion: 'CREAR', antes: null });
  });

  it('sin transacción, un fallo de auditoría no rompe la petición legacy', async () => {
    auditar.mockRejectedValue(new Error('bd caida'));
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(Seguro.runHooks('afterDestroy', existente(Seguro, { id: 3 }), {})).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('con transacción del llamador, un fallo de auditoría se propaga (rollback)', async () => {
    auditar.mockRejectedValue(new Error('bd caida'));
    await expect(Seguro.runHooks('afterDestroy', existente(Seguro, { id: 3 }), { transaction: {} })).rejects.toThrow('bd caida');
  });

  it('omite tablas con auditoría manual en transacción, pero no en autocommit', async () => {
    await Caja.runHooks('afterCreate', Caja.build({ id: 1, saldo: 0 }), { transaction: {} });
    expect(auditar).not.toHaveBeenCalled();
    await Caja.runHooks('afterCreate', Caja.build({ id: 1, saldo: 0 }), {});
    expect(auditar).toHaveBeenCalledTimes(1);
  });

  it('nunca audita tablas excluidas ni lee filas en truncate', async () => {
    await Temporal.runHooks('afterCreate', Temporal.build({ id: 1 }), {});
    expect(auditar).not.toHaveBeenCalled();
    const spy = jest.spyOn(Seguro, 'findAll');
    await Seguro.runHooks('beforeBulkDestroy', { truncate: true });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('update masivo: audita por fila solo lo que cambió, sin forzar individualHooks', async () => {
    const spy = jest.spyOn(Seguro, 'findAll')
      .mockResolvedValueOnce([{ id: 1, nombre: 'A', tasa: 7 }, { id: 2, nombre: 'B', tasa: 8 }])
      .mockResolvedValueOnce([{ id: 1, nombre: 'A', tasa: 8 }, { id: 2, nombre: 'B', tasa: 8 }]);
    const opts = { where: { tasa: 7 }, transaction: {} };
    await Seguro.runHooks('beforeBulkUpdate', opts);
    expect(opts.individualHooks).toBeUndefined();
    await Seguro.runHooks('afterBulkUpdate', opts);
    expect(auditar).toHaveBeenCalledTimes(1);
    expect(auditar.mock.calls[0][0]).toMatchObject({ entidad_id: 1, accion: 'EDITAR', antes: { tasa: 7 }, despues: { tasa: 8 } });
    spy.mockRestore();
  });

  it('destroy masivo: audita cada fila borrada con sus valores previos', async () => {
    const spy = jest.spyOn(Seguro, 'findAll').mockResolvedValueOnce([{ id: 5, nombre: 'X', tasa: 1 }]);
    const opts = { where: { id: 5 }, transaction: {} };
    await Seguro.runHooks('beforeBulkDestroy', opts);
    await Seguro.runHooks('afterBulkDestroy', opts);
    expect(auditar.mock.calls[0][0]).toMatchObject({ entidad_id: 5, accion: 'ELIMINAR', antes: { id: 5, nombre: 'X' }, despues: null });
    spy.mockRestore();
  });

  it('bulkCreate registra una fila resumen con cantidad e ids', async () => {
    const filas = [Seguro.build({ id: 1 }), Seguro.build({ id: 2 })];
    await Seguro.runHooks('afterBulkCreate', filas, { transaction: {} });
    expect(auditar.mock.calls[0][0]).toMatchObject({ accion: 'CREAR_MASIVO', despues: { cantidad: 2, ids: [1, 2] } });
  });

  it('toma el usuario de req.usuario, o del JWT de intranet si la ruta legacy no autenticó', async () => {
    await enPeticion({ usuario: { id: 9, contexto: 'acceso_trabajadores' }, ip: '1.2.3.4', headers: {} },
      () => Seguro.runHooks('afterCreate', Seguro.build({ id: 1 }), { transaction: {} }));
    expect(auditar.mock.calls[0][0]).toMatchObject({ usuario: { id: 9, contexto: 'acceso_trabajadores' }, ip: '1.2.3.4', motivo: null });

    process.env.SECRET_KEY = process.env.SECRET_KEY || 'clave-de-prueba';
    const token = jwt.sign({ id: 4, roleId: 1 }, process.env.SECRET_KEY);
    await enPeticion({ headers: { 'x-access-token': token }, ip: '5.6.7.8' },
      () => Seguro.runHooks('afterCreate', Seguro.build({ id: 1 }), { transaction: {} }));
    expect(auditar.mock.calls[1][0]).toMatchObject({ usuario: { id: 4, contexto: 'usuarios' }, motivo: null });

    await enPeticion({ headers: { 'x-access-token': 'basura' } },
      () => Seguro.runHooks('afterCreate', Seguro.build({ id: 1 }), { transaction: {} }));
    expect(auditar.mock.calls[2][0]).toMatchObject({ usuario: { id: null, contexto: 'sistema' }, motivo: 'LEGACY_SIN_TOKEN' });
  });

  it('fuera de una petición (cron) queda como sistema', async () => {
    await Seguro.runHooks('afterCreate', Seguro.build({ id: 1 }), { transaction: {} });
    expect(auditar.mock.calls[0][0]).toMatchObject({ usuario: { id: null, contexto: 'sistema' }, motivo: 'SISTEMA_SIN_REQUEST' });
  });
});
