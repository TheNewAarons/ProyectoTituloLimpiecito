const express = require('express');
const cate_servicios = express.Router();
const multer = require('../../libs/multer-categoria');
const multer_extra = require('../../libs/multer-extra')
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Cate_servicio = require('../../modelos/sist_app/Categoria_servicio');
const Horario = require('../../modelos/sist_app/Horario');

//MODELOS PERTENECIENTES A Categoria servicio
const Descripcion = require('../../modelos/sist_app/Descripcion');
const Herramienta = require('../../modelos/sist_app/Herramienta');
const Articulo = require('../../modelos/sist_app/Articulo');
const Servicio = require('../../modelos/sist_app/Servicio');
const Bloque = require('../../modelos/sist_app/Bloque');
const Img_extra = require('../../modelos/sist_app/Img_extra')
const Dia = require('../../modelos/sist_app/Dia')

//PARA REALIZAR TRANSACCIONES
const sequelize_cate = Cate_servicio.sequelize;

//ASOCIACIONES
Cate_servicio.hasOne(Horario);
Cate_servicio.hasMany(Descripcion);
Cate_servicio.hasMany(Herramienta);
Cate_servicio.hasMany(Articulo);
Cate_servicio.hasMany(Servicio);
Cate_servicio.hasOne(Img_extra);
Horario.hasMany(Dia);

//CREAR CATEGORIA SERVICIOS
cate_servicios.post('/crear', multer.single('image'), async (req, res) => {
  const { nombre, activar_cantidad, estado, herramientas, articulos, descripciones } = req.body;
  const desc_array = JSON.parse(descripciones);
  const herra_array = JSON.parse(herramientas);
  const arti_array = JSON.parse(articulos);

  let existe = await Cate_servicio.findOne({ where: { nombre: nombre } });
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
    try {
      const resultado = await sequelize_cate.transaction(async (t) => {
        const new_cate = await Cate_servicio.create(cateServicioData, { transaction: t });
        //Crear Descripciones
        if (desc_array.length > 0) {
          for (let index = 0; index < desc_array.length; index++) {
            let descData = {
              texto: desc_array[index].texto,
              categoriaServicioId: new_cate.dataValues.id
            };
            await Descripcion.create(descData, { transaction: t });
          }
        }
        //Crear Herramientas
        if (herra_array.length > 0) {
          for (let index2 = 0; index2 < herra_array.length; index2++) {
            let herraData = {
              texto: herra_array[index2].texto,
              categoriaServicioId: new_cate.dataValues.id
            };
            await Herramienta.create(herraData, { transaction: t });
          }
        }
        //Crear Articulos
        if (arti_array.length > 0) {
          for (let index3 = 0; index3 < arti_array.length; index3++) {
            let artiData = {
              texto: arti_array[index3].texto,
              categoriaServicioId: new_cate.dataValues.id
            };
            await Articulo.create(artiData, { transaction: t });
          }
        }
        return new_cate;
      });
      return res.json({ mensaje: 'Categoria servicio creado correctamente', cate_servicio: resultado });
    } catch (error) {
      fs.unlinkSync(path.resolve(req.file.path));
      return res.status(400).json({ error, mensaje: 'Ocurrio un problema al crear la categoria servicio' });
    }
  }
});

//EDITAR CATEGORIA SERVICIOS
cate_servicios.put('/editar/:idCate_servicio', multer.single('image'), async (req, res) => {
  const { nombre, activar_cantidad, estado } = req.body;
  let cateServicio = await Cate_servicio.findById(req.params.idCate_servicio);
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
    Cate_servicio.update(cateServicioData, { where: { id: req.params.idCate_servicio } })
      .then((filas) => {
        return res.json({ filas, mensaje: 'Categoria Servicio Editada Correctamente' });
      })
      .catch((error) => {
        fs.unlinkSync(path.resolve(req.file.path));
        return res.send('error: ' + error);
      });
  } else {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({ mensaje: 'La categoria servicio ha editar no existe' });
  }
});

