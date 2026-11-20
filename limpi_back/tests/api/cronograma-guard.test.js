/**
 * RF-PEV-02c (C3, escenario 2 / guard C7) — DELETE de cronograma no borra historial de cumplimiento enlazado a
 * una asignación. Router real montado como en index.js (api.use('/cronograma'), sin auth). Modelos REALES sobre
 * un Sequelize sin conexión; los métodos estáticos que se usan se espían para verificar `where` y orden de
 * borrado. Patrón: tests/api/pev.legacy-lineas.test.js.
 */
jest.mock('../../database/database', () => {
  const Sequelize = require('sequelize');
  const sequelize = new Sequelize('bd_prueba', 'u', 'p', { dialect: 'mysql', logging: false, operatorsAliases: false });
  sequelize.query = jest.fn(() => Sequelize.Promise.resolve([{ affectedRows: 1 }, 1]));
  return { sequelize: sequelize, Sequelize: Sequelize };
});
jest.mock('../../services/pev/resolverAsignacion', () => ({
  resolverAsignacion: jest.fn(async () => 40),
  asignacionDeLineaPev: jest.fn(async () => 41)
}));

const express = require('express');
const request = require('supertest');
const { Op } = require('sequelize');
const LineaCronograma = require('../../modelos/apartado_cronograma/Linea_cronograma');
const Checkeo = require('../../modelos/apartado_cronograma/checkeos');
const Cronograma = require('../../modelos/apartado_cronograma/Cronograma');
const TrabajadorCronograma = require('../../modelos/apartado_listas_pev/trabajadorCronograma');
const ListaPev = require('../../modelos/apartado_listas_pev/listaPevTrabajador');
const ListaSuper = require('../../modelos/apartado_listas_pev/listaSuperTrabajador');
const LineaPev = require('../../modelos/apartado_listas_pev/lineaListaPevTrabajador');
const LineaSuper = require('../../modelos/apartado_listas_pev/lineaSuperTrabajador');
const logica = require('../../api/apartado_cronograma/cronograma/logica');
const cronogramaRouter = require('../../api/apartado_cronograma/cronograma/routes');
const { manejadorErrores } = require('../../middleware/errores');

const MENSAJE_BLOQUEO = 'No se puede eliminar: existen líneas de cumplimiento enlazadas a una asignación.';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/cronograma', cronogramaRouter);
  app.use(manejadorErrores);
  return app;
}

// Las consultas de sequelize devuelven instancias: el controlador usa `.id` y `.dataValues.id`.
const inst = (id) => ({ id: id, dataValues: { id: id } });

const DELETE_LINEA = '/cronograma/eliminar-linea-cronograma/77/30/5/2';
const DELETE_CRONO = '/cronograma/eliminar-cronograma/5';

