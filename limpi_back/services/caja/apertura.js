/**
 * RF-CAJA-01 — Apertura automática de la caja del mes (job día 1, 00:05 America/Santiago).
 * Idempotente: bajo el mutex de estructura (bloquearCajas) si la caja del periodo ya existe no
 * escribe ni audita. Se registra en index.js tras el flag CAJA_APERTURA_AUTOMATICA (apagado por defecto).
 */

const Sequelize = require('sequelize');

const db = require('../../database/database');
const Caja = require('../../modelos/sistema_base/Caja');
const AppError = require('../../libs/app-error');
const fecha = require('../../libs/fecha');
const { auditar } = require('../auditoria');
const { CAJA_ABIERTA } = require('../constantes');
const { aEnteroCLP } = require('./saldo');
const { bloquearCajas, buscarAncla, saldoArrastre, reintentarTransaccion, primerDiaDePeriodo } = require('./cierre');

const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;
const USUARIO_SISTEMA = { id: null, contexto: 'sistema' };

/**
 * Crea la caja del mes `periodo` si no existe (por defecto el mes actual en America/Santiago).
 * `saldo_inicial` = saldo arrastrado del mes anterior existente; `saldo_provisional = true` si ese
 * mes sigue ABIERTO.
 * @param {{periodo?: string}} [opciones]
 * @returns {Promise<{creada: boolean, periodo: string, caja: (object|null)}>}
 */
async function abrirMesAutomatico(opciones) {
  const periodo = (opciones && opciones.periodo) || fecha.hoySantiago().slice(0, 7);
  if (!fecha.esPeriodoValido(periodo)) {
    throw new AppError('PERIODO_INVALIDO', 'periodo invalido, formato esperado YYYY-MM: ' + periodo, 400, { periodo: periodo });
  }

  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const cajas = await bloquearCajas(t);
      const existente = cajas.filter(function (c) { return c.periodo === periodo; })[0];
      if (existente) return { creada: false, periodo: periodo, caja: existente };

      const ancla = buscarAncla(cajas, periodo);
      const saldoInicial = ancla ? aEnteroCLP(await saldoArrastre(ancla, t)) : 0;
      const maxId = await Caja.max('id', { transaction: t });
      const caja = await Caja.create(
        {
          id: (maxId || 0) + 1,
          periodo: periodo,
          fecha_inicio: primerDiaDePeriodo(periodo),
          estado: CAJA_ABIERTA,
          saldo_inicial: saldoInicial,
          saldo_final: null,
          saldo_provisional: !!ancla && ancla.estado === CAJA_ABIERTA,
          total_ingreso: 0,
          total_egreso: 0,
          utilidad: 0,
          total_perdida: 0
        },
        { transaction: t }
      );
      await auditar({
        transaction: t,
        usuario: USUARIO_SISTEMA,
        entidad: 'cajas',
        entidad_id: caja.id,
        accion: 'CREAR',
        antes: null,
        despues: caja,
        motivo: 'APERTURA_AUTOMATICA'
      });
      return { creada: true, periodo: periodo, caja: caja };
    });
  }, { incluirDuplicado: true });
}

/**
 * Callback del cron: nunca lanza (no debe tumbar el proceso) y solo loguea datos no sensibles.
 * @returns {Promise<{creada: boolean, periodo: string}|null>} null si falló
 */
async function jobAperturaMensual() {
  try {
    const r = await abrirMesAutomatico();
    console.log('[caja] apertura automatica ' + r.periodo + ': ' + (r.creada ? 'creada' : 'ya existia'));
    return { creada: r.creada, periodo: r.periodo };
  } catch (error) {
    console.error('[caja] apertura automatica fallida: ' + (error && error.code ? error.code : error && error.message));
    return null;
  }
}

module.exports = {
  abrirMesAutomatico: abrirMesAutomatico,
  jobAperturaMensual: jobAperturaMensual
};
