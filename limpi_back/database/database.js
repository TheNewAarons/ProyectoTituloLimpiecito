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

 /** NUEVA CONEXION DE PRUEBA */
//  const sequelize = new Sequelize('mysql://waliexc1_limpiecito01:pruebalimpiecito@waliex.com:3306/waliexc1_limpiecito_prueba');

/** CONEXION LOCALHOST */
// const sequelize = new Sequelize("limpiecito_minda_v3","aseo_limpiecito","Limpiecito_aseo09",{
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
/** CONEXION DATABASE LIMPIECITO PRUEBA */
// const sequelize = new Sequelize("aseolimp_prueba","aseolimp_prueba_user","aseolimp_123456",{
//     host: "aseolimpiecito.cl",
//     dialect: "mysql",
//     operatorsAliases: false,

//     pool: {
//         max:5,
//         min:0,
//         acquire: 30000,
//         idle: 10000
//     }
// })

 /** NUEVA CONEXION DE PRUEBA */
//  const sequelize = new Sequelize('mysql://waliexc1_limpiecito01:pruebalimpiecito@waliex.com:3306/waliexc1_limpiecito_prueba');

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