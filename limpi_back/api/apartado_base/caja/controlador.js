const logicaDB = require('./logica');
const cajaService = require('../../../services/caja');
const AppError = require('../../../libs/app-error');

const crearCaja = async (req, res) => {
  const caja = JSON.parse(req.body.caja);
  const cajaData = {
    fecha_inicio: new Date(caja.fecha_inicio),
    fecha_cierre: caja.fecha_cierre,
    total_ingreso: caja.total_ingreso,
    total_egreso: caja.total_egreso,
    utilidad: caja.utilidad,
    total_perdida: caja.total_perdida,
    estado: caja.estado,
    cf: caja.cf,
    usuarioId: caja.usuarioId
  };
  try {
    let nueva_caja = await logicaDB.crearCajaDB(cajaData);
    return res.json({ caja: nueva_caja });
  } catch (error) {
    return res.send('error' + error);
  }
};

const editarCaja = async (req, res) => {
  const caja = JSON.parse(req.body.caja);
  const cajaData = {
    fecha_inicio: caja.fecha_inicio,
    fecha_cierre: caja.fecha_cierre,
    total_ingreso: caja.total_ingreso,
    total_egreso: caja.total_egreso,
    utilidad: caja.utilidad,
    total_perdida: caja.total_perdida,
    estado: caja.estado,
    cf: caja.cf,
    usuarioId: caja.usuarioId
  };
  try {
    let caja = await logicaDB.obtenerCajaIdDB(req.params.id);
    if (caja) {
      let filas_update = await logicaDB.editarCajaDB(req.params.id, cajaData);
      return res.json({ filas: filas_update });
    } else {
      return res.send('error: ' + error);
    }
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const editarCierraCaja = async (req, res) => {
  const caja = JSON.parse(req.body.caja);
  const cajaData = {
    fecha_inicio: caja.fecha_inicio,
    fecha_cierre: caja.fecha_cierre,
    total_ingreso: caja.total_ingreso,
    total_egreso: caja.total_egreso,
    utilidad: caja.utilidad,
    total_perdida: caja.total_perdida,
    estado: caja.estado,
    cf: caja.cf,
    usuarioId: caja.usuarioId
  };
  try {
    let caja = await logicaDB.obtenerCajaIdDB(req.params.id);
    if (caja) {
      let filas_update = await logicaDB.editarCajaDB(req.params.id, cajaData);
      return res.json({ filas: filas_update });
    } else {
      return res.send('error: ' + error);
    }
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const obtenerTodasCajasDetalle = async (req, res) => {
  try {
    let cajas = await logicaDB.obtenerTodasCajasdetalleDB();
    return res.json({ cajas });
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const obtenerTodasCajas = async (req, res) => {
  try {
    let cajas = await logicaDB.obtenerTodasCajasDB();
    return res.json({ cajas });
  } catch (error) {
    return res.send('error: ' + error);
  }
};

const obtenerCajaActiva = async (req, res) => {
  try {
    let caja = await logicaDB.obtenerCajaActivaDB();
    return res.json({ caja });
  } catch (error) {
    return res.send('error:' + error);
  }
};

const obtenerCajaId = async (req, res) => {
  try {
    let caja = await logicaDB.obtenerCajaIdDB(req.params.id);
    return res.json({ caja });
  } catch (error) {
    return res.send('error:' + error);
  }
};

// RF-CAJA-01: el cierre legacy delega en services/caja.cerrarMes (transaccion, saldo encadenado,
// auditoria, sin doble conteo de liquidaciones). Se mantiene la respuesta { cerrar, mensaje }.
// La fecha de cierre ya no se toma del cliente (D-030).
const cerrarCaja = async (req, res) => {
  try {
    if (!req.usuario || !req.usuario.id) {
      return res.status(401).json({ cerrar: false, mensaje: 'Usuario no autenticado' });
    }
    const caja = await logicaDB.obtenerCajaIdDB(req.params.idCaja);
    if (!caja) {
      return res.json({ cerrar: false, mensaje: 'No se puede cerrar la caja' });
    }
    const usuario = { id: req.usuario.id, contexto: req.usuario.contexto };
    await cajaService.cerrarMes(caja.periodo, { usuario, ip: req.ip });
    return res.json({ cerrar: true, mensaje: 'Tu Caja ha sido cerrada correctamente' });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === 'CENTROS_ABIERTOS') {
        return res.json({
          cerrar: false,
          mensaje: `No se puede cerrar la caja, existen ${error.details.cantidad} Centro(s) de Costo(s) abierto(s)`
        });
      }
      return res.json({ cerrar: false, mensaje: error.message });
    }
    console.error('[caja] cerrarCaja fallo:', error && error.name, error && error.code);
    return res.status(500).json({ cerrar: false, mensaje: 'No se pudo cerrar la caja' });
  }
};

module.exports = {
  crearCaja,
  editarCaja,
  editarCierraCaja,
  obtenerTodasCajasDetalle,
  obtenerTodasCajas,
  obtenerCajaActiva,
  obtenerCajaId,
  cerrarCaja
};
