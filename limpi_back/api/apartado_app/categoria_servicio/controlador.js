const logicaDB = require('./logica');
const fs = require('fs');
const path = require('path');

const Cate_servicio = require('../../modelos/sist_app/Categoria_servicio');

//PARA REALIZAR TRANSACCIONES
const sequelize_cate = Cate_servicio.sequelize;

const crearCateServicio = async (req, res) => {
  const { nombre, activar_cantidad, estado, herramientas, articulos, descripciones } = req.body;
  const desc_array = JSON.parse(descripciones);
  const herra_array = JSON.parse(herramientas);
  const arti_array = JSON.parse(articulos);
  try {
    let existe = await logicaDB.buscarCateServicioNombreDB(nombre);
    if (existe) {
      fs.unlinkSync(path.resolve(req.file.path));
      return res.json({ mensaje: 'Este Nombre Ya Existe En Los Registros!!' });
    } else {
      const cateServicioData = {
        nombre: nombre,
        activar_cantidad: activar_cantidad,
        imagen: req.file.path,
        estado: estado
      };
      const resultado = await sequelize_cate.transaction(async (t) => {
        const new_cate = await logicaDB.crearCateServicioDB(cateServicioData, t);
        //Crear Descripciones
        if (desc_array.length > 0) {
          for (let index = 0; index < desc_array.length; index++) {
            let descData = {
              texto: desc_array[index].texto,
              categoriaServicioId: new_cate.dataValues.id
            };
            await logicaDB.crearDescripcionDB(descData, t);
          }
        }
        //Crear Herramientas
        if (herra_array.length > 0) {
          for (let index2 = 0; index2 < herra_array.length; index2++) {
            let herraData = {
              texto: herra_array[index2].texto,
              categoriaServicioId: new_cate.dataValues.id
            };
            await logicaDB.crearHerramientaDB(herraData, t);
          }
        }
        //Crear Articulos
        if (arti_array.length > 0) {
          for (let index3 = 0; index3 < arti_array.length; index3++) {
            let artiData = {
              texto: arti_array[index3].texto,
              categoriaServicioId: new_cate.dataValues.id
            };
            await logicaDB.crearArticuloDB(artiData, t);
          }
        }
        return new_cate;
      });
      return res.json({ mensaje: 'Categoria servicio creado correctamente', cate_servicio: resultado });
    }
  } catch (error) {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.status(400).json({ error, mensaje: 'Ocurrio un problema al crear la categoria servicio' });
  }
};

const editarCateServicio = async (req, res) => {
  const { nombre, activar_cantidad, estado } = req.body;
  try {
    let cateServicio = await logicaDB.buscarCateServicioIdDB(req.params.idCate_servicio);
    if (cateServicio) {
      let cateServicioData = {
        nombre: nombre,
        activar_cantidad: activar_cantidad,
        //imagen: req.file.path,
        estado: estado
      };
      if (req.file) {
        cateServicioData.imagen = req.file.path;
        fs.unlinkSync(path.resolve(cateServicio.imagen));
      }
      let filas = logicaDB.editarCateServicioDB(cateServicioData, req.params.idCate_servicio);
      return res.json({ filas, mensaje: 'Categoria Servicio Editada Correctamente' });
    } else {
      fs.unlinkSync(path.resolve(req.file.path));
      return res.json({ mensaje: 'La categoria servicio ha editar no existe' });
    }
  } catch (error) {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ mensaje: 'Ha ocurrido un error' });
  }
};

