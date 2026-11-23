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
const kardex = require('../../../services/bodega/kardex')
const { TIPOS_MOVIMIENTO: M } = require('../../../services/bodega/constantes')
const anularStock = require('../../../services/bodega/stock-rapido-anular')

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
                const productos = {};
                if (ids.length) {
                    const bloqueados = await Producto.findAll({
                        where: { id: { [Op.in]: ids } },
                        order: [['id', 'ASC']],
                        lock: t.LOCK.UPDATE,
                        transaction: t
                    });
                    for (let i = 0; i < bloqueados.length; i++) {
                        stockPrevio[bloqueados[i].id] = bloqueados[i].stock;
                        productos[bloqueados[i].id] = bloqueados[i];
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
                        await kardex.registrar({
                            transaction: t, producto: productos[stocks[i].productoId], tipo: M.ENTRADA_MANUAL, cantidad: Number(stocks[i].cantidad),
                            referenciaTipo: 'stock_rapidos', referenciaId: stock.id, motivo: stocks[i].comentario, usuario: usuario
                        })
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

// RNF-ARQ-01 (D-ARQ-01-5, AUT-010): ya no borra la fila; anula con el mismo servicio que PATCH /api/v1/bodega/stock-rapido/:id/anular.
const eliminarStock = async(req,res) => {
    try{
        await anularStock.anular(Number(req.params.id), 'Anulada desde la ruta legacy /stock/eliminar', actorDeRequest(req))
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
