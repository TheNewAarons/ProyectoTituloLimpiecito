const Sequelize = require('sequelize')
const db = require('../../database/database');

const Usuario = require("./Usuario")
const Caja = require("./Caja")

module.exports = db.sequelize.define(
    'egresos',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        monto:{
            type: Sequelize.INTEGER,
        },
        comentario:{
            type: Sequelize.STRING,
        },
        fecha:{
            type: Sequelize.DATE,
        },
        estado:{
            type: Sequelize.INTEGER,
        },
        tipo:{
            type: Sequelize.INTEGER,
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
        usuarioId:{
            type: Sequelize.INTEGER,
            references:{
                model:Usuario,
                key:'id'
            }
        },
        cajaId:{
            type: Sequelize.INTEGER,
            references:{
                model:Caja,
                key:'id'
            }
        }
    },
    {
        timestamps:false
    }
)