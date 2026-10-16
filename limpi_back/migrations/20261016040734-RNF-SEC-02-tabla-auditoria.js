'use strict';

/**
 * RNF-SEC-02 — Tabla genérica `auditoria` (TASK_PLAN §3 y §4 b; D-009).
 * - up: idempotente. Detecta la versión del motor: MariaDB o MySQL < 5.7.8 -> MEDIUMTEXT; si no -> JSON.
 *   auditar() siempre guarda JSON.stringify(...), válido para ambos tipos.
 * - down: aborta si la tabla tiene filas (el rastro de auditoría no se destruye desde una migración).
 *   Rollback con datos: renombrar manualmente a auditoria_bak_<fecha> tras respaldo (decisión humana).
 */

const TABLA = 'auditoria';

const INDICES = [
  { name: 'idx_auditoria_entidad', fields: ['entidad', 'entidad_id'] },
  { name: 'idx_auditoria_usuario', fields: ['contexto_usuario', 'usuario_id', 'created_at'] },
  { name: 'idx_auditoria_created_at', fields: ['created_at'] }
];

function versionSoportaJson(version) {
  if (/mariadb/i.test(version)) return false;
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) return false; // versión desconocida: opción conservadora (MEDIUMTEXT)
  const v = [Number(m[1]), Number(m[2]), Number(m[3])];
  const min = [5, 7, 8];
  for (let i = 0; i < 3; i++) {
    if (v[i] > min[i]) return true;
    if (v[i] < min[i]) return false;
  }
  return true;
}

async function tablaExiste(queryInterface, Sequelize) {
  const filas = await queryInterface.sequelize.query(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla',
    { replacements: { tabla: TABLA }, type: Sequelize.QueryTypes.SELECT }
  );
  return Number(filas[0].n) > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const filasVersion = await queryInterface.sequelize.query('SELECT VERSION() AS v', {
      type: Sequelize.QueryTypes.SELECT
    });
    const version = String(filasVersion[0].v);
    const usaJson = versionSoportaJson(version);
    const tipoValores = usaJson ? Sequelize.JSON : Sequelize.TEXT('medium');

    if (!(await tablaExiste(queryInterface, Sequelize))) {
      await queryInterface.createTable(
        TABLA,
        {
          id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
          // Sin FK: polimórfica según contexto_usuario; NULL para cron/sistema
          usuario_id: { type: Sequelize.INTEGER, allowNull: true },
          contexto_usuario: { type: Sequelize.STRING(30), allowNull: false },
          entidad: { type: Sequelize.STRING(60), allowNull: false },
          entidad_id: { type: Sequelize.STRING(64), allowNull: true },
          accion: { type: Sequelize.STRING(40), allowNull: false },
          valores_antes: { type: tipoValores, allowNull: true },
          valores_despues: { type: tipoValores, allowNull: true },
          motivo: { type: Sequelize.STRING(500), allowNull: true },
          ip: { type: Sequelize.STRING(45), allowNull: true },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        },
        { engine: 'InnoDB', charset: 'utf8mb4' }
      );
    }

    const existentes = (await queryInterface.showIndex(TABLA)).map(i => i.name);
    for (const indice of INDICES) {
      if (existentes.indexOf(indice.name) === -1) {
        await queryInterface.addIndex(TABLA, indice.fields, { name: indice.name });
      }
    }

    console.log('[RNF-SEC-02] tabla auditoria lista (motor ' + version + ', valores ' + (usaJson ? 'JSON' : 'MEDIUMTEXT') + ')');
  },

  down: async (queryInterface, Sequelize) => {
    if (!(await tablaExiste(queryInterface, Sequelize))) return;

    const filas = await queryInterface.sequelize.query('SELECT COUNT(*) AS n FROM auditoria', {
      type: Sequelize.QueryTypes.SELECT
    });
    const n = Number(filas[0].n);
    if (n > 0) {
      throw new Error(
        '[RNF-SEC-02] down abortado: auditoria tiene ' + n + ' filas. Respaldar y renombrar ' +
        'manualmente a auditoria_bak_<fecha> (decisión humana); la migración no destruye rastro de auditoría.'
      );
    }
    await queryInterface.dropTable(TABLA);
  }
};
