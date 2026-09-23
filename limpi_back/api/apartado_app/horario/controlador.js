const logicaDB = require('./logica');

const crearHorario = async (req, res) => {
  let horario = req.body.horario;
  const horarioData = {
    cant_servicios: horario.cant_servicios,
    estado: horario.estado,
    categoriaServicioId: horario.categoriaServicioId
  };
  try {
    let horario = await logicaDB.crearHorarioDB(horarioData);
    let diaSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    let dia = {
      nombre: '',
      estado: 1,
      horarioId: horario.id
    };
    for (let i = 0; i < diaSemana.length; i++) {
      dia.nombre = diaSemana[i];
      await Dia.create(dia);
    }
    return res.json({ horario, mensaje: 'Horario Creado Correctamente' });
  } catch (error) {
    return res.json({ error, mensaje: 'Ha ocurrido un problema al crear el horario' });
  }
};

const editarHorario = async (req, res) => {
  const horario = req.body.horario;
  const horarioData = {
    cant_servicios: horario.cant_servicios,
    categoriaServicioId: horario.categoriaServicioId
  };
  try{
    let filas = await logicaDB.editarHorarioDB(horarioData,req.params.idHorario)
  }catch(error){
    return res.json({ error, mensaje: 'Ha ocurrido un problema al editar el horario' });
  }
};

const obtenerHorarioSinBloque = async(req,res) => {
    try{
        let horario = await logicaDB.obtenerHorarioSinBloqueDB(req.params.idHorario)
        return res.json({horario})
    }catch(error){
        return res.json({ error });
    }
}

const desactivarHorario = async(req,res) => {
    try{
        let filas = await logicaDB.desactivarHorarioDB(req.params.idHorario)
        return res.json({ filas, mensaje: 'Horario Desactivado Correctamente' });
    }catch(error){
        return res.json({error})
    }
}

const activarHorario = async(req,res) => {
    try{
        let filas = await logicaDB.activarHorarioDB(req.params.idHorario)
        return res.json({ filas, mensaje: 'Horario Activado Correctamente' });
    }catch(error){
        return res.json({error})
    }
}

const obtenerDiaConBloque = async(req,res) => {
    try{
        let dia = await logicaDB.obtenerDiaConBloqueDB(req.params.idDia)
        return res.json({dia})
    }catch(error){
        return res.json({error})
    }
}

const desactivarDia = async(req,res) => {
    try{
        let bloque = await logicaDB.desactivarBloqueDB(req.params.idDia)
        let dia = await logicaDB.desactivarDiaDB(req.params.idDia)
        return res.json({bloque,dia})
    }catch(error){
        return res.json({error})
    }
}

const activarDia = async(req,res) => {
    try{
        let bloque = await logicaDB.activarBloqueDB(req.params.idDia)
        let dia = await logicaDB.activarDiaDB(req.params.idDia)
        return res.json({bloque,dia})
    }catch(error){
        return res.json({error})
    }
}

module.exports = {
  crearHorario,
  editarHorario,
  obtenerHorarioSinBloque,
  desactivarHorario,
  activarHorario,
  obtenerDiaConBloque,
  desactivarDia,
  activarDia,
};
