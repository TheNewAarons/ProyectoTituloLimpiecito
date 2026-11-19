'use strict';

/**
 * RF-PEV-02b — Migración 20261117055508 (wrapper fino sobre services/pev/backfill.js) con
 * queryInterface simulado (sin BD), patrón tests/migraciones/pev-02a-esquema.test.js.
 * Foco: up crea pev_backfill_log y delega en backfill.aplicar; down delega en backfill.revertir
 * y este elimina la tabla; up es idempotente (segunda corrida sin cambios).
 */
jest.mock('../../services/pev/backfill');

const backfill = require('../../services/pev/backfill');
const migracion = require('../../migrations/20261117055508-RF-PEV-02b-backfill-asignaciones');

const { falsoSequelize, fixturesMigradas } = require('../services/pev/falsoSequelize');

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('delegación (backfill mockeado)', () => {
  test('up llama backfill.aplicar con queryInterface.sequelize y loguea el resumen', async () => {
    backfill.aplicar.mockResolvedValue({ lote: 1, filas_log: 21, resumen: { ok: true } });
    const qi = { sequelize: { marca: 'sequelize-del-queryInterface' } };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await migracion.up(qi, {});
    expect(backfill.aplicar).toHaveBeenCalledTimes(1);
    expect(backfill.aplicar).toHaveBeenCalledWith(qi.sequelize);
    expect(console.log.mock.calls[0][0]).toMatch(/^\[RF-PEV-02b\] up lote=1 filas_log=21 /);
    expect(backfill.revertir).not.toHaveBeenCalled();
  });

  test('down llama backfill.revertir con queryInterface.sequelize', async () => {
    backfill.revertir.mockResolvedValue({ revertido: true, filas_log: 21 });
    const qi = { sequelize: { marca: 'sequelize-del-queryInterface' } };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await migracion.down(qi, {});
    expect(backfill.revertir).toHaveBeenCalledTimes(1);
    expect(backfill.revertir).toHaveBeenCalledWith(qi.sequelize);
    expect(console.log.mock.calls[0][0]).toMatch(/^\[RF-PEV-02b\] down /);
    expect(backfill.aplicar).not.toHaveBeenCalled();
  });
});

describe('integración con backfill real (sequelize simulado)', () => {
  // Re-importa el módulo real sin el mock para estos casos.
  const real = jest.requireActual('../../services/pev/backfill');

  test('up: lo primero es CREATE TABLE IF NOT EXISTS pev_backfill_log (autocommit, fuera de la transacción)', async () => {
    const seq = falsoSequelize(fixturesMigradas());
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await real.aplicar(seq);
    expect(seq.calls[0]).toMatch(/^CREATE TABLE IF NOT EXISTS `pev_backfill_log`/);
    expect(seq.transaction).toHaveBeenCalledTimes(1);
  });

  test('up idempotente: segunda corrida con datos ya migrados no inserta en el log ni audita', async () => {
    const seq = falsoSequelize(fixturesMigradas(), { maxLote: 1 });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const r = await real.aplicar(seq);
    expect(r.filas_log).toBe(0);
    expect(seq.calls.filter((s) => /^INSERT INTO `pev_backfill_log`/.test(s)).length).toBe(0);
    expect(seq.calls.filter((s) => /^INSERT INTO auditoria /.test(s)).length).toBe(0);
  });

  test('down: revertir desenlaza/borra según el log y elimina la tabla pev_backfill_log', async () => {
    const dropTable = jest.fn(async () => {});
    const seq = falsoSequelize({}, { logExiste: true, maxLote: 1, filasLog: 21, updateCount: 5, deleteCount: 2, dropTable: dropTable });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const r = await real.revertir(seq);
    expect(r.revertido).toBe(true);
    expect(seq.calls).toContain('DELETE FROM `pev_backfill_log`');
    expect(dropTable).toHaveBeenCalledWith('pev_backfill_log');
  });
});
