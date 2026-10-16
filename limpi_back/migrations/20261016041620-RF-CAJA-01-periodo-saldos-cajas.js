'use strict';

/**
 * RF-CAJA-01 — Periodo y saldos encadenados en `cajas` (TASK_PLAN §4 c; D-006).
 * MySQL hace autocommit del DDL: cada paso del up verifica antes de aplicar (idempotente/reanudable).
 * - Pre-checks ANTES de cualquier DDL (abortan sin cambios): InnoDB, cajas sin fecha_inicio,
 *   periodos duplicados.
 * - periodo CHAR(7) 'YYYY-MM' calculado desde fecha_inicio en America/Santiago (Sequelize guarda
 *   DATETIME en UTC; se usa la misma regla que el hook del modelo Caja) -> UNIQUE + NOT NULL.
 * - saldo_inicial DECIMAL(14,0) NOT NULL DEFAULT 0, saldo_final DECIMAL(14,0) NULL,
 *   saldo_provisional BOOLEAN NOT NULL DEFAULT false, cerrada_por (tipo de usuarios.id) NULL FK usuarios.
 * - cajas.estado sigue INTEGER (1 = abierta, 0 = cerrada).
 * - Backfill encadenado cronológico con total_ingreso - total_egreso congelados.
 * - down: aborta si los saldos ya no coinciden con el backfill o hay cierres nuevos (cerrada_por).
 */

const TABLA = 'cajas';
const ZONA = 'America/Santiago';
const UQ_PERIODO = 'uq_cajas_periodo';
const FK_CERRADA_POR = 'fk_cajas_cerrada_por';
const ESTADO_ABIERTA = 1;

async function seleccionar(queryInterface, Sequelize, sql, replacements, transaction) {
  return queryInterface.sequelize.query(sql, {
    replacements: replacements || {},
    type: Sequelize.QueryTypes.SELECT,
    transaction: transaction
  });
}

function periodoSantiago(valor) {
  if (valor === null || valor === undefined) return null;
  let fecha = valor;
  if (!(fecha instanceof Date)) {
    // DATETIME devuelto como string: se interpreta en UTC (zona de conexión de Sequelize por defecto)
    fecha = new Date(String(valor).replace(' ', 'T') + 'Z');
  }
  if (isNaN(fecha.getTime())) return null;
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit' })
    .formatToParts(fecha);
  const anio = partes.filter(p => p.type === 'year')[0].value;
  const mes = partes.filter(p => p.type === 'month')[0].value;
  return anio + '-' + mes;
}

function entero(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isSafeInteger(n)) throw new Error('[RF-CAJA-01] monto no entero/seguro: ' + v);
  return n;
}

/** Cadena esperada de saldos (orden cronológico por periodo). */
function cadenaEsperada(filas) {
  const ordenadas = filas.slice().sort((a, b) => (a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0));
  let acumulado = 0;
  let hayAbiertaPrevia = false;
  return ordenadas.map(f => {
    const abierta = Number(f.estado) === ESTADO_ABIERTA;
    const r = { id: f.id, periodo: f.periodo, saldo_inicial: acumulado, saldo_final: null, saldo_provisional: hayAbiertaPrevia };
    if (abierta) {
      hayAbiertaPrevia = true;
    } else {
      r.saldo_final = acumulado + entero(f.total_ingreso) - entero(f.total_egreso);
      acumulado = r.saldo_final;
    }
    return r;
  });
}

async function tipoColumnaId(queryInterface, Sequelize, tabla) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT DATA_TYPE AS dataType, COLUMN_TYPE AS columnType FROM information_schema.COLUMNS ' +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND COLUMN_NAME = 'id'",
    { tabla: tabla }
  );
  if (!filas.length) throw new Error('[RF-CAJA-01] pre-check: ' + tabla + '.id no existe');
  const porTipo = {
    tinyint: Sequelize.TINYINT,
    smallint: Sequelize.SMALLINT,
    mediumint: Sequelize.MEDIUMINT,
    int: Sequelize.INTEGER,
    bigint: Sequelize.BIGINT
  };
  const tipo = porTipo[String(filas[0].dataType).toLowerCase()];
  if (!tipo) throw new Error('[RF-CAJA-01] pre-check: tipo no soportado para ' + tabla + '.id: ' + filas[0].columnType);
  return { tipo: /unsigned/i.test(filas[0].columnType) ? tipo.UNSIGNED : tipo, descripcion: filas[0].columnType };
}

async function constraintExiste(queryInterface, Sequelize, nombre) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS ' +
      'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND CONSTRAINT_NAME = :nombre',
    { tabla: TABLA, nombre: nombre }
  );
  return Number(filas[0].n) > 0;
}

async function indiceExiste(queryInterface, nombre) {
  const indices = await queryInterface.showIndex(TABLA);
  return indices.some(i => i.name === nombre);
}

