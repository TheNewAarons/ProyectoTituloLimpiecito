const Sequelize = require('sequelize')
const db = require('../../database/database');
const Centro = require("./Centro_costo")

module.exports = db.sequelize.define(
    'cc_ingresos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrment: true
        },
        fecha:{
            type: Sequelize.DATE
        },
        monto:{
            type: Sequelize.INTEGER
        },
        comentario:{
            type: Sequelize.STRING
        },
        tipo_documento:{
            type: Sequelize.ENUM('FACTURA', 'BOLETA', 'OTRO'),
            allowNull: true
        },
        numero_documento:{
            type: Sequelize.STRING(30),
            allowNull: true
        },
        fecha_emision:{
            type: Sequelize.DATEONLY,
            allowNull: true
        },
        fecha_vencimiento:{
            type: Sequelize.DATEONLY,
            allowNull: true
        },
        estado_pago:{
            type: Sequelize.ENUM('PENDIENTE', 'PAGADA', 'ANULADA'),
            allowNull: false,
            defaultValue: 'PAGADA'
        },
        fecha_pago:{
            type: Sequelize.DATEONLY,
            allowNull: true
        },
        centroCostoId:{
            type: Sequelize.INTEGER,
            references:{
                model: Centro,
                key:'id'
            }
        }

    },
    {
        timestamps: false
    }
)
