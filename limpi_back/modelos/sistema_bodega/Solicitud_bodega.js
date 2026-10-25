const Sequelize = require('sequelize')
const db = require('../../database/database');

const Trabajadore = require('../sistema_base/Trabajadore')
const Usuario = require('../sistema_base/Usuario')
const Centro_costo = require('../sistema_base/Centro_costo')

// RF-BOD-01: cabecera de la solicitud de insumos/EPP (migración 20261024215235). Estados en services/bodega/constantes.js.
module.exports = db.sequelize.define(
    'solicitudes_bodega',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        trabajador_id:{
            type: Sequelize.INTEGER,
            allowNull: true,
            references:{
                model: Trabajadore,
                key: 'id'
            }
        },
        usuario_id:{
            type: Sequelize.INTEGER,
            allowNull: true,
            references:{
                model: Usuario,
                key: 'id'
            }
        },
        centro_costo_id:{
            type: Sequelize.INTEGER,
            allowNull: false,
            references:{
                model: Centro_costo,
                key: 'id'
            }
        },
        estado:{
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'PENDIENTE'
        },
        observacion:{
            type: Sequelize.STRING(500),
            allowNull: true
        },
        entregada_at:{
            type: Sequelize.DATE,
            allowNull: true
        },
        anulada_at:{
            type: Sequelize.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'solicitudes_bodega',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
)
