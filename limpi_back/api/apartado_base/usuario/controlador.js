const logicaDB = require('./logica');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const atob = require('atob');
process.env.SECRET_KEY = 'secret';

const crearUsuario = async (req, res) => {
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
  try {
    let usuario_buscado = await logicaDB.buscarUsuarioCorreoDB(usuario.correo);
    if (!usuario_buscado) {
      console.log('entra')
      const hash = bcrypt.hashSync(usuarioData.password, 10);
      usuarioData.password = hash;
      let usuario_creado = await logicaDB.crearUsuarioDB(usuarioData);
      return res.json({ usuario: usuario_creado });
    } else {
      console.log('entra else')
      return res.json({ error: 'Usuario ya registrado' });
    }
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarUsuario = async (req, res) => {
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
  try {
    let filas = await logicaDB.editarUsuarioDB(req.params.id, usuarioData);
    return res.json({ filas });
  } catch (error) {
    return res.send('error' + error);
  }
};

const cambiarContrasenaUsuario = async (req, res) => {
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
  try {
    const hash = bcrypt.hashSync(usuarioData.password, 10);
    usuarioData.password = hash;
    let filas = await logicaDB.editarUsuarioDB(req.params.id, usuarioData);
    return res.json({ filas });
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerUsuarioId = async (req, res) => {
  try {
    let usuario = await logicaDB.buscarUsuarioIdDB(req.params.id);
    return res.json({ usuario });
  } catch (error) {
    return res.send('error' + error);
  }
};

const login = async (req, res) => {
  const usuario1 = JSON.parse(req.body.usuario);
  const passCrypt = atob(usuario1.password);
  usuario1.password = passCrypt;
  try {
    let usuario = await logicaDB.buscarUsuarioCorreoTrueDB(usuario1.correo)
    if(usuario){
        if (bcrypt.compareSync(usuario1.password, usuario.password)) {
            let token = jwt.sign(usuario.dataValues, process.env.SECRET_KEY, {
              expiresIn: '1d'
            });
            console.log(token)
            return res.json({ token });
          } else {
            return res.send('Contraseña Incorrecta!');
          }
    }else{
        return res.send('Usuario no existe!');
    }
  } catch (error) {
    return res.send('error' + error);
  }
};

const activarUsuario = async (req, res) => {
  try {
    let filas = await logicaDB.activarUsuarioDB(req.params.id)
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerUsuariosActivos = async (req, res) => {
  try {
    let usuarios = await logicaDB.obtenerUsuariosActivosDB()
    return res.json({usuarios})
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerUsuariosInactivos = async (req, res) => {
  try {
    let usuariosInactivos = await logicaDB.obtenerUsuariosInactivosDB()
    return res.json({usuariosInactivos})
  } catch (error) {
    return res.send('error' + error);
  }
};

const desactivarUsuario = async (req, res) => {
  try {
    let filas = await logicaDB.desactivarUsuarioDB(req.params.id)
    return res.json({filas})
  } catch (error) {
    return res.send('error' + error);
  }
};

const buscarUsuariosActivos = async (req, res) => {
  try {
    if (req.params.busca != null) {
        let usuarios = await logicaDB.buscarUsuariosActivosDB(req.params.busca)
        return res.json({usuarios})
    }else{
        let usuarios = await logicaDB.obtenerUsuariosActivosDB()
        return res.json({usuarios})
    }
  } catch (error) {
    return res.send('error' + error);
  }
};

const buscarUsuariosInactivos = async (req, res) => {
  try {
    if (req.params.busca != null) {
        let usuariosInactivos = await logicaDB.buscarUsuariosInactivosDB(req.params.busca)
        return res.json({usuariosInactivos})
    }else{
        let usuariosInactivos = await logicaDB.obtenerUsuariosInactivosDB()
        return res.json({usuariosInactivos})
    }
  } catch (error) {
    return res.send('error' + error);
  }
};

module.exports = {
  crearUsuario,
  editarUsuario,
  cambiarContrasenaUsuario,
  obtenerUsuarioId,
  login,
  activarUsuario,
  obtenerUsuariosActivos,
  obtenerUsuariosInactivos,
  desactivarUsuario,
  activarUsuario,
  buscarUsuariosActivos,
  buscarUsuariosInactivos
};
