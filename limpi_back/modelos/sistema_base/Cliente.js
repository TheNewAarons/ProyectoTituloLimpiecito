const Sequelize = require('sequelize')
const db = require('../../database/database');


module.exports = db.sequelize.define(
    'clientes',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement:true
        },
        representante:{
            type: Sequelize.STRING
        },
        encargado_contrato:{
            type: Sequelize.STRING
        },
        fecha_facturacion:{
            type: Sequelize.DATE
        },
        fecha_inicio_contrato:{
            type: Sequelize.DATE
        },
        fecha_termino_contrato:{
            type: Sequelize.DATE
        },
        cant_trabajadores:{
            type: Sequelize.INTEGER,
        },
        correo_encargado:{
            type: Sequelize.STRING
        },
        numero_contacto:{
            type: Sequelize.INTEGER,
        },
        valor_factura:{
            type: Sequelize.INTEGER,
        },
        otra_informacion:{
            type: Sequelize.STRING
        },
        estado:{
            type: Sequelize.INTEGER
        }
    },
    {
        timestamps: false
    }
)
