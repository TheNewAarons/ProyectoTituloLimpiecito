const Sequelize = require('sequelize')
const db = require('../../database/database');

module.exports = db.sequelize.define(
    'dato_facturas',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        rut_empresa:{
            type: Sequelize.STRING
        },
        tipo_compra:{
            type: Sequelize.STRING
        },
        razon_social:{
            type: Sequelize.STRING
        },
        telefono:{
            type: Sequelize.INTEGER
        },
        correo:{
            type: Sequelize.STRING
        },
        direccion:{
            type: Sequelize.STRING
        },
        giro:{
            type: Sequelize.STRING
        },
        pais:{
            type: Sequelize.STRING
        },
        comuna:{
            type: Sequelize.STRING
        },
        ciudad:{
            type: Sequelize.STRING
        },
        rut_solicitante:{
            type: Sequelize.STRING
        },
        clienteId:{
            type:Sequelize.INTEGER,
            references:{
                model:Cliente,
                key:'id'
            }
        }

    },
    {
        timestamps: false
    }
)
