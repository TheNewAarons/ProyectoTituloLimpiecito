const express = require('express');
const clientes = express.Router();
const cors = require('cors');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Cliente = require('../../modelos/sistema_base/Cliente');
const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente');
const Documento = require('../../modelos/sistema_base/Documento');
const Categoria = require('../../modelos/sistema_base/Categoria');
const CarpetaPadre = require('../../modelos/sist_doc_cliente/Carpeta_padre')

Cliente.hasMany(Acceso_cliente);
Cliente.hasOne(CarpetaPadre)

clientes.use(cors());

// CREAR CLIENTE
clientes.post('/crear', (req, res) => {
  const cliente = JSON.parse(req.body.cliente);
  const clienteData = {
    representante: cliente.representante,
    encargado_contrato: cliente.encargado_contrato,
    fecha_facturacion: new Date(cliente.fecha_facturacion),
    fecha_inicio_contrato: new Date(cliente.fecha_inicio_contrato),
    fecha_termino_contrato: new Date(cliente.fecha_termino_contrato),
    cant_trabajadores: cliente.cant_trabajadores,
    correo_encargado: cliente.correo_encargado,
    numero_contacto: cliente.numero_contacto,
    valor_factura: cliente.valor_factura,
    otra_informacion: cliente.otra_informacion,
    estado: cliente.estado
  };
  if (cliente.fecha_facturacion == null) {
    clienteData.fecha_facturacion = null;
  }
  if (cliente.fecha_inicio_contrato == null) {
    clienteData.fecha_inicio_contrato = null;
  }
  if (cliente.fecha_termino_contrato == null) {
    clienteData.fecha_termino_contrato = null;
  }
  Cliente.create(clienteData)
    .then((newcliente) => {
      res.json({ cliente: newcliente });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//EDITAR CLIENTE
clientes.put('/editar/:id', (req, res) => {
  const cliente = JSON.parse(req.body.cliente);
  const clienteData = {
    representante: cliente.representante,
    encargado_contrato: cliente.encargado_contrato,
    fecha_facturacion: cliente.fecha_facturacion,
    fecha_inicio_contrato: cliente.fecha_inicio_contrato,
    fecha_termino_contrato: cliente.fecha_termino_contrato,
    cant_trabajadores: cliente.cant_trabajadores,
    correo_encargado: cliente.correo_encargado,
    numero_contacto: cliente.numero_contacto,
    valor_factura: cliente.valor_factura,
    otra_informacion: cliente.otra_informacion,
    estado: cliente.estado
  };
  if (cliente.fecha_facturacion == null) {
    clienteData.fecha_facturacion = null;
  }
  if (cliente.fecha_inicio_contrato == null) {
    clienteData.fecha_facturacion = null;
  }
  if (cliente.fecha_termino_contrato == null) {
    clienteData.fecha_termino_contrato = null;
  }
  Cliente.update(clienteData, { where: { id: req.params.id } })
    .then((filas) => {
      res.json({
        fila: filas
      });
    })
    .catch((error) => {
      res.send('error: ' + error);
    });
});
//VER LOS CLIENTES ACTIVOS
clientes.get('/ver-activo', (req, res) => {
  Cliente.findAll({
    where: {
      estado: 1
    },
    order: [['id', 'DESC']]
  })
    .then((clientes) => {
      res.json({ clientes: clientes });
    })
    .catch((error) => {
      res.send('error:' + error);
    });
});

//VER LOS CLIENTES INACTIVOS
clientes.get('/ver-inactivo', (req, res) => {
  Cliente.findAll({
    where: {
      estado: 0
    },
    order: [['id', 'DESC']]
  })
    .then((clientes) => {
      res.json({ clientes: clientes });
    })
    .catch((error) => {
      res.send('error:' + error);
    });
});
//ELIMINAR CLIENTE (CAMBIAR ESTADO A INACTIVO)
clientes.delete('/eliminar/:id', (req, res) => {
  Cliente.update({ estado: 0 }, { where: { id: req.params.id } })
    .then((filas) => {
      res.json({ filas: filas });
    })
    .catch((error) => {
      res.send('error:' + error);
    });
});
//ACTIVAR CLIENTE (CAMBIAR ESTADO A ACTIVO)
clientes.delete('/activar/:id', (req, res) => {
  Cliente.update({ estado: 1 }, { where: { id: req.params.id } })
    .then((filas) => {
      res.json({ filas: filas });
    })
    .catch((error) => {
      res.send('error:' + error);
    });
});

//OBTENER CLIENTE POR ID
clientes.get('/obtener-cliente/:id', (req, res) => {
  Cliente.findById(req.params.id, {
    include: [{ model: Acceso_cliente }]
  })
    .then((cliente) => {
      return res.json({ cliente });
    })
    .catch((error) => {
      return res.send('error:' + error);
    });
});

//BUSCAR EN LOS CLIENTES ACTIVOS
clientes.get('/busca-activo/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Cliente.findAll({
      where: {
        estado: 1,
        [Op.or]: [
          {
            representante: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            encargado_contrato: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            numero_contacto: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      },
      order: [['id', 'DESC']]
    })
      .then((clientes) => {
        res.json({ clientes: clientes });
      })
      .catch((error) => {
        res.send('error:' + error);
      });
  } else {
    Cliente.findAll({
      where: {
        estado: 1
      },
      order: [['id', 'DESC']]
    })
      .then((clientes) => {
        res.json({ clientes: clientes });
      })
      .catch((error) => {
        res.send('error:' + error);
      });
  }
});

//BUSCAR EN LOS CLIENTES INACTIVOS
clientes.get('/busca-inactivo/:busca?', (req, res) => {
  if (req.params.busca != null) {
    Cliente.findAll({
      where: {
        estado: 0,
        [Op.or]: [
          {
            representante: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            encargado_contrato: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          {
            numero_contacto: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          }
        ]
      },
      order: [['id', 'DESC']]
    })
      .then((clientes) => {
        res.json({ clientes: clientes });
      })
      .catch((error) => {
        res.send('error:' + error);
      });
  } else {
    Cliente.findAll({
      where: {
        estado: 0
      },
      order: [['id', 'DESC']]
    })
      .then((clientes) => {
        res.json({ clientes: clientes });
      })
      .catch((error) => {
        res.send('error:' + error);
      });
  }
});

/** CLIENTES PARA EL SISTEMA DE CARPETAS-DOCUMENTOS */

//OBTENER CLIENTES ACTIVOS CON CARPETA PADRE
clientes.get('/obtener-clientes-carpeta',async(req,res)=>{
    Cliente.findAll({
      include:[CarpetaPadre],
      where:{
        estado:1 
      },
      order:[['id','DESC']]
    })
    .then((clientes) => {
      return res.json({ clientes: clientes });
    })
    .catch((error) => {
      return res.json({error});
    });
})

//BUSCAR EN CLIENTES ACTIVOS CON CARPETA PADRE
clientes.get('/buscar-clientes-carpeta/:busca?',async(req,res)=>{
  if(req.params.busca != null){
    Cliente.findAll({
      include:[CarpetaPadre],
      where:{
        estado:1,
        [Op.or]: [
          { representante: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
          { encargado_contrato: {
              [Op.like]: '%' + req.params.busca + '%'
            }
          },
        ]
      },
      order:[['id','DESC']]
    })
    .then((clientes) => {
      return res.json({ clientes: clientes });
    })
    .catch((error) => {
      return res.json({error});
    });
  }else{
    Cliente.findAll({
      include:[CarpetaPadre],
      where:{
        estado:1 
      },
      order:[['id','DESC']]
    })
    .then((clientes) => {
      return res.json({ clientes: clientes });
    })
    .catch((error) => {
      return res.json({error});
    });
  }
})

module.exports = clientes;
