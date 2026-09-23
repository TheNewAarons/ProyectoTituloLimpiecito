const express = require('express');
const accesos = express.Router();
const atob = require('atob');
const bcrypt = require('bcryptjs');

const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente');
const Acceso_trabajador = require('../../modelos/sistema_base/Acceso_trabajador');
const Trabajador = require('../../modelos/sistema_base/Trabajadore');

//CREAR ACCESO CLIENTE
accesos.post('/crear-acceso-cliente', async (req, res) => {
  const acceso_cliente = JSON.parse(req.body.acceso_cliente);
  const acceso_clienteData = {
    nombre:acceso_cliente.nombre,
    correo: acceso_cliente.correo,
    password: atob(acceso_cliente.password),
    clienteId: acceso_cliente.clienteId
  };
  Acceso_cliente.findOne({
    where: {
      correo: acceso_cliente.correo
    }
  })
    .then((acceso) => {
      if (!acceso) {
        let password_hash = bcrypt.hashSync(acceso_clienteData.password, 10);
        acceso_clienteData.password = password_hash;
        Acceso_cliente.create(acceso_clienteData)
          .then((new_acceso) => {
            return res.json({
              mensaje: 'Creado Correctamente',
              acceso: new_acceso
            });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡Correo ya existente!, por favor ingrese otro' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//CREAR ACCESO TRABAJADOR
accesos.post('/crear-acceso-trabajador/:id', async (req, res) => {
  const acceso_trabajador = JSON.parse(req.body.acceso_trabajador);
  const acceso_trabajadorData = {
    correo: acceso_trabajador.correo,
    password: atob(acceso_trabajador.password),
    estado: acceso_trabajador.estado
  };
  Acceso_trabajador.findOne({
    where: {
      correo: acceso_trabajador.correo
    }
  })
    .then((acceso) => {
      if (!acceso) {
        let password_hash = bcrypt.hashSync(acceso_trabajadorData.password, 10);
        acceso_trabajadorData.password = password_hash;
        Acceso_trabajador.create(acceso_trabajadorData)
          .then((new_acceso) => {
            if (new_acceso) {
              console.log(new_acceso.id);
              Trabajador.update({ accesoTrabajadoreId: new_acceso.id }, { where: { id: req.params.id } })
                .then(() => {
                  return res.json({
                    mensaje: 'Creado Correctamente',
                    acceso: new_acceso
                  });
                })
                .catch((error) => {
                  return res.status(404).send('error: ' + error);
                });
            }
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡Correo ya existente!, por favor ingrese otro' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//CAMBIAR CONTRASEÑA ACCESO CLIENTE
accesos.put('/editar-password-acceso-cliente/:id', async (req, res) => {
  let password = req.body.new_password;
  const new_password = atob(password);
  Acceso_cliente.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        const pass_hash = bcrypt.hashSync(new_password, 10);
        Acceso_cliente.update({ password: pass_hash }, { where: { id: req.params.id } })
          .then((filas) => {
            return res.json({ filas: filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede modificar la password!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//CAMBIAR CONTRASEÑA ACCESO TRABAJADOR
accesos.put('/editar-password-acceso-trabajador/:id', async (req, res) => {
  let password = req.body.new_password;

  const new_password = atob(password);
  Acceso_trabajador.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        const pass_hash = bcrypt.hashSync(new_password, 10);
        Acceso_trabajador.update({ password: pass_hash }, { where: { id: req.params.id } })
          .then((filas) => {
            return res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede modificar la password!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//DESACTIVAR ACCESO CLIENTE
accesos.delete('/desactivar-acceso-cliente/:id', async (req, res) => {
  Acceso_cliente.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        Acceso_cliente.update({ estado: false }, { where: { id: req.params.id } })
          .then((filas) => {
            res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede desactivar el acceso!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//DESACTIVAR ACCESO TRABAJADOR
accesos.delete('/desactivar-acceso-trabajador/:id', async (req, res) => {
  Acceso_trabajador.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        Acceso_trabajador.update({ estado: false }, { where: { id: req.params.id } })
          .then((filas) => {
            res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede desactivar el acceso!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//ACTIVAR ACCESO CLIENTE
accesos.delete('/activar-acceso-cliente/:id', async (req, res) => {
  Acceso_cliente.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        Acceso_cliente.update({ estado: true }, { where: { id: req.params.id } })
          .then((filas) => {
            res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede activar el acceso!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//ACTIVAR ACCESO TRABAJADOR
accesos.delete('/activar-acceso-trabajador/:id', async (req, res) => {
  Acceso_trabajador.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        Acceso_trabajador.update({ estado: true }, { where: { id: req.params.id } })
          .then((filas) => {
            res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede activar el acceso!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//ELIMINAR ACCESO CLIENTE
accesos.delete('/eliminar-acceso-cliente/:id', async (req, res) => {
  Acceso_cliente.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        Acceso_cliente.destroy({ where: { id: req.params.id } })
          .then((filas) => {
            res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede eliminar el acceso!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//CAMBIAR CORREO ACCESO TRABAJADOR
accesos.put('/editar-correo-acceso-trabajador/:id', async (req, res) => {
  let correo = req.body.correo;
  Acceso_trabajador.findById(req.params.id)
    .then((acceso) => {
      if (acceso) {
        Acceso_trabajador.update({ correo: correo }, { where: { id: req.params.id } })
          .then((filas) => {
            return res.json({ filas });
          })
          .catch((error) => {
            return res.status(404).send('error: ' + error);
          });
      } else {
        return res.json({ error: '¡No se puede modificar el correo!' });
      }
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

module.exports = accesos;