//OBTENER CATEGORIA POR ID
cate_servicios.get('/obtener-cate-servicio/:idCate_servicio', async (req, res) => {
  Cate_servicio.findById(req.params.idCate_servicio, {
    include: [{ model: Horario,include:[{model:Dia, include: [Bloque]}] } , { model: Descripcion }, { model: Herramienta }, { model: Articulo },{model:Img_extra}]
  })
    .then((cate_servicio) => {
      if (cate_servicio) {
        return res.json({ cate_servicio });
      } else {
        return res.json({ mensaje: 'La categoria servicio ha obtener no existe' });
      }
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//DESACTIVAR CATEGORIAS SERVICIOS
cate_servicios.delete('/desactivar-cate/:idCate_servicio', async (req, res) => {
  Cate_servicio.update({ estado: 0 }, { where: { id: req.params.idCate_servicio } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Categoria Servicio desactivado satisfactoriamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//ACTIVAR CATEGORIAS SERVICIOS
cate_servicios.delete('/activar-cate/:idCate_servicio', async (req, res) => {
  Cate_servicio.update({ estado: 1 }, { where: { id: req.params.idCate_servicio } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Categoria Servicio activado satisfactoriamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER CATEGORIAS SERVICIOS ACTIVOS
cate_servicios.get('/obtener-cate-serv-activos', async (req, res) => {
  Cate_servicio.findAll({ where: { estado: 1 } })
    .then((cate_servicios) => {
      return res.json({ cate_servicios });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//OBTENER CATEGORIAS SERVICIOS INACTIVOS
cate_servicios.get('/obtener-cate-serv-inactivos', async (req, res) => {
  Cate_servicio.findAll({ where: { estado: 0 } })
    .then((cate_servicios) => {
      return res.json({ cate_servicios });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

/** EDITAR Y ELIMINAR,  DESCRIPCION, HERRAMIENTA Y ARTICULO  */

//EDITAR DESCRIPCION POR ID
cate_servicios.put('/editar-descripcion/:idDescripcion', async (req, res) => {
  let descripcion = req.body.descripcion;
  Descripcion.update(descripcion, { where: { id: req.params.idDescripcion } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Descripción Editado Correctamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//EDITAR HERRAMIENTA POR ID
cate_servicios.put('/editar-herramienta/:idHerramienta', async (req, res) => {
  let herramienta = req.body.herramienta;
  Herramienta.update(herramienta, { where: { id: req.params.idHerramienta } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Herramienta Editado Correctamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//EDITAR ARTICULO POR ID
cate_servicios.put('/editar-articulo/:idArticulo', async (req, res) => {
  let articulo = req.body.articulo;
  Articulo.update(articulo, { where: { id: req.params.idArticulo } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Articulo Editado Correctamente' });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//ELIMINAR DESCRIPCION POR ID
cate_servicios.delete('/eliminar-descripcion/:idDescripcion', async (req, res) => {
  Descripcion.destroy({ where: { id: req.params.idDescripcion } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Descripción Eliminada Correctamente' });
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//ELIMINAR HERRAMIENTA POR ID
cate_servicios.delete('/eliminar-herramienta/:idHerramienta', async (req, res) => {
  Herramienta.destroy({ where: { id: req.params.idHerramienta } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Herramienta Eliminado Correctamente' });
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});

//ELIMINAR ARTICULO POR ID
cate_servicios.delete('/eliminar-articulo/:idArticulo', async (req, res) => {
  Articulo.destroy({ where: { id: req.params.idArticulo } })
    .then((filas) => {
      return res.json({ filas, mensaje: 'Articulo Eliminado Correctamente' });
    })
    .catch((error) => {
      return res.status(404).send('error: ' + error);
    });
});


/** APARTADO DE IMG_EXTRA */

//CREAR IMG EXTRA
cate_servicios.post('/crear-img-extra',multer_extra.single('image'),async(req,res)=>{
  const { categoriaServicioId } = req.body
  const imgData={
    url: req.file.path,
    categoriaServicioId: categoriaServicioId
  }
  Img_extra.create(imgData)
  .then(img => {
    return res.json({img})
  })
  .catch(error => {
    fs.unlinkSync(path.resolve(req.file.path));
    return res.json({error})
  })
})
//EDITAR IMG EXTRA
cate_servicios.put('/editar-img-extra/:idImg',multer_extra.single('image'),async(req,res)=>{
  const { categoriaServicioId } = req.body
  const imgData={
    categoriaServicioId: categoriaServicioId
  }
  const img = await Img_extra.findById(req.params.idImg) 
  if (req.file) {
    imgData.url = req.file.path;
    fs.unlinkSync(path.resolve(img.url));
  }
  Img_extra.update(imgData,{where:{id:req.params.idImg}})
  .then(filas => {
    console.log(filas);
    return res.json({filas})
  })
  .catch(error => {
    fs.unlinkSync(path.resolve(req.file.path)); 
    return res.json({error})
  })
})
//OBTENER IMG EXTRA
cate_servicios.get('/obtener-img-extra/:idImg',async(req,res)=>{
  Img_extra.findById(req.params.idImg)
  .then(img => {
    return res.json({img})
  })
  .catch(error => {
    return res.json({error})
  })
})

module.exports = cate_servicios; 
