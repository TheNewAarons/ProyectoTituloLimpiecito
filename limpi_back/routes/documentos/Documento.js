const express = require('express');
const documentos = express.Router();
const multer = require('../../libs/multer');
const fs = require('fs');
const path = require('path');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');
const Asoc_trabajador = require('../../modelos/sistema_base/Asociacion_trabajador');

// AUT-011: PDF real = extensión .pdf + firma "%PDF-" (sin el tope de 10 MB de los documentos públicos, para no restringir los internos).
function esPdf(ruta) {
  return new Promise((resolve) => {
    if (path.extname(ruta).toLowerCase() !== '.pdf') return resolve(false);
    fs.open(ruta, 'r', (err, fd) => {
      if (err) return resolve(false);
      const buf = Buffer.alloc(5);
      fs.read(fd, buf, 0, 5, 0, (errRead) => {
        fs.close(fd, () => {});
        resolve(!errRead && buf.toString('ascii') === '%PDF-');
      });
    });
  });
}

Documento.belongsTo(Categoria);

//CREAR DOCUMENTO COMO INSTANCIA Y SUBIDA DE ARCHIVO
documentos.post('/crear', multer.single('pdf'), async (req, res) => {
  const { fecha_subida, categoriaDocumentoId, estado, nombre } = req.body || {};
  // AUT-011 (obs. 15/17): sin archivo, archivo que no es PDF o sin categoría -> 400, sin detener el proceso.
  const rechazar = (mensaje) => {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ mensaje: mensaje });
  };
  if (!req.file) return rechazar('Debe adjuntar un archivo PDF.');
  if (!(await esPdf(req.file.path))) return rechazar('El archivo no es un PDF válido.');
  const idCategoria = Number(categoriaDocumentoId);
  try {
    if (!Number.isSafeInteger(idCategoria) || idCategoria <= 0 || !(await Categoria.findById(idCategoria))) {
      return rechazar('Debe elegir una categoría válida.');
    }
  } catch (error) {
    return res.send('error: ' + error);
  }
  const documentoData = {
    nombre: nombre,
    fecha_subida: fecha_subida,
    url: req.file.path,
    categoriaDocumentoId: Number(categoriaDocumentoId),
    //estado: Boolean(estado)
    estado: Boolean(estado)
  };
  Documento.create(documentoData)
    .then((documento) => {
      return res.json({ documento: documento });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//EDITAR DOCUMENTO COMO INSTANCIA
documentos.put('/editar/:id', async (req, res) => {
  const { nombre, categoriaDocumentoId } = req.body || {};
  // AUT-011 (obs. 17): editar con la categoría vacía dejaba documentos sin categoría.
  const idCategoria = Number(categoriaDocumentoId);
  try {
    if (!Number.isSafeInteger(idCategoria) || idCategoria <= 0 || !(await Categoria.findById(idCategoria))) {
      return res.status(400).json({ mensaje: 'Debe elegir una categoría válida.' });
    }
  } catch (error) {
    return res.send('error: ' + error);
  }
  Documento.update({ nombre: nombre, categoriaDocumentoId: categoriaDocumentoId }, { where: { id: req.params.id } })
    .then((filas) => {
      return res.json({ filas });
    })
    .catch((error) => {
      return res.send('error: ' + error);
    });
});

//REEMPLAZAR EL ARCHIVO DE UN DOCUMENTO (AUT-011, RF-010.2): la descarga y "Ver Documento" entregan la versión nueva.
// El archivo anterior se conserva en disco (reversible; ver Docs/DECISIONES.md D-WEB-02-R1).
documentos.put('/reemplazar-archivo/:id', multer.single('pdf'), async (req, res) => {
  const rechazar = (estado, mensaje) => {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(estado).json({ mensaje: mensaje });
  };
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return rechazar(400, 'Documento inválido.');
  if (!req.file) return rechazar(400, 'Debe adjuntar un archivo PDF.');
  if (!(await esPdf(req.file.path))) return rechazar(400, 'El archivo no es un PDF válido.');
  try {
    const documento = await Documento.findById(id);
    if (!documento) return rechazar(404, 'El documento no existe.');
    await Documento.update({ url: req.file.path }, { where: { id: id } });
    return res.json({ documento: { id: id, url: req.file.path } });
  } catch (error) {
    return rechazar(500, 'No se pudo reemplazar el archivo.');
  }
});

//ELIMINAR DOCUMENTO E INSTANCIA
documentos.delete('/eliminar/:idDocumento', async (req, res) => {
  const documento = await Documento.findById(req.params.idDocumento);
  if (documento) {
    let cont_trabajador = await Asoc_trabajador.count({ where: { documentoId: documento.id } });

    if (cont_trabajador === 0) {
      const result = await Documento.destroy({
        where: { id: req.params.idDocumento }
      });
      if (result == 1) {
        // AUT-011: si el archivo ya no está en disco no se detiene el proceso (el registro igual se eliminó).
        try { fs.unlinkSync(path.resolve(documento.url)); } catch (e) { console.warn('[documentos] archivo no encontrado al eliminar:', documento.url); }
      }
      return res.status(200).json({
        eliminar: true,
        mensaje: 'Tu Documento Ha Sido Eliminado'
      });
    } else {
      return res.json({
        eliminar: false,
        mensaje: `No Es Posible Eliminar, existen ${cont_trabajador} trabajadore(s) asociado(s)`
      });
    }
  } else {
    return res.json({ eliminar: false, mensaje: 'No Es Posible Eliminar' });
  }
});

//OBTENER DOCUMENTOS
documentos.get('/obtener-documentos', async (req, res) => {
  Documento.findAll({ include: [{ model: Categoria }], order: [['id', 'DESC']] })
    .then((documentos) => {
      return res.status(200).json({ documentos });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//VER DOCUMENTO
documentos.get('/obtener-documento/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      return res.status(200).json({ documento });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//DESCARGAR DOCUMENTO PDF
documentos.get('/descargar-pdf/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      let filePath = path.join(__dirname, '../../', documento.url);
      return res.status(200).sendFile(filePath);
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//BUSCAR DOCUMENTOS
documentos.get('/buscar-documento/:categoria/:search?', async (req, res) => {
  if (req.params.search != null) {
    if (req.params.categoria === 'Todos') {
      Documento.findAll({
        include: [{ model: Categoria }],
        where: {
          [Op.or]: [
            { nombre: { [Op.like]: '%' + req.params.search + '%' } },
            {
              '$categoria_documento.nombre$': {
                [Op.like]: '%' + req.params.search + '%'
              }
            }
          ]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    } else {
      Documento.findAll({
        include: [{ model: Categoria }],
        where: {
          '$categoria_documento.nombre$': req.params.categoria,
          [Op.or]: [
            { nombre: { [Op.like]: '%' + req.params.search + '%' } },
            {
              '$categoria_documento.nombre$': {
                [Op.like]: '%' + req.params.search + '%'
              }
            }
          ]
        },
        order: [['id', 'DESC']]
      })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    }
  } else {
    if (req.params.categoria === 'Todos') {
      Documento.findAll({ include: [{ model: Categoria }] })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    } else {
      Documento.findAll({ include: [{ model: Categoria }], where: { '$categoria_documento.nombre$': req.params.categoria } })
        .then((documentos) => {
          return res.status(200).json({ documentos });
        })
        .catch((error) => {
          return res.status(400).send('error: ' + error);
        });
    }
  }
});

module.exports = documentos;