/** Periodo por caja: el ya guardado (re-ejecución) o el calculado desde fecha_inicio. */
async function periodosCalculados(queryInterface, Sequelize, tienePeriodo) {
  const filas = await seleccionar(
    queryInterface,
    Sequelize,
    'SELECT id, fecha_inicio' + (tienePeriodo ? ', periodo' : '') + ' FROM cajas ORDER BY id'
  );
  return filas.map(f => ({
    id: f.id,
    guardado: tienePeriodo ? f.periodo : null,
    periodo: (tienePeriodo && f.periodo) || periodoSantiago(f.fecha_inicio)
  }));
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Pre-checks (sin DDL todavía)
    const motores = await seleccionar(
      queryInterface,
      Sequelize,
      'SELECT TABLE_NAME AS tabla, ENGINE AS motor FROM information_schema.TABLES ' +
        'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (:tablas)',
      { tablas: [TABLA, 'usuarios'] }
    );
    const mapa = {};
    motores.forEach(m => { mapa[m.tabla] = String(m.motor).toLowerCase(); });
    [TABLA, 'usuarios'].forEach(t => {
      if (!mapa[t]) throw new Error('[RF-CAJA-01] pre-check: falta la tabla ' + t + '. Migración abortada sin cambios.');
      if (mapa[t] !== 'innodb') throw new Error('[RF-CAJA-01] pre-check: ' + t + ' no es InnoDB. Migración abortada sin cambios.');
    });
    const tipoUsuarioId = await tipoColumnaId(queryInterface, Sequelize, 'usuarios');

    let columnas = await queryInterface.describeTable(TABLA);
    const periodos = await periodosCalculados(queryInterface, Sequelize, !!columnas.periodo);

    const sinPeriodo = periodos.filter(p => !p.periodo).map(p => p.id);
    if (sinPeriodo.length) {
      throw new Error('[RF-CAJA-01] pre-check: cajas sin fecha_inicio (no se puede calcular periodo), ids: ' +
        sinPeriodo.join(',') + '. Corregir manualmente (con respaldo) y re-ejecutar. Migración abortada sin cambios.');
    }
    const porPeriodo = {};
    periodos.forEach(p => { (porPeriodo[p.periodo] = porPeriodo[p.periodo] || []).push(p.id); });
    const duplicados = Object.keys(porPeriodo).filter(k => porPeriodo[k].length > 1);
    if (duplicados.length) {
      throw new Error('[RF-CAJA-01] pre-check: periodos duplicados en cajas: ' +
        duplicados.map(k => k + ' -> ids ' + porPeriodo[k].join(',')).join(' | ') +
        '. Conciliar manualmente (con respaldo) y re-ejecutar. Migración abortada sin cambios.');
    }

    // 2. Columnas nuevas
    if (!columnas.periodo) {
      await queryInterface.addColumn(TABLA, 'periodo', { type: Sequelize.CHAR(7), allowNull: true });
    }
    if (!columnas.saldo_inicial) {
      await queryInterface.addColumn(TABLA, 'saldo_inicial', {
        type: Sequelize.DECIMAL(14, 0), allowNull: false, defaultValue: 0
      });
    }
    if (!columnas.saldo_final) {
      await queryInterface.addColumn(TABLA, 'saldo_final', { type: Sequelize.DECIMAL(14, 0), allowNull: true });
    }
    if (!columnas.saldo_provisional) {
      await queryInterface.addColumn(TABLA, 'saldo_provisional', {
        type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false
      });
    }
    if (!columnas.cerrada_por) {
      await queryInterface.addColumn(TABLA, 'cerrada_por', { type: tipoUsuarioId.tipo, allowNull: true });
    }

    // 3. Backfill de periodo (solo filas sin periodo; valores ya validados en el pre-check)
    for (const p of periodos) {
      if (!p.guardado) {
        await queryInterface.sequelize.query('UPDATE cajas SET periodo = :periodo WHERE id = :id AND periodo IS NULL', {
          replacements: { periodo: p.periodo, id: p.id }
        });
      }
    }

    // 4. UNIQUE + NOT NULL
    if (!(await indiceExiste(queryInterface, UQ_PERIODO))) {
      await queryInterface.addIndex(TABLA, ['periodo'], { name: UQ_PERIODO, unique: true });
    }
    columnas = await queryInterface.describeTable(TABLA);
    if (columnas.periodo.allowNull) {
      await queryInterface.changeColumn(TABLA, 'periodo', { type: Sequelize.CHAR(7), allowNull: false });
    }

    // 5. FK cerrada_por -> usuarios (SET NULL: no bloquea flujos actuales; el rastro queda en auditoria)
    if (!(await constraintExiste(queryInterface, Sequelize, FK_CERRADA_POR))) {
      await queryInterface.addConstraint(TABLA, ['cerrada_por'], {
        type: 'foreign key',
        name: FK_CERRADA_POR,
        references: { table: 'usuarios', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    // 6. Backfill encadenado de saldos (transacción + lock). Si ya hay cierres del servicio nuevo, no se toca.
    let actualizadas = 0;
    let omitido = false;
    await queryInterface.sequelize.transaction(async t => {
      const filas = await seleccionar(
        queryInterface,
        Sequelize,
        'SELECT id, periodo, estado, total_ingreso, total_egreso, saldo_inicial, saldo_final, saldo_provisional, cerrada_por ' +
          'FROM cajas ORDER BY periodo ASC FOR UPDATE',
        {},
        t
      );
      if (filas.some(f => f.cerrada_por !== null && f.cerrada_por !== undefined)) {
        omitido = true;
        return;
      }
      const actuales = {};
      filas.forEach(f => { actuales[f.id] = f; });
      for (const e of cadenaEsperada(filas)) {
        const a = actuales[e.id];
        const igual = Number(a.saldo_inicial) === e.saldo_inicial &&
          (a.saldo_final === null ? null : Number(a.saldo_final)) === e.saldo_final &&
          !!Number(a.saldo_provisional) === e.saldo_provisional;
        if (igual) continue;
        await queryInterface.sequelize.query(
          'UPDATE cajas SET saldo_inicial = :si, saldo_final = :sf, saldo_provisional = :sp WHERE id = :id',
          { replacements: { si: e.saldo_inicial, sf: e.saldo_final, sp: e.saldo_provisional, id: e.id }, transaction: t }
        );
        actualizadas++;
      }
    });

    const resumen = await seleccionar(
      queryInterface,
      Sequelize,
      'SELECT COUNT(*) AS total, SUM(estado = 1) AS abiertas, SUM(periodo IS NULL) AS sin_periodo, ' +
        'SUM(saldo_provisional) AS provisionales, MIN(periodo) AS desde, MAX(periodo) AS hasta FROM cajas'
    );
    const r = resumen[0];
    console.log(
      '[RF-CAJA-01] cajas total=' + Number(r.total) + ' abiertas=' + Number(r.abiertas || 0) +
        ' sin_periodo=' + Number(r.sin_periodo || 0) + ' provisionales=' + Number(r.provisionales || 0) +
        ' rango=' + (r.desde || '-') + '..' + (r.hasta || '-') + ' saldos_actualizados=' + actualizadas +
        (omitido ? ' (backfill de saldos omitido: existen cierres con cerrada_por)' : '') +
        ' | usuarios.id ' + tipoUsuarioId.descripcion
    );
  },

  down: async (queryInterface, Sequelize) => {
    const columnas = await queryInterface.describeTable(TABLA);

    // Guardas: no perder cierres hechos por el servicio nuevo ni saldos distintos del backfill
    if (columnas.cerrada_por && columnas.saldo_inicial && columnas.periodo) {
      const filas = await seleccionar(
        queryInterface,
        Sequelize,
        'SELECT id, periodo, estado, total_ingreso, total_egreso, saldo_inicial, saldo_final, saldo_provisional, cerrada_por ' +
          'FROM cajas ORDER BY periodo ASC'
      );
      const conCierre = filas.filter(f => f.cerrada_por !== null && f.cerrada_por !== undefined).map(f => f.id);
      const actuales = {};
      filas.forEach(f => { actuales[f.id] = f; });
      const distintas = filas.some(f => f.periodo === null)
        ? filas.map(f => f.id)
        : cadenaEsperada(filas).filter(e => {
          const a = actuales[e.id];
          return Number(a.saldo_inicial) !== e.saldo_inicial ||
            (a.saldo_final === null ? null : Number(a.saldo_final)) !== e.saldo_final ||
            !!Number(a.saldo_provisional) !== e.saldo_provisional;
        }).map(e => e.id);
      if (conCierre.length || distintas.length) {
        throw new Error(
          '[RF-CAJA-01] down abortado: cajas con cierre del servicio nuevo (cerrada_por) ids [' + conCierre.join(',') +
            '] o saldos distintos del backfill ids [' + distintas.join(',') + ']. Se perderían saldos/cierres; ' +
            'respaldar y conciliar manualmente primero.'
        );
      }
    }

    if (await constraintExiste(queryInterface, Sequelize, FK_CERRADA_POR)) {
      await queryInterface.removeConstraint(TABLA, FK_CERRADA_POR);
    }
    if (await indiceExiste(queryInterface, UQ_PERIODO)) {
      await queryInterface.removeIndex(TABLA, UQ_PERIODO);
    }
    const actuales = await queryInterface.describeTable(TABLA);
    const quitar = ['cerrada_por', 'saldo_provisional', 'saldo_final', 'saldo_inicial', 'periodo'];
    for (const col of quitar) {
      if (actuales[col]) await queryInterface.removeColumn(TABLA, col);
    }
  }
};