let espias;
let consoleLog;
beforeAll(() => { consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => consoleLog.mockRestore());

beforeEach(() => {
  espias = [
    jest.spyOn(ListaPev, 'findAll').mockResolvedValue([inst(11), inst(12)]),
    jest.spyOn(ListaSuper, 'findAll').mockResolvedValue([]),
    jest.spyOn(LineaPev, 'findOne').mockResolvedValue(null),
    jest.spyOn(LineaPev, 'destroy').mockResolvedValue(1),
    jest.spyOn(LineaSuper, 'findOne').mockResolvedValue(null),
    jest.spyOn(LineaSuper, 'destroy').mockResolvedValue(1),
    jest.spyOn(LineaCronograma, 'destroy').mockResolvedValue(1),
    jest.spyOn(LineaCronograma, 'findAll').mockResolvedValue([]),
    jest.spyOn(Checkeo, 'destroy').mockResolvedValue(1),
    jest.spyOn(TrabajadorCronograma, 'destroy').mockResolvedValue(1),
    jest.spyOn(ListaPev, 'destroy').mockResolvedValue(1),
    jest.spyOn(ListaSuper, 'destroy').mockResolvedValue(1),
    jest.spyOn(Cronograma, 'destroy').mockResolvedValue(1)
  ];
});
afterEach(() => {
  espias.forEach((e) => e.mockRestore());
});

describe('DELETE eliminar-linea-cronograma (guard C7 con marca PEV)', () => {
  it('con marca en la tarea: 200 {estado:false, mensaje} y no borra línea de cronograma ni líneas de lista', async () => {
    LineaPev.findOne.mockResolvedValue({ id: 900 });
    const res = await request(buildApp()).delete(DELETE_LINEA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: false, mensaje: MENSAJE_BLOQUEO });
    expect(LineaCronograma.destroy).not.toHaveBeenCalled();
    expect(LineaPev.destroy).not.toHaveBeenCalled();
  });

  it('filtro del guard: listas del sector (IN), asignacionId no nulo, marca en check u hora, tareaId de la ruta', async () => {
    LineaPev.findOne.mockResolvedValue({ id: 900 });
    await request(buildApp()).delete(DELETE_LINEA);
    expect(ListaPev.findAll).toHaveBeenCalledWith({ include: { model: ListaSuper }, where: { cronogramaId: '5', sectoreId: '2', estado: 1 } });
    expect(LineaPev.findOne).toHaveBeenCalledTimes(1);
    const where = LineaPev.findOne.mock.calls[0][0].where;
    expect(where.asignacionId).toEqual({ [Op.ne]: null });
    expect(where.listasPevTrabajadoreId).toEqual({ [Op.in]: [11, 12] });
    expect(where.tareaId).toBe('30');
    expect(where[Op.or]).toEqual(expect.arrayContaining([
      { check_trabajador_1: 1 },
      { check_trabajador_3: 1 },
      { hora_check_trabajador_2: { [Op.ne]: null } },
      { observaciones: { [Op.notIn]: [''] } }
    ]));
  });

  it('marca en OTRA tarea del mismo sector no bloquea: se borra como antes', async () => {
    LineaPev.findOne.mockImplementation(async (o) => (o.where.tareaId === '31' ? { id: 1 } : null));
    const res = await request(buildApp()).delete(DELETE_LINEA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ filas: 1 });
    expect(LineaCronograma.destroy).toHaveBeenCalledWith({ where: { id: '77' } });
    expect(LineaPev.destroy).toHaveBeenCalledWith({ where: { listasPevTrabajadoreId: 11, tareaId: '30' } });
    expect(LineaPev.destroy).toHaveBeenCalledWith({ where: { listasPevTrabajadoreId: 12, tareaId: '30' } });
  });

  it('sin marcas: borra la línea de cronograma y las líneas PEV de la tarea en cada lista', async () => {
    const res = await request(buildApp()).delete(DELETE_LINEA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ filas: 1 });
    expect(LineaCronograma.destroy).toHaveBeenCalledWith({ where: { id: '77' } });
    expect(LineaPev.destroy).toHaveBeenCalledTimes(2);
  });

  it('sector sin listas: no consulta el guard y borra igual la línea de cronograma', async () => {
    ListaPev.findAll.mockResolvedValueOnce([]);
    const res = await request(buildApp()).delete(DELETE_LINEA);
    expect(res.status).toBe(200);
    expect(LineaPev.findOne).not.toHaveBeenCalled();
    expect(LineaCronograma.destroy).toHaveBeenCalledTimes(1);
    expect(LineaPev.destroy).not.toHaveBeenCalled();
  });

  it('si la consulta del guard falla: 500 y no borra nada (fail closed)', async () => {
    LineaPev.findOne.mockRejectedValue(new Error('conexion perdida'));
    const res = await request(buildApp()).delete(DELETE_LINEA);
    expect(res.status).toBe(500);
    expect(LineaCronograma.destroy).not.toHaveBeenCalled();
    expect(LineaPev.destroy).not.toHaveBeenCalled();
  });
});

