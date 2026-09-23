const express = require('express');
const instructivos = express.Router();

const Instructivo = require('../../modelos/sist_app/Instructivo')

//OBTENER INSTRUCTIVOS
instructivos.get('/obtener-instructivos', async (req, res) => {
    Instructivo.findAll()
    .then(instructivos => {
        return res.json({instructivos})
    })
    .catch(error => {
        return res.json({error})
    })
});

module.exports = instructivos;
