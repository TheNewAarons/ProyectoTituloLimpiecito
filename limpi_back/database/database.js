require('dotenv').config()
const Sequelize = require('sequelize')
const db = {}
/** BACKEND THE RIAL */
// const sequelize = new Sequelize("limpiecito_minda","root","",{
//     host: "localhost",
//     dialect: "mysql",
//     operatorsAliases: false,

//     pool: {
//         max:5,
//         min:0,
//         acquire: 30000,
//         idle: 10000
//     }
// })

/** CONEXION LOCALHOST */
// const sequelize = new Sequelize("limpiecito_minda","root","",{
//     host: "localhost",
//     dialect: "mysql",
//     operatorsAliases: false,

//     pool: {
//         max:5,
//         min:0,
//         acquire: 30000,
//         idle: 10000
//     }
// })
const sequelize = new Sequelize(process.env.DATABASE_NAME,process.env.DATABASE_USER,process.env.DATABASE_USER_PASSWORD,{
    host: process.env.DATABASE_SERVER,
    dialect: "mysql",
    operatorsAliases: false,

    pool: {
        max:5,
        min:0,
        acquire: 30000,
        idle: 10000
    }
})

db.sequelize = sequelize

module.exports = db