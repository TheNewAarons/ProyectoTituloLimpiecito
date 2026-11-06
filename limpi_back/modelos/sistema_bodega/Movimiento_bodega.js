const Sequelize = require('sequelize')
const db = require('../../database/database');

const Producto = require('../sistema_base/Producto')

// RF-BOD-02: kardex de stock. Inmutable desde la app (solo INSERT, como Auditoria.js); tipos en services/bodega/constantes.js.
function prohibido() {
    throw new Error('MOVIMIENTO_BODEGA_INMUTABLE: los movimientos de bodega no se modifican ni se eliminan')
}

module.exports = db.sequelize.define(
    'movimientos_bodega',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        producto_id:{
            type: Sequelize.INTEGER,
            allowNull: false,
            references:{
                model: Producto,
                key: 'id'
            }
        },
        tipo:{
            type: Sequelize.STRING(30),
            allowNull: false
        },
        // Delta con signo aplicado al stock: salida negativa, entrada/reversa positiva (D-055)
        cantidad:{
            type: Sequelize.INTEGER,
            allowNull: false,
            validate:{
                isInt: true
            }
        },
        referencia_tipo:{
            type: Sequelize.STRING(40),
            allowNull: true
        },
        referencia_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        // Sin FK: polimórfica según contexto_usuario (D-059)
        usuario_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        contexto_usuario:{
            type: Sequelize.STRING(30),
            allowNull: false
        }
    },
    {
        tableName: 'movimientos_bodega',
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
