const Sequelize = require('sequelize')
const db = require("../../database/database.js")

const Role = require("./Role")

module.exports = db.sequelize.define(
    'usuarios',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type: Sequelize.STRING
        },
        apellido:{
            type: Sequelize.STRING
        },
        password:{
            type: Sequelize.STRING
        },
        correo:{
            type: Sequelize.STRING
        },
        rut:{
            type: Sequelize.STRING
        },
        estado:{
            type: Sequelize.INTEGER
        },
        roleId:{
            type: Sequelize.INTEGER,
            references:{
                model: Role,
                key:'id'
            }
        }
    },
    {
        timestamps: false
    }
)