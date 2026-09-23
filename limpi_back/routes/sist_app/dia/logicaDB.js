const Dia = require('../../../modelos/sist_app/Dia')

const crearDias = async (dia) => {
    let respuesta = Dia.create(dia);
        
        // .then(dia =>{
        // respuesta res.json({ dia, mensaje: 'dia Creado Correctamente' });
        // })
        // .catch(error => {
        // return res.json({ error, mensaje: 'Ha ocurrido un problema al crear el dia' });
        // })  
    return respuesta;          
}

module.exports = {
    crearDias
}

