/**
 * RF-PEV-02b (B3 + dual-write) — logica legacy de líneas PEV/supervisor con los modelos REALES sobre un Sequelize
 * sin conexión (`query` simulado captura el SQL). Verifica la lista blanca `fields` de los update legacy
 * (tareaId/FK/asignacionId del body no se escriben) y que la propagación del cronograma inserta asignacionId.
 */
jest.mock('../../database/database', () => {
  const Sequelize = require('sequelize');
  const sequelize = new Sequelize('bd_prueba', 'u', 'p', { dialect: 'mysql', logging: false, operatorsAliases: false });
  // Bluebird: Model.create encadena .tap()
  sequelize.query = jest.fn(() => Sequelize.Promise.resolve([{ affectedRows: 1 }, 1]));
  return { sequelize: sequelize, Sequelize: Sequelize };
});
jest.mock('../../services/pev/resolverAsignacion', () => ({
  resolverAsignacion: jest.fn(async () => 40),
  asignacionDeLineaPev: jest.fn(async () => 41)
}));

const db = require('../../database/database');
const resolver = require('../../services/pev/resolverAsignacion');
const listaPev = require('../../api/apartado_listas_pev/lista_pev_trabajador/logica');
const listaSuper = require('../../api/apartado_listas_pev/lista_super_trabajador/logica');
const intranet = require('../../api/sistema_intranet/clientes-trabajador/logica');
const cronograma = require('../../api/apartado_cronograma/cronograma/logica');

const prohibidos = { id: 99, tareaId: 5, asignacionId: 3, listasPevTrabajadoreId: 8, listasSuperTrabajadoreId: 8 };

function ultimoSql() {
  const llamadas = db.sequelize.query.mock.calls;
  return String(llamadas[llamadas.length - 1][0]);
}

beforeEach(() => db.sequelize.query.mockClear());

describe('update legacy con lista blanca fields', () => {
  test.each([
    ['lista_pev_trabajador', () => listaPev.actualizarLineaListaPevTrabajadorDB],
    ['clientes-trabajador', () => intranet.actualizarLineaListaPevTrabajadorDB]
  ])('línea PEV (%s): actualiza checks y observaciones, ignora tareaId/asignacionId/FK', async (_n, fn) => {
    await fn()(1, Object.assign({ check_trabajador_1: 1, hora_check_trabajador_1: '10:00:00', observaciones: 'ok' }, prohibidos));
    const sql = ultimoSql();
    expect(sql).toMatch(/^UPDATE `linea_lista_pev_trabajadores` SET/);
    expect(sql).toMatch(/`check_trabajador_1`=1/);
    expect(sql).toMatch(/`observaciones`='ok'/);
    expect(sql).not.toMatch(/tareaId|asignacionId|listasPevTrabajadoreId|`id`=99/);
    expect(sql).toMatch(/WHERE `id` = 1$/);
  });

  test.each([
    ['lista_super_trabajador', () => listaSuper.actualizarLineaListaSuperTrabajadorDB],
    ['clientes-trabajador', () => intranet.actualizarLineaListaSuperTrabajadorDB]
  ])('línea supervisor (%s): actualiza pasos y observaciones, ignora tareaId/asignacionId/FK', async (_n, fn) => {
    await fn()(1, Object.assign({ hora_2: '11:00:00', despolvado_3: 1, abrillantado_1: 0, observaciones: 'x' }, prohibidos));
    const sql = ultimoSql();
    expect(sql).toMatch(/^UPDATE `linea_lista_super_trabajadores` SET/);
    expect(sql).toMatch(/`hora_2`='11:00:00'/);
    expect(sql).toMatch(/`despolvado_3`=1/);
    expect(sql).not.toMatch(/tareaId|asignacionId|listasSuperTrabajadoreId|`id`=99/);
  });
});

describe('dual-write en la propagación del cronograma', () => {
  const LineaPev = require('../../modelos/apartado_listas_pev/lineaListaPevTrabajador');
  const LineaSuper = require('../../modelos/apartado_listas_pev/lineaSuperTrabajador');
  afterEach(() => jest.restoreAllMocks());

  test('crearLineaListaPevDB inserta el asignacionId resuelto desde la lista', async () => {
    const create = jest.spyOn(LineaPev, 'create').mockResolvedValue({ id: 1 });
    await cronograma.crearLineaListaPevDB(7, 9);
    expect(resolver.resolverAsignacion).toHaveBeenCalledWith({ tareaId: 7, listaPevId: 9 });
    expect(create.mock.calls[0][0]).toMatchObject({ tareaId: 7, listasPevTrabajadoreId: 9, asignacionId: 40 });
  });

  test('crearLineaListaSuperDB copia el asignacionId de la línea PEV', async () => {
    const create = jest.spyOn(LineaSuper, 'create').mockResolvedValue({ id: 1 });
    await cronograma.crearLineaListaSuperDB(7, 5);
    expect(resolver.asignacionDeLineaPev).toHaveBeenCalledWith({ tareaId: 7, listaSuperId: 5 });
    expect(create.mock.calls[0][0]).toMatchObject({ tareaId: 7, listasSuperTrabajadoreId: 5, asignacionId: 41 });
  });

  test('los atributos asignacionId existen en ambos modelos (B3)', () => {
    expect(LineaPev.rawAttributes.asignacionId).toBeDefined();
    expect(LineaSuper.rawAttributes.asignacionId).toBeDefined();
  });
});
