const logicaDB = require('./logica');

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

const cerrarCaja = async (req, res) => {
  const { fecha } = req.body;
  try {
    let cant_centro_abierto = await logicaDB.obtenerCantidadCentroCostoAbiertoDB(req.params.idCaja);
    if (cant_centro_abierto === 0) {
      let centros = await logicaDB.obtenerCentroCostoCerradoDB(req.params.idCaja);
      let egresos = await logicaDB.obtenerEgresoCajaDB(req.params.idCaja);
      let total_egreso = 0;
      for (i = 0; i < egresos.length; i++) {
        total_egreso += egresos[i].monto;
      }
      let moment_total_cc_egreso = 0;
      let moment_total_cc_ingreso = 0;
      let moment_total_cc_utilidad = 0;
      for (e = 0; e < centros.length; e++) {
        moment_total_cc_utilidad += centros[e].utilidad;
        moment_total_cc_egreso += centros[e].total_costos;
        moment_total_cc_ingreso += centros[e].precio_servicio;
      }
      let total_cc_ingreso = moment_total_cc_ingreso;
      let total_cc_egreso = moment_total_cc_egreso + total_egreso;
      let total_cc_utilidad = moment_total_cc_utilidad - total_egreso;

      const cajaData = {
        fecha_cierre: fecha,
        total_ingreso: total_cc_ingreso,
        total_egreso: total_cc_egreso,
        utilidad: total_cc_utilidad,
        estado: 0
      };
      let filas = await logicaDB.editarCajaDB(req.params.idCaja, cajaData);
      if (filas == 1) {
        return res.json({ cerrar: true, mensaje: 'Tu Caja ha sido cerrada correctamente' });
      } else {
        return res.json({
          cerrar: false,
          mensaje: 'No se puede cerrar la caja'
        });
      }
    } else {
      return res.json({
        cerrar: false,
        mensaje: `No se puede cerrar la caja, existen ${cant_centro_abierto} Centro(s) de Costo(s) abierto(s)`
      });
    }
  } catch (error) {
    return res.send('error:' + error);
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
