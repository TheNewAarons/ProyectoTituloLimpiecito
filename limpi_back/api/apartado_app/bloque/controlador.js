const logicaDB = require('./logica')
//MODELOS
const Bloque = require('../../../modelos/sist_app/Bloque');

//PARA REALIZAR TRANSACCIONES
const sequelize_bloque = Bloque.sequelize;


const crearBloques = async(req,res) => {
    const bloques = req.body.bloques;
    try{
        const resultado = await sequelize_bloque.transaction(async (t) => {
            let num = 0;
            for (let index = 0; bloques.length > index; index++) {
              let bloqueData = {
                hora_inicio: bloques[index].hora_inicio,
                hora_fin: bloques[index].hora_fin,
                activo: true,
                diaId: bloques[index].diaId
              };
              await logicaDB.crearBloquesDB(bloqueData,t);
              num++
            }
            return num;
        });
        return res.json({ resultado, mensaje: 'Bloques Creados Correctamente' });
    }catch(error){
        return res.json({error,mensaje: 'Ha ocurrido un problema al crear los bloques' })
    }
}

const eliminarBloque = async(req,res) => {
    try{
        const resultado = await sequelize_bloque.transaction(async (t) => {
            let filas = await logicaDB.eliminarBloqueDB(req.params.idBloque,t)
            return filas
        })
        return res.json({ resultado, mensaje: 'Bloques Eliminados Correctamente' });
    }catch(error){
        return res.json({ error, mensaje: 'Ha ocurrido un problema al eliminar bloques' });
    }
}

const desactivarBloque = async(req,res) => {
    try{
        let filas = await logicaDB.desactivarBloqueDB(req.params.idBloque)
        return res.json({ filas, mensaje: 'Bloque Desactivado Correctamente' });
    }catch(error){
        return res.json({error})
    }
}

const activarBloque = async(req,res) => {
    try{
        let filas = await logicaDB.activarBloqueDB(req.params.idBloque)
        return res.json({ filas, mensaje: 'Bloque Desactivado Correctamente' });
    }catch(error){
        return res.json({error})
    }
}

module.exports = {
    crearBloques,
    eliminarBloque,
    desactivarBloque,
    activarBloque


}