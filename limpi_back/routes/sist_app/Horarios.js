const express = require('express');
const horarios = express.Router();

//MODELOS
const Horario = require('../../modelos/sist_app/Horario');
const Bloque = require('../../modelos/sist_app/Bloque');

//CONTROLADOR DIA
// const Dia = require('../sist_app/dia/controlador')
//MODELOS PERTENECIENTES A HORARIOS
const Dia = require('../../modelos/sist_app/Dia')

//ASOCIACIONES
Dia.hasMany(Bloque)

//CREAR HORARIO
horarios.post('/crear', async (req, res) => {
  let horario = req.body.horario;
  const horarioData = {  
    cant_servicios: horario.cant_servicios,
    estado: horario.estado,
    categoriaServicioId: horario.categoriaServicioId
  };
    Horario.create(horarioData)
    .then(async horario =>{
      let diaCreado = await crearDiasSemanas(horario.id)    
      return res.json({ horario, mensaje: 'Horario Creado Correctamente' });
    })
    .catch(error => {
      return res.json({ error, mensaje: 'Ha ocurrido un problema al crear el horario' });
    })  
});
async function crearDiasSemanas(horario_id){  
    let diaSemana = [        
        'lunes',
        'martes',
        'miercoles',
        'jueves',
        'viernes',
        'sabado',
        'domingo'
        
    ]
    let dia = {
        nombre: '',
        estado: 1,
        horarioId: horario_id    }    
    try {
        for(let i=0; i<diaSemana.length; i++){
            dia.nombre = diaSemana[i];
            await Dia.create(dia)
        }
        return true;
    } catch (error) {    
        return error;
    }
}

//EDITAR HORARIO
horarios.put('/editar/:idHorario', async (req, res) => {
  const horario = req.body.horario;
  const horarioData = {
    // hora_inicio: horario.hora_inicio,
    // hora_fin: horario.hora_fin,
    // duracion: horario.duracion,
    cant_servicios: horario.cant_servicios,
    categoriaServicioId: horario.categoriaServicioId
  };
  
  Horario.update(horarioData, { where: { id: req.params.idHorario } })
  .then(filas =>{
    return res.json({ filas, mensaje: 'Horario Editado Correctamente' });  

  })
  .catch(error => {
    return res.json({ error, mensaje: 'Ha ocurrido un problema al editar el horario' });
  })
    
});

//OBTENER HORARIO SIN BLOQUE
horarios.get('/obtener-horario-solo/:idHorario', async (req, res) => {
  Horario.findById(req.params.idHorario)
    .then((horario) => {
      return res.json({ horario });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//DESACTIVAR HORARIO
horarios.delete('/desactivar/:idHorario', async (req, res) => {
  Horario.update({ estado: 0 }, { where: { id: req.params.idHorario } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Horario Desactivado Correctamente' });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//ACTIVAR HORARIO
horarios.delete('/activar/:idHorario', async (req, res) => {
  Horario.update({ estado: 1 }, { where: { id: req.params.idHorario } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Horario Activado Correctamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER DIAS CON BLOQUES
horarios.get('/obtener-dia-bloques/:idDia', async (req, res) => {
  Dia.findById(req.params.idDia, { 
    include: [{ model: Bloque}] 
  })
    .then((dia) => {
      return res.json({ dia });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

//DESACTIVAR DIA
horarios.delete('/desactivar-dia/:idDia', async (req, res) => {
  Bloque.update(
    { activo: false },
    { where: { diaId: req.params.idDia } }
  )
    .then((bloque) =>{
      Dia.update(
        { estado: false },
        { where: { id: req.params.idDia } }
      )
      .then((dia) => {
        return res.json({ bloque, dia});
      })      
      .catch((error) => {
        return res.json({ error });
      })

      
    })
    .catch((error) =>{
      return res.json({ error });
    });

});
//ACTIVAR DIA
horarios.delete('/activar-dia/:idDia', async (req, res) => {
  Bloque.update(
    { activo: true },
    { where: { diaId: req.params.idDia } }
  )
    .then((bloque) =>{
      Dia.update(
        { estado: true },
        { where: { id: req.params.idDia } }
      )
      .then((dia) => {
        return res.json({ bloque, dia});
      })      
      .catch((error) => {
        return res.json({ error });
      })      
    })
    .catch((error) =>{
      return res.json({ error });
    });
});

module.exports = horarios;
