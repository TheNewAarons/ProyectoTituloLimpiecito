const Sequelize = require('sequelize')
const Op = Sequelize.Op
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED

const db = require('../../../database/database')
const { auditar } = require('../../../services/auditoria')
const { actorDeRequest } = require('../../../services/auditoria/actor')
const { reintentarTransaccion } = require('../../../services/caja/cierre')
const Stock = require('../../../modelos/sistema_base/Stock_rapido')
const Producto = require('../../../modelos/sistema_base/Producto')
const logicaDB = require('./logica')

const crearStock = async(req,res) => {
    const stocks = JSON.parse(req.body.stocks);
    const { usuario, ip, motivoSinToken } = actorDeRequest(req);
    try{
        await reintentarTransaccion(function () {
            return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
                const ids = [];
                for (let i = 0; i < stocks.length; i++) {
                    const pid = stocks[i].productoId;
                    if (pid !== null && pid !== undefined && ids.indexOf(pid) === -1) {
                        ids.push(pid);
                    }
                }
                ids.sort(function (a, b) { return a - b; });

                const stockPrevio = {};
                if (ids.length) {
                    const bloqueados = await Producto.findAll({
                        where: { id: { [Op.in]: ids } },
                        order: [['id', 'ASC']],
                        lock: t.LOCK.UPDATE,
                        transaction: t
                    });
                    for (let i = 0; i < bloqueados.length; i++) {
                        stockPrevio[bloqueados[i].id] = bloqueados[i].stock;
                    }
                }

                for (let i = 0; i < stocks.length; i++) {
                    const stockData = {
                        cantidad: stocks[i].cantidad,
                        comentario: stocks[i].comentario,
                        fecha: new Date(stocks[i].fecha),
                        productoId: stocks[i].productoId
                    };
                    const stock = await logicaDB.crearStockDB(stockData, t)
                    if (stock) {
                        await logicaDB.aumentarCantidadProductoDB(stocks[i].productoId, stocks[i].cantidad, t)
                        await auditar({
                            transaction: t,
                            usuario: usuario,
                            entidad: 'stock_rapidos',
                            entidad_id: stock.id,
                            accion: 'CREAR',
                            antes: null,
                            despues: stock,
                            ip: ip,
                            motivo: motivoSinToken
                        });
                    }
                }

                if (ids.length) {
                    const releidos = await Producto.findAll({
                        where: { id: { [Op.in]: ids } },
                        order: [['id', 'ASC']],
                        lock: t.LOCK.UPDATE,
                        transaction: t
                    });
                    for (let i = 0; i < releidos.length; i++) {
                        await auditar({
                            transaction: t,
                            usuario: usuario,
                            entidad: 'productos',
                            entidad_id: releidos[i].id,
                            accion: 'AJUSTE',
                            antes: { id: releidos[i].id, stock: stockPrevio[releidos[i].id] },
                            despues: { id: releidos[i].id, stock: releidos[i].stock },
                            ip: ip,
                            motivo: motivoSinToken
                        });
                    }
                }
            });
        });
        return res.json({mensaje:'Listo'})
    }catch(error){
        return res.send('error'+error)
    }
}

const eliminarStock = async(req,res) => {
    const { usuario, ip, motivoSinToken } = actorDeRequest(req);
    try{
        await reintentarTransaccion(function () {
            return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
                const stock = await Stock.findById(req.params.id, { transaction: t, lock: t.LOCK.UPDATE })

                const bloqueados = await Producto.findAll({
                    where: { id: { [Op.in]: [stock.productoId] } },
                    order: [['id', 'ASC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });
                const stockPrevio = bloqueados.length ? bloqueados[0].stock : null;

                await auditar({
                    transaction: t,
                    usuario: usuario,
                    entidad: 'stock_rapidos',
                    entidad_id: stock.id,
                    accion: 'ANULAR',
                    antes: stock,
                    despues: null,
                    ip: ip,
                    motivo: motivoSinToken
                });

                await logicaDB.eliminarStockDB(req.params.id, t)
                await logicaDB.disminuirCantidadProductoDB(stock.productoId, stock.cantidad, t)

                const releidos = await Producto.findAll({
                    where: { id: { [Op.in]: [stock.productoId] } },
                    order: [['id', 'ASC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });
                if (releidos.length) {
                    await auditar({
                        transaction: t,
                        usuario: usuario,
                        entidad: 'productos',
                        entidad_id: releidos[0].id,
                        accion: 'AJUSTE',
                        antes: { id: releidos[0].id, stock: stockPrevio },
                        despues: { id: releidos[0].id, stock: releidos[0].stock },
                        ip: ip,
                        motivo: motivoSinToken
                    });
                }
            });
        });
        return res.json({mensaje:'Listo'})
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerTodosStock = async(req,res) => {
    try{
        let stocks = await logicaDB.obtenerTodosStockDB()
        return res.json({stocks})

    }catch(error){
        return res.send('error'+error)
    }
}

module.exports = {
    crearStock,
    eliminarStock,
    obtenerTodosStock
}
