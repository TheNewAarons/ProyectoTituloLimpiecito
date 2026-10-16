'use strict';

/**
 * RF-CAJA-01 paso 2 — Saldo encadenado de `cajas` (TASK_PLAN §2, §6, §9; DECISIONES D-026, D-028, D-029).
 *
 * Esquema: NO agrega columnas. Las columnas pedidas ya las crea `20261016041620-RF-CAJA-01-periodo-saldos-cajas`
 * (prerrequisito, validado en el pre-check): periodo CHAR(7) UNIQUE (`uq_cajas_periodo` es el índice de periodo),
 * saldo_inicial/saldo_final DECIMAL(14,0), saldo_provisional BOOLEAN DEFAULT false, cerrada_por.
 * `estado INTEGER` y `fecha_cierre` se conservan (D-029): 1 = 'ABIERTA', cualquier otro valor = 'CERRADA'
 * (mismo criterio que el legacy, que solo considera activa la caja con estado = 1).
 *
 * Datos (una transacción, cajas bloqueadas FOR UPDATE en orden de periodo):
 * - Movimiento de cada mes = ingresos − egresos con la lógica legacy de cerrarCaja
 *   (caja/logica.js + egreso/logica.js): ingresos = Σ centro_costos.precio_servicio (estado 0);
 *   egresos = Σ centro_costos.total_costos (estado 0) + Σ egresos.monto de la caja,
 *   SIN doble conteo (§9 N1): se excluyen egresos anulados (estado −1) y egresos de pago de liquidación
 *   (tipo 2 o referenciados por liquidaciones.egreso_id), porque la liquidación ya está en total_costos.
 * - Mes cerrado con totales guardados: se respeta el movimiento congelado total_ingreso − total_egreso (D-026, R2),
 *   restando solo el doble conteo anterior. Mes cerrado sin totales (NULL): se recalcula con la fórmula anterior.
 * - Mes abierto: saldo_final NULL; arrastra saldo_inicial + movimiento en vivo; los meses posteriores quedan
 *   saldo_provisional = true (§2 saldoArrastre, corrige C4).
 * - El primer mes conserva su saldo_inicial actual (regla 2 / C3). Huecos: se encadena con la caja anterior existente.
 * - Si hay cajas con cerrada_por (cierres del servicio nuevo) no se toca nada (la cadena la mantiene el servicio).
 * - Antes/después completos en `auditoria` (inmutable); el down restaura desde ese registro.
 * - Movimientos manuales de "déficit mes anterior": NO se anulan ni borran (D-028). Solo se listan en el log
 *   (líneas `[RF-CAJA-01][deficit]`) para Docs/migracion_caja.md.
 */

const TABLA = 'cajas';
const MIGRACION = 'RF-CAJA-01-saldo-encadenado';
const ACCION_UP = 'MIGRACION_SALDO_ENCADENADO';
const ACCION_DOWN = 'MIGRACION_SALDO_ENCADENADO_UNDO';
const ESTADO_ABIERTA = 1;
const CENTRO_CERRADO = 0;
const EGRESO_ANULADO = -1;
const EGRESO_TIPO_LIQUIDACION = 2;
const MAX_DECIMAL_14_0 = 99999999999999;
const COLUMNAS_REQUERIDAS = ['periodo', 'estado', 'fecha_cierre', 'total_ingreso', 'total_egreso',
  'saldo_inicial', 'saldo_final', 'saldo_provisional', 'cerrada_por'];
const PATRONES_DEFICIT = ['%deficit%', '%déficit%', '%saldo%', '%mes anterior%', '%arrastre%'];

function seleccionar(queryInterface, Sequelize, sql, replacements, transaction) {
  return queryInterface.sequelize.query(sql, {
    replacements: replacements || {},
    type: Sequelize.QueryTypes.SELECT,
    transaction: transaction
  });
}

function entero(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  if (!Number.isSafeInteger(n)) throw new Error('[RF-CAJA-01] monto no entero/seguro: ' + v);
  return n;
}

