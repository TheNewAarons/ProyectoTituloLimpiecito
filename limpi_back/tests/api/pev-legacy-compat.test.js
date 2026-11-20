/**
 * RF-PEV-02c (C3, escenario 3) — La intranet legacy escribe marcas de cumplimiento SIN token y la app laboral
 * las ve como marcadas. Capa HTTP real de /cliente-trabajador (sin auth, como en index.js) con modelos REALES
 * sobre un Sequelize sin conexión: `query` simulado captura el SQL. La regla de dual-read y de lock está en
 * tests/services/pev/cumplimiento.test.js; aquí se verifica el contrato HTTP de la ruta legacy y que el SQL
 * sólo escribe columnas de la lista blanca (tareaId/asignacionId/FK del body no llegan al UPDATE).
 */
jest.mock('../../database/database', () => {
  const Sequelize = require('sequelize');
  const sequelize = new Sequelize('bd_prueba', 'u', 'p', { dialect: 'mysql', logging: false, operatorsAliases: false });
  // Bluebird: los modelos encadenan .tap() sobre las promesas de query.
  sequelize.query = jest.fn(() => Sequelize.Promise.resolve([{ affectedRows: 1 }, 1]));
  return { sequelize: sequelize, Sequelize: Sequelize };
});
jest.mock('../../services/pev/resolverAsignacion', () => ({
  resolverAsignacion: jest.fn(async () => 40),
  asignacionDeLineaPev: jest.fn(async () => 41)
}));

const express = require('express');
const request = require('supertest');
const db = require('../../database/database');
const clientesTrabajador = require('../../api/sistema_intranet/clientes-trabajador/routes');
const { manejadorErrores } = require('../../middleware/errores');

// Igual que index.js: api.use('/cliente-trabajador', ClienteTrabajador) sin autenticar.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/cliente-trabajador', clientesTrabajador);
  app.use(manejadorErrores);
  return app;
}

// Parte SET del UPDATE (antes del WHERE): ahí están las columnas que Sequelize escribe.
function setDelUltimoUpdate() {
  const llamadas = db.sequelize.query.mock.calls;
  const sql = String(llamadas[llamadas.length - 1][0]);
  return sql.split(/\sWHERE\s/)[0];
}

const PROHIBIDOS_PEV = { tareaId: 9, asignacionId: 5, listasPevTrabajadoreId: 3 };
const PROHIBIDOS_SUPER = { tareaId: 9, asignacionId: 5, listasSuperTrabajadoreId: 3 };

let consoleLog;
beforeAll(() => { consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => consoleLog.mockRestore());
beforeEach(() => db.sequelize.query.mockClear());

describe('PUT /cliente-trabajador/actualizar-linea-lista-pev/:id sin token', () => {
  it('responde 200 sin cabecera x-access-token y con las tres claves exactas', async () => {
    const res = await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-pev/50')
      .send({ linea_lista_pev: Object.assign({ check_trabajador_1: 1, hora_check_trabajador_1: '10:00:00', observaciones: 'ok' }, PROHIBIDOS_PEV) });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['estado', 'linea_lista_pev', 'mensaje']);
    expect(res.body.estado).toBe(true);
    expect(res.body.mensaje).toBe('Datos Actualizada');
  });

  it('el UPDATE escribe check, hora y observaciones, y ninguna columna de tarea/asignacion/lista', async () => {
    await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-pev/50')
      .send({ linea_lista_pev: Object.assign({ check_trabajador_1: 1, hora_check_trabajador_1: '10:00:00', observaciones: 'ok' }, PROHIBIDOS_PEV) });
    const set = setDelUltimoUpdate();
    expect(set).toMatch(/check_trabajador_1/);
    expect(set).toMatch(/hora_check_trabajador_1/);
    expect(set).toMatch(/observaciones/);
    expect(set).not.toMatch(/tarea/i);
    expect(set).not.toMatch(/asignacion/i);
    expect(set).not.toMatch(/listas_?pev/i);
  });

  it('marca de paso escrita por legacy (check + hora) queda persistida tal cual, sin token', async () => {
    await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-pev/50')
      .send({ linea_lista_pev: { check_trabajador_2: 1, hora_check_trabajador_2: '09:15:00' } });
    const set = setDelUltimoUpdate();
    expect(set).toMatch(/check_trabajador_2/);
    expect(set).toMatch(/09:15:00/);
  });
});

describe('PUT /cliente-trabajador/actualizar-linea-lista-supervisor/:id sin token', () => {
  it('responde 200 con claves exactas y escribe sólo campos de la lista blanca', async () => {
    const res = await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-supervisor/60')
      .send({ linea_lista_supervisor: Object.assign({ despolvado_1: 1, hora_1: '09:00:00', observaciones: 'listo' }, PROHIBIDOS_SUPER) });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['cant_afectado', 'estado', 'mensaje']);
    expect(res.body.estado).toBe(true);
    const set = setDelUltimoUpdate();
    expect(set).toMatch(/despolvado_1/);
    expect(set).toMatch(/hora_1/);
    expect(set).not.toMatch(/tarea/i);
    expect(set).not.toMatch(/asignacion/i);
    expect(set).not.toMatch(/listas_?super/i);
  });
});

describe('sin campos editables (no-op)', () => {
  it('body sólo con claves prohibidas no emite UPDATE y responde 200', async () => {
    const res = await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-pev/50')
      .send({ linea_lista_pev: PROHIBIDOS_PEV });
    expect(res.status).toBe(200);
    expect(db.sequelize.query).not.toHaveBeenCalled();
  });

  // Contrato histórico: Model.update() siempre devuelve [n] (truthy), así que el legacy responde estado:true
  // incluso sin filas afectadas. El no-op de 02b devuelve [0] con el mismo shape para no cambiar la respuesta.
  it('no-op sin campos editables conserva la respuesta legacy (estado:true, [0])', async () => {
    const res = await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-pev/50')
      .send({ linea_lista_pev: PROHIBIDOS_PEV });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe(true);
    expect(res.body.linea_lista_pev).toEqual([0]);
  });

  it('body sin la clave linea_lista_pev: responde 500 y no escribe (sin validación de entrada, legado)', async () => {
    // shortcut: la ruta legacy no valida el body y falla con TypeError en `in`; upgrade: 400 CAMPO_INVALIDO.
    const res = await request(buildApp())
      .put('/cliente-trabajador/actualizar-linea-lista-pev/50')
      .send({});
    expect(res.status).toBe(500);
    expect(db.sequelize.query).not.toHaveBeenCalled();
  });
});