describe('DELETE eliminar-cronograma (guard C7 incluye supervisor)', () => {
  it('marca en línea PEV: 200 {estado:false} y no borra cronograma, listas ni trabajadores', async () => {
    LineaPev.findOne.mockResolvedValue({ id: 900 });
    const res = await request(buildApp()).delete(DELETE_CRONO);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: false, mensaje: MENSAJE_BLOQUEO });
    expect(Cronograma.destroy).not.toHaveBeenCalled();
    expect(ListaPev.destroy).not.toHaveBeenCalled();
    expect(TrabajadorCronograma.destroy).not.toHaveBeenCalled();
    expect(LineaCronograma.destroy).not.toHaveBeenCalled();
  });

  it('marca sólo en línea de supervisor: también bloquea (incluirSupervisor)', async () => {
    ListaSuper.findAll.mockResolvedValue([inst(21)]);
    LineaSuper.findOne.mockResolvedValue({ id: 950 });
    const res = await request(buildApp()).delete(DELETE_CRONO);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: false, mensaje: MENSAJE_BLOQUEO });
    expect(ListaSuper.findAll).toHaveBeenCalledWith({ attributes: ['id'], where: { listasPevTrabajadoreId: { [Op.in]: [11, 12] } } });
    const where = LineaSuper.findOne.mock.calls[0][0].where;
    expect(where.asignacionId).toEqual({ [Op.ne]: null });
    expect(where.listasSuperTrabajadoreId).toEqual({ [Op.in]: [21] });
    expect(where[Op.or]).toEqual(expect.arrayContaining([{ hora_1: { [Op.ne]: null } }, { despolvado_1: 1 }, { observaciones: { [Op.notIn]: [''] } }]));
    expect(Cronograma.destroy).not.toHaveBeenCalled();
    expect(ListaSuper.destroy).not.toHaveBeenCalled();
  });

  it('sin marcas: cascada completa en orden y forma de respuesta intacta', async () => {
    LineaCronograma.findAll.mockResolvedValue([inst(70), inst(71)]);
    const res = await request(buildApp()).delete(DELETE_CRONO);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([
      'res_eliminar_cronograma', 'res_eliminar_linea_cronograma', 'res_eliminar_listas_pev',
      'res_eliminar_trabajador_cronograma', 'res_obt_lineas_cronograma', 'res_obt_listas_pev'
    ]);
    expect(TrabajadorCronograma.destroy).toHaveBeenCalledWith({ where: { cronogramaId: '5' } });
    expect(Checkeo.destroy.mock.calls.map((c) => c[0].where)).toEqual([{ lineaCronogramaId: 70 }, { lineaCronogramaId: 71 }]);
    expect(LineaCronograma.destroy).toHaveBeenCalledWith({ where: { cronogramaId: '5' } });
    expect(LineaPev.destroy).toHaveBeenCalledWith({ where: { listasPevTrabajadoreId: 11 } });
    expect(LineaPev.destroy).toHaveBeenCalledWith({ where: { listasPevTrabajadoreId: 12 } });
    expect(ListaPev.destroy).toHaveBeenCalledWith({ where: { cronogramaId: '5' } });
    expect(Cronograma.destroy).toHaveBeenCalledWith({ where: { id: '5' } });
    // Orden: trabajadores -> checkeos -> líneas de cronograma -> líneas de listas -> listas -> cronograma.
    const orden = (m) => m.mock.invocationCallOrder[0];
    expect(orden(TrabajadorCronograma.destroy)).toBeLessThan(orden(LineaCronograma.destroy));
    expect(orden(LineaCronograma.destroy)).toBeLessThan(orden(LineaPev.destroy));
    expect(orden(LineaPev.destroy)).toBeLessThan(orden(ListaPev.destroy));
    expect(orden(ListaPev.destroy)).toBeLessThan(orden(Cronograma.destroy));
  });

  it('sin listas PEV: no ejecuta el guard ni la cascada de listas y borra el cronograma', async () => {
    ListaPev.findAll.mockResolvedValueOnce([]);
    const res = await request(buildApp()).delete(DELETE_CRONO);
    expect(res.status).toBe(200);
    expect(LineaPev.findOne).not.toHaveBeenCalled();
    expect(ListaSuper.findAll).not.toHaveBeenCalled();
    expect(ListaPev.destroy).toHaveBeenCalledWith({ where: { cronogramaId: '5' } });
    expect(Cronograma.destroy).toHaveBeenCalledWith({ where: { id: '5' } });
  });

  it('si la consulta del guard falla: 500 y no borra nada (fail closed)', async () => {
    LineaPev.findOne.mockRejectedValue(new Error('conexion perdida'));
    const res = await request(buildApp()).delete(DELETE_CRONO);
    expect(res.status).toBe(500);
    expect(TrabajadorCronograma.destroy).not.toHaveBeenCalled();
    expect(Cronograma.destroy).not.toHaveBeenCalled();
  });
});

describe('hayLineasConMarcaAsignacion (función exportada)', () => {
  it('lista de ids vacía: false sin ninguna consulta', async () => {
    await expect(logica.hayLineasConMarcaAsignacion([], { incluirSupervisor: true })).resolves.toBe(false);
    expect(LineaPev.findOne).not.toHaveBeenCalled();
    expect(ListaSuper.findAll).not.toHaveBeenCalled();
  });

  it('sin tareaId en opciones: el filtro no acota por tarea', async () => {
    await logica.hayLineasConMarcaAsignacion([11]);
    expect(LineaPev.findOne.mock.calls[0][0].where).not.toHaveProperty('tareaId');
  });

  it('sin incluirSupervisor: no consulta líneas de supervisor aunque no haya marca PEV', async () => {
    await expect(logica.hayLineasConMarcaAsignacion([11])).resolves.toBe(false);
    expect(ListaSuper.findAll).not.toHaveBeenCalled();
    expect(LineaSuper.findOne).not.toHaveBeenCalled();
  });
});
