const logicaDB = require('./logica')

const crearStock = async(req,res) => {
    const stocks = JSON.parse(req.body.stocks);
    try{
        for(i=0;i<stocks.length ;i++){
            const stockData = {
                cantidad: stocks[i].cantidad,
                comentario: stocks[i].comentario,
                fecha: new Date(stocks[i].fecha),
                productoId: stocks[i].productoId
            };
            let stock = await logicaDB.crearStockDB(stockData)
            if(stock){
                await logicaDB.aumentarCantidadProductoDB(stocks[i].productoId,stocks[i].cantidad)
            }
        }
        return res.json({mensaje:'Listo'})
    }catch(error){
        return res.send('error'+error)
    }
}

const eliminarStock = async(req,res) => {
    try{
        let stock = await logicaDB.buscarStockIdDB(req.params.id)
        let filas = await logicaDB.eliminarStockDB(req.params.id)
        await logicaDB.disminuirCantidadProductoDB(stock.productoId,stock.cantidad)
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