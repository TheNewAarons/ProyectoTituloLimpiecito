const Sequelize = require('sequelize')
const db = require('../../database/database');

/**
 * RNF-SEC-02: rastro de auditoría (tabla `auditoria`, migración 20261016040734).
 * Inmutable desde la app: solo INSERT. Usar el servicio services/auditoria (auditar()), siempre
 * dentro de la transacción del llamador. valores_antes/valores_despues se guardan como JSON.stringify(...)
 * (la columna es JSON o MEDIUMTEXT según el motor).
 */
function prohibido() {
    throw new Error('AUDITORIA_INMUTABLE: los registros de auditoria no se modifican ni se eliminan')
}

module.exports = db.sequelize.define(
    'auditoria',
    {
        id:{
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        // Sin FK: polimórfica según contexto_usuario; NULL para cron/sistema
        usuario_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        contexto_usuario:{
            type: Sequelize.STRING(30),
            allowNull: false
        },
        entidad:{
            type: Sequelize.STRING(60),
            allowNull: false
        },
        entidad_id:{
            type: Sequelize.STRING(64),
            allowNull: true
        },
        accion:{
            type: Sequelize.STRING(40),
            allowNull: false
        },
        valores_antes:{
            type: Sequelize.TEXT('medium'),
            allowNull: true
        },
        valores_despues:{
            type: Sequelize.TEXT('medium'),
            allowNull: true
        },
        motivo:{
            type: Sequelize.STRING(500),
            allowNull: true
        },
        ip:{
            type: Sequelize.STRING(45),
            allowNull: true
        }
    },
    {
        tableName: 'auditoria',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        hooks:{
            beforeUpdate: prohibido,
            beforeDestroy: prohibido,
            beforeBulkUpdate: prohibido,
            beforeBulkDestroy: prohibido
        }
    }
)
