/**
 * RF-BI-05 — Aprobar, rechazar y finalizar reservas desde el ERP con reglas y trazabilidad.
 * Reemplaza (en las pantallas) las rutas legacy /md_app/reserva/{aprobar,rechazar,finalizar}-reserva, que no exigen
 * sesión, no validan el estado ni dejan auditoría. Las rutas legacy no se modifican (regla 9).
 * - Transiciones válidas: EN PROCESO (3) -> APROBADA (2) | RECHAZADA (4); APROBADA (2) -> FINALIZADA (1, pagado) | RECHAZADA (4).
 * - Cambio en transacción con bloqueo de la fila y auditoría (APROBAR / RECHAZAR con motivo / FINALIZAR).
 * - Correo al cliente después del commit; si falla, el cambio queda y se informa `correo_enviado: false`.
 */
const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const Reserva = require('../../modelos/sist_app/Reserva');
const UsuarioApp = require('../../modelos/sist_app/Usuario_app');
const Servicio = require('../../modelos/sist_app/Servicio');
const correos = require('./correo-aprobada');
const { crearTransporte, smtpConfigurado } = require('../correo/transporte');

const ESTADO = { FINALIZADA: 1, APROBADA: 2, EN_PROCESO: 3, RECHAZADA: 4 };
const TEXTO = { 1: 'Finalizada', 2: 'Aprobada', 3: 'En proceso', 4: 'Rechazada' };
const ACCIONES = {
  aprobar: { desde: [ESTADO.EN_PROCESO], a: ESTADO.APROBADA, auditoria: 'APROBAR', correo: 'armarCorreoAprobada' },
  rechazar: { desde: [ESTADO.EN_PROCESO, ESTADO.APROBADA], a: ESTADO.RECHAZADA, auditoria: 'RECHAZAR', correo: 'armarCorreoRechazada', pideMotivo: true },
  finalizar: { desde: [ESTADO.APROBADA], a: ESTADO.FINALIZADA, auditoria: 'FINALIZAR', correo: 'armarCorreoFinalizada', extra: { pagado: true } }
};

function idValido(v) {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new AppError('ID_INVALIDO', 'id invalido', 400, { id: v });
  return n;
}

/**
 * @param {'aprobar'|'rechazar'|'finalizar'} accion
 * @param {number|string} idTexto
 * @param {{usuario:{id,contexto}, ip?:string, motivo?:string, transporte?:object}} contexto
 */
async function cambiarEstado(accion, idTexto, contexto) {
  const regla = ACCIONES[accion];
  if (!regla) throw new AppError('ACCION_INVALIDA', 'accion invalida', 400, { accion: accion });
  const id = idValido(idTexto);
  const c = contexto || {};
  const motivo = typeof c.motivo === 'string' ? c.motivo.trim() : '';
  if (regla.pideMotivo && (motivo.length < 5 || motivo.length > 300)) {
    throw new AppError('MOTIVO_REQUERIDO', 'El motivo del rechazo debe tener entre 5 y 300 caracteres (se envía al cliente).', 400);
  }

  const reserva = await db.sequelize.transaction(async (t) => {
    const r = await Reserva.findById(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!r) throw new AppError('RESERVA_NO_EXISTE', 'La reserva no existe.', 404, { id: id });
    if (regla.desde.indexOf(Number(r.estado)) === -1) {
      throw new AppError('ESTADO_INVALIDO', 'No se puede ' + accion + ' una reserva ' + (TEXTO[r.estado] || r.estado).toLowerCase() + '.', 409,
        { id: id, estado: Number(r.estado) });
    }
    const antes = r.get({ plain: true });
    await r.update(Object.assign({ estado: regla.a }, regla.extra || {}), { transaction: t });
    await auditar({
      transaction: t, usuario: c.usuario, entidad: 'reservas', entidad_id: id, accion: regla.auditoria,
      antes: antes, despues: r, motivo: motivo || null, ip: c.ip || null
    });
    return r;
  });

  let correoEnviado = false;
  try {
    if (c.transporte || smtpConfigurado()) {
      const [usuario, servicio] = await Promise.all([UsuarioApp.findById(reserva.usuarioAppId), Servicio.findById(reserva.servicioId)]);
      if (usuario && usuario.correo && servicio) {
        const opciones = await correos[regla.correo]({ reserva: reserva, usuario: usuario, servicio: servicio, motivo: motivo });
        await (c.transporte || crearTransporte()).sendMail(opciones);
        correoEnviado = true;
      }
    }
  } catch (e) {
    console.error('[reservas] no se pudo enviar el correo de ' + accion + ':', e && e.message);
  }
  return { id: id, orden: reserva.orden, estado: regla.a, estado_texto: TEXTO[regla.a], correo_enviado: correoEnviado };
}

module.exports = { cambiarEstado, ACCIONES, ESTADO };
