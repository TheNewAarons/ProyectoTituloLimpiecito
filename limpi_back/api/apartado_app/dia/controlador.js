const logicaDB = require('./logica');

const crearDias = async (req, res) => {
  let horario_id = req.params.horario_id;

  let diaSemana = {
    lunes: 'lunes',
    martes: 'martes',
    miercoles: 'miercoles',
    jueves: 'jueves',
    viernes: 'viernes',
    sabado: 'sabado',
    domingo: 'domingo'
  };
  let dia = {
    nombre: '',
    estado: 1,
    horarioId: horario_id
  };
  try {
    for (let i; i < dia.nombre.length; i++) {
      dia.nombre = diaSemana[i];
      await logicaDB.crearDiasDB(dia);
    }
    return res.status(200).json({ mensaje: 'Dias creados exitosamente' });
  } catch (error) {
    return res.status(500).json({ error });
  }
};

module.exports = {
  crearDias
};
