const express = require('express');
const usuarios = express.Router();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Usuario = require('../../modelos/sistema_base/Usuario');
const Rol = require('../../modelos/sistema_base/Role');

usuarios.use(cors());
const atob = require('atob');

Usuario.belongsTo(Rol, { as: 'role' });

process.env.SECRET_KEY = 'secret';

//REGISTRAR USUARIO
usuarios.post('/registro', (req, res) => {
  const usuario = JSON.parse(req.body.usuario);
  const usuarioData = {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    password: atob(usuario.password),
    correo: usuario.correo,
    rut: usuario.rut,
    estado: usuario.estado,
    roleId: usuario.roleId
  };
  Usuario.findOne({
    where: {
      correo: usuario.correo
    }
  })
    .then((usuario) => {
      if (!usuario) {
        const hash = bcrypt.hashSync(usuarioData.password, 10);
        usuarioData.password = hash;
        Usuario.create(usuarioData)
          .then((usuario) => {
            res.json({
              usuario: usuario
            });
          })
          .catch((error) => {
            res.send('error ' + error);
          });
      } else {
        res.json({ error: 'Usuario ya registrado' });
      }
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});
//EDITAR USUARIO
usuarios.put('/editar/:id', (req, res) => {
  const usuario = JSON.parse(req.body.usuario);
  const usuarioData = {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    //password : atob(usuario.password),
    correo: usuario.correo,
    rut: usuario.rut,
    estado: usuario.estado,
    roleId: usuario.roleId
  };
  Usuario.findById(req.params.id)
    .then((usuario) => {
      Usuario.update(usuarioData, { where: { id: req.params.id } })
        .then((filasUpdate) => {
          res.json({
            filas: filasUpdate
          });
        })
        .catch((error) => {
          res.send('error ' + error);
        });
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});
//CAMBIAR CONTRASEÑA DEL USUARIO
usuarios.put('/editar-password/:id', (req, res) => {
  const usuario = JSON.parse(req.body.usuario);
  const usuarioData = {
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    password: atob(usuario.password),
    correo: usuario.correo,
    rut: usuario.rut,
    //estado: usuario.estado,
    roleId: usuario.roleId
  };
  //var passCrypt = atob(usuarioData.)
  Usuario.findById(req.params.id)
    .then((usuario) => {
      const hash = bcrypt.hashSync(usuarioData.password, 10);
      usuarioData.password = hash;
      Usuario.update(usuarioData, { where: { id: req.params.id } })
        .then((filasUpdate) => {
          res.json({
            filas: filasUpdate
          });
        })
        .catch((error) => {
          res.send('error ' + error);
        });
    })
    .catch((error) => {
      res.send('error ' + error);
    });
});
//RESCATAR 1 USUARIO POR // ID
usuarios.get('/rescatar/:id', (req, res) => {
  Usuario.findById(req.params.id)
    .then((usuario) => {
      res.json({ usuario: usuario });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//LOGIN
usuarios.post('/login', (req, res) => {
  const usuario1 = JSON.parse(req.body.usuario);
  const passCrypt = atob(usuario1.password);
  usuario1.password = passCrypt;
  Usuario.findOne({
    where: {
      correo: usuario1.correo,
      estado: true
    },
    include: {
      model: Rol,
      as: 'role'
    }
  })
    .then((usuario) => {
      if (usuario) {
        if (bcrypt.compareSync(usuario1.password, usuario.password)) {
          let token = jwt.sign(usuario.dataValues, process.env.SECRET_KEY, {
            expiresIn: '1d'
          });
          res.json({ token: token });
        } else {
          res.send('Contraseña Incorrecta!');
        }
      } else {
        res.send('Usuario no existe!');
      }
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//ELIMINAR USUARIO
// usuarios.delete('/eliminar/:id', (req,res) => {
//     Usuario.update({estado:false}, {where:{id:req.params.id}})
//     .then( filasUpdate => {
//         res.json({ filas: filasUpdate})
//     })
//     .catch( error => {
//         res.send('error: '+error)
//     })
// })
//ACTIVAR USUARIO
usuarios.delete('/activar/:id', (req, res) => {
  Usuario.update({ estado: 1 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//OBTENER USUARIOS ACTIVOS
usuarios.get('/obtener', (req, res) => {
  Usuario.findAll({
    where: { estado: 1 },
    include: {
      model: Rol,
      as: 'role'
    },
    order: [['id', 'DESC']]
  })
    .then((usuarios) => {
      res.json({ usuarios: usuarios });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER USUARIOS INACTIVOS
usuarios.get('/obtener-inactivo', (req, res) => {
  Usuario.findAll({
    where: { estado: 0 },
    include: {
      model: Rol,
      as: 'role'
    },
    order: [['id', 'DESC']]
  })
    .then((usuarios) => {
      res.json({ usuariosInactivos: usuarios });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//ELIMINAR USUARIO
usuarios.delete('/eliminar/:id', (req, res) => {
  Usuario.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filasUpdate) => {
      res.json({ filas: filasUpdate });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});

//OBTENER USUARIOS ACTIVOS
usuarios.get('/busca-activo/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Usuario.findAll({
      include: {
        model: Rol,
        as: 'role'
      },
      order: [['id', 'DESC']],
      where: {
        estado: 1,
        [Op.or]: [
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            apellido: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            rut: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            correo: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            '$role.nombre$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      }
    })
      .then((usuarios) => {
        res.json({ usuarios: usuarios });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    Usuario.findAll({
      where: { estado: 1 },
      include: {
        model: Rol,
        as: 'role'
      },
      order: [['id', 'DESC']]
    })
      .then((usuarios) => {
        res.json({ usuarios: usuarios });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

//OBTENER USUARIOS INACTIVOS
usuarios.get('/busca-inactivo/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Usuario.findAll({
      include: {
        model: Rol,
        as: 'role'
      },
      order: [['id', 'DESC']],
      where: {
        estado: 0,
        [Op.or]: [
          {
            nombre: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            apellido: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            rut: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            correo: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            '$role.nombre$': {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      }
    })
      .then((usuarios) => {
        res.json({ usuariosInactivos: usuarios });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  } else {
    Usuario.findAll({
      where: { estado: 0 },
      include: {
        model: Rol,
        as: 'role'
      },
      order: [['id', 'DESC']]
    })
      .then((usuarios) => {
        res.json({ usuariosInactivos: usuarios });
      })
      .catch((error) => {
        res.send('error: ' + error);
      });
  }
});

module.exports = usuarios;
