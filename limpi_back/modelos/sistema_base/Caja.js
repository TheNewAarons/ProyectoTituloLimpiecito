const Sequelize = require('sequelize')
const db = require('../../database/database');
const Usuario = require("./Usuario")

module.exports = db.sequelize.define(
    'cajas',
    {
        id:{
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrment: true
        },
        fecha_inicio:{
            type: Sequelize.DATE
        },
        fecha_cierre:{
            type: Sequelize.DATE
        },
        total_ingreso:{
            type: Sequelize.INTEGER
        },
        total_egreso:{
            type: Sequelize.INTEGER
        },
        utilidad:{
            type: Sequelize.INTEGER
        },
        total_perdida:{
            type: Sequelize.INTEGER
        },
        estado:{
            type: Sequelize.INTEGER
        },
        total_cf:{
            type: Sequelize.INTEGER
        },
        usuarioId:{
            type: Sequelize.INTEGER,
            references:{
                model: Usuario,
                key:'id'
            }
        },
        // RF-CAJA-01: periodo 'YYYY-MM' (UNIQUE) y saldos encadenados. estado sigue 1 = abierta, 0 = cerrada
        periodo:{
            type: Sequelize.CHAR(7),
            allowNull: false,
            unique: true,
            validate:{
                is: /^\d{4}-(0[1-9]|1[0-2])$/
            }
        },
        saldo_inicial:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: false,
            defaultValue: 0
        },
        saldo_final:{
            type: Sequelize.DECIMAL(14, 0),
            allowNull: true
        },
        saldo_provisional:{
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        cerrada_por:{
            type: Sequelize.INTEGER,
            allowNull: true,
            references:{
                model: Usuario,
                key:'id'
            }
        }

    },
    {
        timestamps: false,
        hooks:{
            // Compatibilidad legacy (crearCaja no envía periodo): se deriva de fecha_inicio en America/Santiago,
            // misma regla que el backfill de la migración RF-CAJA-01
            beforeValidate: function (caja) {
                if (!caja.periodo && caja.fecha_inicio) {
                    caja.periodo = periodoSantiago(caja.fecha_inicio)
                }
            }
        }
    }
)

function periodoSantiago(valor) {
    const fecha = valor instanceof Date ? valor : new Date(valor)
    if (isNaN(fecha.getTime())) return null
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit' })
        .formatToParts(fecha)
    const anio = partes.filter(p => p.type === 'year')[0].value
    const mes = partes.filter(p => p.type === 'month')[0].value
    return anio + '-' + mes
}
