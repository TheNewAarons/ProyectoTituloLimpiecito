const logicaDB = require('./logica');
const fs = require('fs');
const path = require('path');

const crearServicio = async (req, res) => {
  const { nombre, descripcion, precio, estado, categoriaServicioId } = req.body;
  try {
    let existe = await logicaDB.buscarServicioNombreDB(nombre);
    if (existe) {
      fs.unlinkSync(path.resolve(req.file.path));
      return res.json({ mensaje: 'Este Nombre Ya Existe En Los Registros!!' });
    } else {
      const servicioData = {
        nombre: nombre,
        descripcion: descripcion,
        imagen: req.file.path,
        precio: precio,
        categoriaServicioId: categoriaServicioId,
        estado: estado
      };
      let servicio = await logicaDB.crearServicioDB(servicioData);
      return res.json({ servicio, mensaje: 'Producto Servicio Creado Correctamente' });
    }
  } catch (error) {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ error });
  }
};

const editarServicio = async (req, res) => {
  const { nombre, descripcion, precio, estado, categoriaServicioId } = req.body;
  try {
    let servicio = await logicaDB.buscarServicioIdDB(req.params.idServicio);
    if (servicio) {
      let servicioData = {
        nombre: nombre,
        descripcion: descripcion,
        //imagen: req.file.path,
        precio: precio,
        categoriaServicioId: categoriaServicioId,
        estado: estado
      };
      if (req.file) {
        servicioData.imagen = req.file.path;
        fs.unlinkSync(path.resolve(servicio.imagen));
      }
      let filas = await logicaDB.editarServicioDB(servicioData, req.params.idServicio);
      return res.json({ filas, mensaje: 'Servicio Editado Correctamente' });
    } else {
      fs.unlinkSync(path.resolve(req.file.path));
      return res.json({ mensaje: 'El servicio ha editar no existe' });
    }
  } catch (error) {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ mensaje: 'El servicio ha editar no existe' });
  }
};

const obtenerServicioId = async (req, res) => {
  try {
    let servicio = await logicaDB.buscarServicioIdDB(req.params.idServicio);
    return res.json({ servicio });
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const desactivarServicio = async(req,res) => {
    try{
        let filas = await logicaDB.desactivarServicioDB(req.params.idServicio)
        return res.json({ filas, mensaje: 'Servicio desactivado satisfactoriamente' });
    }catch(error){
        return res.send('error: ' + error);
    }
}

const activarServicio = async(req,res) => {
    try{
        let filas = await logicaDB.activarServicioDB(req.params.idServicio)
        return res.json({ filas, mensaje: 'Servicio activado satisfactoriamente' });
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerServiciosActivos = async(req,res) => {
    try{
        let servicios = await logicaDB.obtenerServiciosActivosDB()
        return res.json({ servicios });
    }catch(error){
        return res.send('error'+error)
    }
}

const obtenerServiciosInactivos = async(req,res) => {
    try{
        let servicios = await logicaDB.obtenerServiciosInactivosDB()
        return res.json({ servicios });
    }catch(error){
        return res.send('error'+error)
    }
}

module.exports = {
  crearServicio,
  editarServicio,
  obtenerServicioId,
  desactivarServicio,
  activarServicio,
  obtenerServiciosActivos,
  obtenerServiciosInactivos
};