const obtenerCateServicioId = async (req, res) => {
  try {
    let cate_servicio = await logicaDB.obtenerCateServicioIdDB(req.params.idCate_servicio);
    return res.json({ cate_servicio });
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const desactivarCateServicio = async (req, res) => {
  try {
    let filas = await logicaDB.desactivarCateServicioDB(req.params.idCate_servicio);
    return res.json({ filas, mensaje: 'Categoria Servicio desactivado satisfactoriamente' });
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const activarCateServicio = async (req, res) => {
  try {
    let filas = await logicaDB.activarCateServicioDB(req.params.idCate_servicio);
    return res.json({ filas, mensaje: 'Categoria Servicio activado satisfactoriamente' });
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const obtenerCateServiciosActivos = async (req, res) => {
  try {
    let cate_servicios = await logicaDB.obtenerCateServiciosActivosDB();
    return res.json({ cate_servicios });
  } catch (error) {
    return res.send('error' + error);
  }
};

const obtenerCateServiciosInactivos = async (req, res) => {
  try {
    let cate_servicios = await logicaDB.obtenerCateServiciosInactivosDB();
    return res.json({ cate_servicios });
  } catch (error) {
    return res.send('error' + error);
  }
};

/** EDITAR Y ELIMINAR,  DESCRIPCION, HERRAMIENTA Y ARTICULO  */

const editarDescripcion = async (req, res) => {
  let descripcion = req.body.descripcion;
  try {
    let filas = await logicaDB.editarDescripcionDB(descripcion, req.params.idDescripcion);
    return res.json({ filas, mensaje: 'Descripción Editado Correctamente' });
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarHerramienta = async (req, res) => {
  let herramienta = req.body.herramienta;
  try {
    let filas = await logicaDB.editarHerramientaDB(herramienta, req.params.idHerramienta);
    return res.json({ filas, mensaje: 'Herramienta Editado Correctamente' });
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarArticulo = async (req, res) => {
  let articulo = req.body.articulo;
  try {
    let filas = await logicaDB.editarArticuloDB(articulo, req.params.idArticulo);
    return res.json({ filas, mensaje: 'Articulo Editado Correctamente' });
  } catch (error) {
    return res.send('error:' + error);
  }
};

const eliminarDescripcion = async (req, res) => {
  try {
    let filas = await logicaDB.eliminarDescripcionDB(req.params.idDescripcion);
    return res.json({ filas, mensaje: 'Descripción Eliminada Correctamente' });
  } catch (error) {
    return res.status(404).send('error: ' + error);
  }
};

const eliminarHerramienta = async (req, res) => {
  try {
    let filas = await logicaDB.eliminarHerramientaDB(req.params.idHerramienta);
    return res.json({ filas, mensaje: 'Herramienta Eliminado Correctamente' });
  } catch (error) {
    return res.status(404).send('error: ' + error);
  }
};

const eliminarArticulo = async (req, res) => {
  try {
    let filas = await logicaDB.eliminarArticuloDB(req.params.idArticulo);
    return res.json({ filas, mensaje: 'Articulo Eliminado Correctamente' });
  } catch (error) {
    return res.status(404).send('error: ' + error);
  }
};

/** APARTADO DE IMG_EXTRA */

const crearImgExtra = async (req, res) => {
  const { categoriaServicioId } = req.body;
  const imgData = {
    url: req.file.path,
    categoriaServicioId: categoriaServicioId
  };
  try {
    let img = await logicaDB.crearImgExtraDB(imgData);
    return res.json({ img });
  } catch (error) {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ error });
  }
};

const editarImgExtra = async (req, res) => {
  const { categoriaServicioId } = req.body;
  const imgData = {
    categoriaServicioId: categoriaServicioId
  };
  try{
    const img = await logicaDB.buscarImgExtraIdDB(req.params.idImg)
    if (req.file) {
        imgData.url = req.file.path;
        fs.unlinkSync(path.resolve(img.url));
    }
    let filas = await logicaDB.editarImgExtraDB(imgData,req.params.idImg)
    return res.json({filas})
  }catch(error){
    fs.unlinkSync(path.resolve(req.file.path)); 
    return res.json({error})
  }
};

const obtenerImgExtra = async (req, res) => {
    try{
        let img = await logicaDB.obtenerImgExtra(req.oarams.idImg)
        return res.json({img})
    }catch(error){
        return res.json({error})
    }
};

module.exports = {
  crearCateServicio,
  editarCateServicio,
  obtenerCateServicioId,
  desactivarCateServicio,
  activarCateServicio,
  obtenerCateServiciosActivos,
  obtenerCateServiciosInactivos,
  editarDescripcion,
  editarHerramienta,
  editarArticulo,
  eliminarDescripcion,
  eliminarHerramienta,
  eliminarArticulo,
  crearImgExtra,
  editarImgExtra,
  obtenerImgExtra
};
