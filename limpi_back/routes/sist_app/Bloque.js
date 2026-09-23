const express = require('express');
const bloques = express.Router();

//MODELOS
const Bloque = require('../../modelos/sist_app/Bloque');

//PARA REALIZAR TRANSACCIONES
const sequelize_bloque = Bloque.sequelize;

//CREAR BLOQUES
bloques.post('/crear', async (req, res) => {
  const bloques = req.body.bloques;
  try {
    const resultado = await sequelize_bloque.transaction(async (t) => {
      let num = 0;
      for (let index = 0; bloques.length > index; index++) {
        let bloqueData = {
          hora_inicio: bloques[index].hora_inicio,
          hora_fin: bloques[index].hora_fin,
          activo: true,
          diaId: bloques[index].diaId
        };
        await Bloque.create(bloqueData, { transaction: t });
        num++
      }
      return num;
    });
    
    return res.json({ resultado, mensaje: 'Bloques Creados Correctamente' });
  } catch (error) {
    return res.json({ error, mensaje: 'Ha ocurrido un problema al crear los bloques' });
  }
});

//ELIMINAR BLOQUES
bloques.delete('/eliminar/:idBloque', async (req, res) => {
  const bloques = req.body.bloques;
  try {
    const resultado = await sequelize_bloque.transaction(async (t) => {
      let filas = await Bloque.destroy({ where: { id: req.params.idBloque } }, { transaction: t });
      return filas;
    });
    return res.json({ resultado, mensaje: 'Bloques Eliminados Correctamente' });
  } catch (error) {
    return res.json({ error, mensaje: 'Ha ocurrido un problema al eliminar bloques' });
  }
});

//DESACTIVAR BLOQUE
bloques.delete('/desactivar/:idbloque', async (req, res) => {
  Bloque.update({ activo: false }, { where: { id: req.params.idbloque } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Bloque Desactivado Correctamente' });
    })
    .catch((error) => {
      return res.json({ error });
    });
});
//ACTIVAR BLOQUE
bloques.delete('/activar/:idbloque', async (req, res) => {
  Bloque.update({ activo: true }, { where: { id: req.params.idbloque } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Bloque Desactivado Correctamente' });
    })
    .catch((error) => {
      return res.json({ error });
    });
});

module.exports = bloques;