function enRango(n, contexto) {
  if (n !== null && Math.abs(n) > MAX_DECIMAL_14_0) {
    throw new Error('[RF-CAJA-01] saldo fuera de DECIMAL(14,0) en ' + contexto + ': ' + n);
  }
  return n;
}

function fotoSaldos(f) {
  return {
    id: Number(f.id),
    periodo: f.periodo,
    saldo_inicial: f.saldo_inicial === null ? null : entero(f.saldo_inicial),
    saldo_final: f.saldo_final === null ? null : entero(f.saldo_final),
    saldo_provisional: !!Number(f.saldo_provisional)
  };
}

function mismosSaldos(a, b) {
  return a.saldo_inicial === b.saldo_inicial && a.saldo_final === b.saldo_final &&
    a.saldo_provisional === b.saldo_provisional;
}

function jsonDe(valor) {
  if (valor === null || valor === undefined) return null;
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

async function tablasExistentes(queryInterface, Sequelize, tablas, transaction) {
  const filas = await seleccionar(queryInterface, Sequelize,
    'SELECT TABLE_NAME AS tabla FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (:tablas)',
    { tablas: tablas }, transaction);
  const set = {};
  filas.forEach(f => { set[f.tabla] = true; });
  return set;
}

async function columnasDe(queryInterface, Sequelize, tabla, transaction) {
  const filas = await seleccionar(queryInterface, Sequelize,
    'SELECT COLUMN_NAME AS col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla',
    { tabla: tabla }, transaction);
  const set = {};
  filas.forEach(f => { set[f.col] = true; });
  return set;
}

/** Agregados por cajaId con la lógica legacy (sin doble conteo). */
async function componentesPorCaja(queryInterface, Sequelize, existentes, t) {
  const porCaja = {};
  const obtener = id => (porCaja[id] = porCaja[id] || { ingresos: 0, costos_centros: 0, egresos: 0, doble_conteo: 0 });

  if (existentes.centro_costos) {
    const centros = await seleccionar(queryInterface, Sequelize,
      'SELECT cajaId AS caja_id, SUM(precio_servicio) AS ingresos, SUM(total_costos) AS costos ' +
        'FROM centro_costos WHERE estado = :cerrado AND cajaId IS NOT NULL GROUP BY cajaId',
      { cerrado: CENTRO_CERRADO }, t);
    centros.forEach(c => {
      const o = obtener(c.caja_id);
      o.ingresos = entero(c.ingresos);
      o.costos_centros = entero(c.costos);
    });
  }

  if (existentes.egresos) {
    const colsLiq = existentes.liquidaciones ? await columnasDe(queryInterface, Sequelize, 'liquidaciones', t) : {};
    const condVinculado = colsLiq.egreso_id
      ? ' OR e.id IN (SELECT l.egreso_id FROM liquidaciones l WHERE l.egreso_id IS NOT NULL)'
      : '';
    const egresos = await seleccionar(queryInterface, Sequelize,
      'SELECT e.cajaId AS caja_id, SUM(e.monto) AS total, ' +
        'SUM(CASE WHEN e.estado = :anulado OR e.tipo = :tipoLiq' + condVinculado + ' THEN e.monto ELSE 0 END) AS doble ' +
        'FROM egresos e WHERE e.cajaId IS NOT NULL GROUP BY e.cajaId',
      { anulado: EGRESO_ANULADO, tipoLiq: EGRESO_TIPO_LIQUIDACION }, t);
    egresos.forEach(e => {
      const o = obtener(e.caja_id);
      o.egresos = entero(e.total);
      o.doble_conteo = entero(e.doble);
    });
  }
  return porCaja;
}

/** Cadena cronológica. filas ordenadas por periodo ASC. */
function encadenar(filas, componentes) {
  let acumulado = null;
  let hayAbiertaPrevia = false;
  return filas.map(f => {
    const c = componentes[f.id] || { ingresos: 0, costos_centros: 0, egresos: 0, doble_conteo: 0 };
    const abierta = Number(f.estado) === ESTADO_ABIERTA;
    const egresoSinDoble = c.costos_centros + c.egresos - c.doble_conteo;
    let movimiento;
    let fuente;
    if (!abierta && f.total_ingreso !== null && f.total_egreso !== null) {
      movimiento = entero(f.total_ingreso) - (entero(f.total_egreso) - c.doble_conteo);
      fuente = c.doble_conteo ? 'CONGELADO_SIN_DOBLE_CONTEO' : 'CONGELADO';
    } else {
      movimiento = c.ingresos - egresoSinDoble;
      fuente = abierta ? 'EN_VIVO' : 'RECALCULADO_TOTALES_NULL';
    }
    const saldoInicial = acumulado === null ? entero(f.saldo_inicial) : acumulado;
    const r = {
      id: Number(f.id),
      periodo: f.periodo,
      estado: abierta ? 'ABIERTA' : 'CERRADA',
      saldo_inicial: enRango(saldoInicial, f.periodo),
      saldo_final: abierta ? null : enRango(saldoInicial + movimiento, f.periodo),
      saldo_provisional: hayAbiertaPrevia,
      movimiento: movimiento,
      doble_conteo_excluido: c.doble_conteo,
      fuente: fuente
    };
    acumulado = enRango(saldoInicial + movimiento, f.periodo);
    if (abierta) hayAbiertaPrevia = true;
    return r;
  });
}

/** Listado de solo lectura de movimientos manuales tipo "déficit mes anterior" (D-028). */
async function listarDeficit(queryInterface, Sequelize, existentes, t) {
  const salida = [];
  const conds = col => PATRONES_DEFICIT.map((p, i) => col + ' LIKE :p' + i).join(' OR ');
  const reps = {};
  PATRONES_DEFICIT.forEach((p, i) => { reps['p' + i] = p; });

  if (existentes.egresos) {
    const filas = await seleccionar(queryInterface, Sequelize,
      'SELECT e.id, e.cajaId AS caja_id, c.periodo, e.monto, e.estado, e.tipo, e.fecha, e.comentario AS texto ' +
        'FROM egresos e LEFT JOIN cajas c ON c.id = e.cajaId WHERE ' + conds('e.comentario') + ' ORDER BY c.periodo, e.id',
      reps, t);
    filas.forEach(f => salida.push(Object.assign({ origen: 'egresos', efecto_si_se_anula: '+monto al saldo desde ' + f.periodo }, f)));
  }
  for (const tabla of ['cc_egresos', 'cc_ingresos']) {
    if (!existentes[tabla] || !existentes.centro_costos) continue;
    const filas = await seleccionar(queryInterface, Sequelize,
      'SELECT x.id, cc.cajaId AS caja_id, c.periodo, x.monto, x.fecha, x.comentario AS texto, x.centroCostoId AS centro_id ' +
        'FROM ' + tabla + ' x LEFT JOIN centro_costos cc ON cc.id = x.centroCostoId LEFT JOIN cajas c ON c.id = cc.cajaId ' +
        'WHERE ' + conds('x.comentario') + ' ORDER BY c.periodo, x.id',
      reps, t);
    filas.forEach(f => salida.push(Object.assign({ origen: tabla }, f)));
  }
  if (existentes.centro_costos && existentes.clientes) {
    const filas = await seleccionar(queryInterface, Sequelize,
      'SELECT cc.id, cc.cajaId AS caja_id, c.periodo, cc.precio_servicio AS monto, cc.total_costos, cc.estado, ' +
        'cl.otra_informacion AS texto ' +
        'FROM centro_costos cc JOIN clientes cl ON cl.id = cc.clienteId LEFT JOIN cajas c ON c.id = cc.cajaId ' +
        'WHERE ' + conds('cl.otra_informacion') + ' ORDER BY c.periodo, cc.id',
      reps, t);
    filas.forEach(f => salida.push(Object.assign({ origen: 'centro_costos' }, f)));
  }
  return salida;
}

async function insertarAuditoria(queryInterface, accion, antes, despues, motivo, t) {
  await queryInterface.sequelize.query(
    'INSERT INTO auditoria (usuario_id, contexto_usuario, entidad, entidad_id, accion, valores_antes, valores_despues, motivo) ' +
      "VALUES (NULL, 'sistema', :entidad, :entidadId, :accion, :antes, :despues, :motivo)",
    {
      replacements: {
        entidad: TABLA,
        entidadId: MIGRACION,
        accion: accion,
        antes: antes === null ? null : JSON.stringify(antes),
        despues: despues === null ? null : JSON.stringify(despues),
        motivo: motivo
      },
      transaction: t
    }
  );
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Pre-checks (sin escrituras)
    const existentes = await tablasExistentes(queryInterface, Sequelize,
      [TABLA, 'auditoria', 'centro_costos', 'egresos', 'liquidaciones', 'cc_egresos', 'cc_ingresos', 'clientes']);
    if (!existentes[TABLA] || !existentes.auditoria) {
      throw new Error('[RF-CAJA-01] pre-check: faltan tablas cajas/auditoria. Migración abortada sin cambios.');
    }
    const cols = await columnasDe(queryInterface, Sequelize, TABLA);
    const faltan = COLUMNAS_REQUERIDAS.filter(c => !cols[c]);
    if (faltan.length) {
      throw new Error('[RF-CAJA-01] pre-check: faltan columnas en cajas (' + faltan.join(', ') +
        '). Ejecutar antes 20261016041620-RF-CAJA-01-periodo-saldos-cajas. Migración abortada sin cambios.');
    }
    const indices = await queryInterface.showIndex(TABLA);
    const hayUnique = indices.some(i => i.unique && i.fields.length === 1 && i.fields[0].attribute === 'periodo');
    if (!hayUnique) {
      throw new Error('[RF-CAJA-01] pre-check: cajas.periodo sin índice UNIQUE. Migración abortada sin cambios.');
    }

    let resultado = null;
    let deficit = [];
    await queryInterface.sequelize.transaction(async t => {
      const filas = await seleccionar(queryInterface, Sequelize,
        'SELECT id, periodo, estado, total_ingreso, total_egreso, saldo_inicial, saldo_final, saldo_provisional, cerrada_por ' +
          'FROM cajas ORDER BY periodo ASC FOR UPDATE', {}, t);

      deficit = await listarDeficit(queryInterface, Sequelize, existentes, t);

      const estadosRaros = filas.filter(f => [0, 1].indexOf(Number(f.estado)) === -1 || f.estado === null).map(f => f.id);
      const conCierreNuevo = filas.filter(f => f.cerrada_por !== null && f.cerrada_por !== undefined).map(f => f.id);
      const antes = filas.map(fotoSaldos);

      if (conCierreNuevo.length) {
        await insertarAuditoria(queryInterface, ACCION_UP, antes, antes,
          'Sin cambios: existen cierres del servicio nuevo (cerrada_por) ids ' + conCierreNuevo.join(','), t);
        resultado = { omitido: true, conCierreNuevo: conCierreNuevo, cadena: [], actualizadas: 0, estadosRaros: estadosRaros };
        return;
      }

      const componentes = await componentesPorCaja(queryInterface, Sequelize, existentes, t);
      const cadena = encadenar(filas, componentes);
      let actualizadas = 0;
      for (let i = 0; i < cadena.length; i++) {
        const e = cadena[i];
        if (mismosSaldos(antes[i], e)) continue;
        await queryInterface.sequelize.query(
          'UPDATE cajas SET saldo_inicial = :si, saldo_final = :sf, saldo_provisional = :sp WHERE id = :id',
          { replacements: { si: e.saldo_inicial, sf: e.saldo_final, sp: e.saldo_provisional, id: e.id }, transaction: t });
        actualizadas++;
      }
      await insertarAuditoria(queryInterface, ACCION_UP, antes, cadena,
        'Backfill saldo encadenado (lógica legacy sin doble conteo). Déficit manuales detectados: ' + deficit.length, t);
      resultado = { omitido: false, cadena: cadena, actualizadas: actualizadas, estadosRaros: estadosRaros };
    });

    resultado.cadena.forEach(e => {
      console.log('[RF-CAJA-01][cadena] ' + e.periodo + ' ' + e.estado + ' si=' + e.saldo_inicial + ' mov=' + e.movimiento +
        ' sf=' + e.saldo_final + ' provisional=' + e.saldo_provisional + ' fuente=' + e.fuente +
        (e.doble_conteo_excluido ? ' doble_conteo_excluido=' + e.doble_conteo_excluido : ''));
    });
    deficit.forEach(d => console.log('[RF-CAJA-01][deficit] ' + JSON.stringify(d)));
    console.log('[RF-CAJA-01] saldo encadenado: meses=' + resultado.cadena.length + ' actualizadas=' + resultado.actualizadas +
      ' deficit_detectados=' + deficit.length +
      (resultado.estadosRaros.length ? ' estado_no_0_1_tratado_como_CERRADA ids=' + resultado.estadosRaros.join(',') : '') +
      (resultado.omitido ? ' (OMITIDO: cierres con cerrada_por ids ' + resultado.conCierreNuevo.join(',') + ')' : ''));
  },

  down: async (queryInterface, Sequelize) => {
    const existentes = await tablasExistentes(queryInterface, Sequelize, [TABLA, 'auditoria']);
    if (!existentes[TABLA] || !existentes.auditoria) {
      console.log('[RF-CAJA-01] down: sin tablas cajas/auditoria, nada que restaurar');
      return;
    }
    let restauradas = 0;
    await queryInterface.sequelize.transaction(async t => {
      const registros = await seleccionar(queryInterface, Sequelize,
        'SELECT id, accion, valores_antes, valores_despues FROM auditoria ' +
          'WHERE entidad = :entidad AND entidad_id = :entidadId AND accion IN (:acciones) ORDER BY id DESC LIMIT 1',
        { entidad: TABLA, entidadId: MIGRACION, acciones: [ACCION_UP, ACCION_DOWN] }, t);
      if (!registros.length || registros[0].accion !== ACCION_UP) {
        console.log('[RF-CAJA-01] down: no hay backfill pendiente de revertir en auditoria');
        return;
      }
      const antes = jsonDe(registros[0].valores_antes) || [];
      const despues = jsonDe(registros[0].valores_despues) || [];
      const filas = await seleccionar(queryInterface, Sequelize,
        'SELECT id, periodo, saldo_inicial, saldo_final, saldo_provisional, cerrada_por FROM cajas ORDER BY periodo ASC FOR UPDATE',
        {}, t);
      const actuales = {};
      filas.forEach(f => { actuales[Number(f.id)] = fotoSaldos(f); });

      // Guarda: no pisar saldos cambiados después del backfill (cierres/cascadas del servicio nuevo)
      const distintas = despues.filter(d => !actuales[d.id] || !mismosSaldos(actuales[d.id], {
        saldo_inicial: d.saldo_inicial, saldo_final: d.saldo_final, saldo_provisional: !!d.saldo_provisional
      })).map(d => d.id);
      const conCierreNuevo = filas.filter(f => f.cerrada_por !== null && f.cerrada_por !== undefined).map(f => f.id);
      if (distintas.length || conCierreNuevo.length) {
        throw new Error('[RF-CAJA-01] down abortado: saldos modificados después del backfill ids [' + distintas.join(',') +
          '] o cierres con cerrada_por ids [' + conCierreNuevo.join(',') + ']. Respaldar y conciliar manualmente.');
      }
      for (const a of antes) {
        if (!actuales[a.id] || mismosSaldos(actuales[a.id], a)) continue;
        await queryInterface.sequelize.query(
          'UPDATE cajas SET saldo_inicial = :si, saldo_final = :sf, saldo_provisional = :sp WHERE id = :id',
          { replacements: { si: a.saldo_inicial, sf: a.saldo_final, sp: a.saldo_provisional, id: a.id }, transaction: t });
        restauradas++;
      }
      await insertarAuditoria(queryInterface, ACCION_DOWN, despues, antes,
        'Revertido backfill saldo encadenado (auditoria id ' + registros[0].id + ')', t);
    });
    console.log('[RF-CAJA-01] down saldo encadenado: restauradas=' + restauradas);
  }
};
