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
        },
        // RF-BOD-06: saldos y valorización CPP (D-175, D-176). NULL en movimientos previos al SALDO_INICIAL.
        stock_anterior:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        stock_resultante:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        costo_unitario:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        },
        // Con signo, igual que cantidad
        valor_movimiento:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        },
        valor_saldo_anterior:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        },
        valor_saldo_resultante:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        },
        referencia_linea_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        motivo:{
            type: Sequelize.STRING(255),
            allowNull: true
        },
        movimiento_revertido_id:{
            type: Sequelize.INTEGER,
            allowNull: true
        },
        estado:{
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'CONFIRMADO'
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
