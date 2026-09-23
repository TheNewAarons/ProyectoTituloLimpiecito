const express = require('express');
const archivos_sis_web = express.Router();
const path = require('path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');

//OBTENER TODOS LOS DOCUMENTOS PARA EL PUBLICO (TIPO = PUBLICO)
archivos_sis_web.get('/obtener-asociacion-publico/:categoria/:search?', async (req, res) => {

	if(req.params.search){
		if(req.params.categoria === 'Todos'){
			Documento.findAll({
				include: [{ model: Categoria }],
				where: {
				  
					'$categoria_documento.tipo$': 'Publico',
					
					  [Op.or]: [
						//{ '$categoria_documento.nombre$': { [Op.like]: '%' + req.params.search + '%' } },
						{ nombre: { [Op.like]: '%' + req.params.search + '%' } }
					  ]
					
				  
				},
				order: [['id', 'DESC']]
			  })
				.then((documentos) => {
				  return res.json({ documentos });
				})
				.catch((error) => {
				  return res.status(400).send('error: ' + error);
				});
		}else{
			Documento.findAll({
				include: [{ model: Categoria }],
				where: {
				  
					 '$categoria_documento.nombre$': req.params.categoria ,					
					
					  [Op.or]: [
						//{ '$categoria_documento.nombre$': { [Op.like]: '%' + req.params.search + '%' } },
						{ nombre: { [Op.like]: '%' + req.params.search + '%' } }
					  ]
					
				  
				},
				order: [['id', 'DESC']]
			  })
				.then((documentos) => {
				  return res.json({ documentos });
				})
				.catch((error) => {
				  return res.status(400).send('error: ' + error);
				});
		}
	}else{
		if(req.params.categoria === 'Todos'){
			Documento.findAll({
		        include: [{ model: Categoria }],
		        where: {
		          '$categoria_documento.tipo$' : 'Publico'
		        },
		        order: [['id', 'DESC']]
		    })
	        .then((documentos) => {
	          return res.json({ documentos });
	        })
	        .catch((error) => {
	          return res.status(400).send('error: ' + error);
	    	});
		}else{
			Documento.findAll({
		        include: [{ model: Categoria }],
		        where: {
		         '$categoria_documento.nombre$' : req.params.categoria
		        },
		        order: [['id', 'DESC']]
		    })
	        .then((documentos) => {
	          return res.json({ documentos });
	        })
	        .catch((error) => {
	          return res.status(400).send('error: ' + error);
	    	});
		}
	}


});

//VER DOCUMENTO
archivos_sis_web.get('/obtener-documento/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      return res.status(200).json({ documento });
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});

//DESCARGAR DOCUMENTO PDF
archivos_sis_web.get('/descargar-pdf/:idDocumento', async (req, res) => {
  Documento.findOne({ where: { id: req.params.idDocumento } })
    .then((documento) => {
      let filePath = path.join(__dirname, '../../', documento.url);
      return res.status(200).sendFile(filePath);
    })
    .catch((error) => {
      return res.status(400).send('error: ' + error);
    });
});




module.exports = archivos_sis_web;