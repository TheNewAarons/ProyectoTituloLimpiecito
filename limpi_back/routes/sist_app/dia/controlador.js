const express = require('express');
const dias = express.Router();

const { crearDias } = require('./logicaDB');

//CREAR DIAS DE LA SEMANA
dias.post('/crear', async (req, res) => {
    let horario_id = req.params.horario_id;  

    let diaSemana = {        
        lunes: 'lunes',
        martes: 'martes',
        miercoles: 'miercoles',
        jueves: 'jueves',
        viernes: 'viernes',
        sabado: 'sabado',
        domingo: 'domingo'
        
    }
    let dia = {
        nombre: '',
        estado: 1,
        horarioId: horario_id
    }
    
    try {
        for(let i; i<dia.nombre.length; i++){
            dia.nombre = diaSemana[i];
            await crearDias(dia)
        }
        res.status(200).json({mensaje : 'Dias creados exitosamente'})
        return;
    } catch (error) {
        res.status(500).json({ error });
        return;
    }
    
  });

  module.exports = dias;