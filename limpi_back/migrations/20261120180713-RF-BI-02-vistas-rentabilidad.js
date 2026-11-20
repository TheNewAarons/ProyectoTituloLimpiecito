'use strict';

/**
 * RF-BI-02 — Vistas de rentabilidad por centro de costo (TASK_PLAN "RF-BI-02" §1-§3, D-165…D-174).
 * Granularidad: centro_costo_id × periodo ('YYYY-MM' = cajas.periodo). Sin filtro de período (lo aplica
 * el servicio con replacements). Sin CTE ni funciones de ventana (MySQL 5.7). Solo lectura;
 * reversión: DROP VIEW IF EXISTS (no toca datos). Montos: columnas INTEGER legacy; SUM -> DECIMAL entero.
 *
 * Mismos filtros que services/caja/saldo.js (caja abierta), para que
 *   Σ ingreso_real − Σ costos(SUELDO, OTRO, BODEGA) − (egresos_sin_centro − Σ BODEGA)
 *   = calcularSaldo().ingresos − egresos.total
 * Fuentes y su contraparte en saldo.js:
 *  - ingreso_real            = precio_servicio de centros cerrados (estado 0)         -> ingresos (:154-159)
 *  - SUELDO (pago nuevo)     = egresos.monto tipo 2 ligados a una liquidación PAGADA con fila en cct;
 *                              periodo = caja del egreso; centro = MIN(cct.centroCostoId) -> egresos generales (:161-168)
 *  - SUELDO (histórico)      = liquido_pagar PAGADA con egreso_id NULL, vía cct a centros cerrados; una vez
 *                              por (liquidación, caja), igual que el Op.in de saldo.js   -> liquidaciones_historicas (:83-103)
 *  - OTRO                    = cc_egresos PAGADA de centros cerrados                     -> egresos centros (:170-179)
 *  - OTRO_ESTIMADO           = cc_egresos PAGADA de centros abiertos (no impacta caja; fuera de la invariante)
 *  - BODEGA                  = Σ linea_insumos.total_linea de lista_insumos estado 1 (no impacta caja: el
 *                              desembolso es la factura del proveedor, ya dentro de egresos generales; D-169)
 *  - egresos_sin_centro      = egresos generales menos los de SUELDO (pago nuevo) atribuidos -> resto de (:161-168)
 * Liquidaciones sin fila en cct: si tienen egreso, quedan en egresos_sin_centro; si son históricas, saldo.js
 * no las cuenta (solo las ve vía cct) y aquí tampoco.
 * ingreso_estimado, OTRO_ESTIMADO y v_bi_rent_facturado son informativos y nunca entran a la invariante.
 */

const VISTAS = ['v_bi_rent_ingresos', 'v_bi_rent_costos', 'v_bi_rent_facturado', 'v_bi_rent_egresos_sin_centro'];

// Filtro único de egreso que impacta caja (saldo.js:165). -1 = EGRESO_ANULADO; estado NULL = legacy vigente.
const EGRESO_EN_CAJA = "e.estado_pago = 'PAGADA' AND (e.estado IS NULL OR e.estado <> -1)";
// Egreso de pago de sueldo atribuido a un centro. 2 = EGRESO_TIPO_LIQUIDACION. Debe ser idéntico en
// v_bi_rent_costos (SUELDO) y en el NOT EXISTS de v_bi_rent_egresos_sin_centro, o la invariante no cierra.
const LIQ_CON_CENTRO = "l.estado_pago = 'PAGADA' AND cct.centroCostoId IS NOT NULL";

const SQL = {
  v_bi_rent_ingresos:
    'SELECT cc.id AS centro_costo_id, cc.clienteId AS cliente_id, cc.numero_cc, ca.periodo, ' +
    'cc.estado AS estado_centro, ' +
    'CASE WHEN cc.estado = 0 THEN COALESCE(cc.precio_servicio, 0) ELSE 0 END AS ingreso_real, ' +
    'CASE WHEN cc.estado = 0 THEN ' +
    '  CASE WHEN COALESCE(cc.precio_servicio, 0) = 0 THEN COALESCE(cl.valor_factura, 0) ELSE 0 END ' +
    'ELSE COALESCE(NULLIF(cc.precio_servicio, 0), cl.valor_factura, 0) END AS ingreso_estimado ' +
    'FROM centro_costos cc ' +
    'JOIN cajas ca ON ca.id = cc.cajaId ' +
    'LEFT JOIN clientes cl ON cl.id = cc.clienteId',

  v_bi_rent_costos:
    'SELECT x.centro_costo_id, x.periodo, x.tipo, SUM(x.monto) AS monto, COUNT(*) AS n_registros FROM (' +
    // SUELDO pago nuevo: una fila por egreso (1 egreso = 1 liquidación, services/liquidaciones/pago.js)
    "SELECT a.centro_costo_id, ca.periodo, 'SUELDO' AS tipo, COALESCE(e.monto, 0) AS monto " +
    'FROM egresos e ' +
    'JOIN cajas ca ON ca.id = e.cajaId ' +
    'JOIN (SELECT l.egreso_id, MIN(cct.centroCostoId) AS centro_costo_id ' +
    '      FROM liquidaciones l JOIN centro_costo_trabajadores cct ON cct.liquidacioneId = l.id ' +
    '      WHERE l.egreso_id IS NOT NULL AND ' + LIQ_CON_CENTRO + ' GROUP BY l.egreso_id) a ON a.egreso_id = e.id ' +
    'WHERE e.tipo = 2 AND ' + EGRESO_EN_CAJA + ' ' +
    'UNION ALL ' +
    // SUELDO histórico: una vez por (liquidación, caja), al MIN de sus centros cerrados en esa caja
    "SELECT h.centro_costo_id, ca.periodo, 'SUELDO', COALESCE(l.liquido_pagar, 0) " +
    'FROM (SELECT cct.liquidacioneId, cc.cajaId, MIN(cc.id) AS centro_costo_id ' +
    '      FROM centro_costo_trabajadores cct JOIN centro_costos cc ON cc.id = cct.centroCostoId AND cc.estado = 0 ' +
    '      WHERE cct.liquidacioneId IS NOT NULL GROUP BY cct.liquidacioneId, cc.cajaId) h ' +
    "JOIN liquidaciones l ON l.id = h.liquidacioneId AND l.estado_pago = 'PAGADA' AND l.egreso_id IS NULL " +
    'JOIN cajas ca ON ca.id = h.cajaId ' +
    'UNION ALL ' +
    "SELECT cc.id, ca.periodo, CASE WHEN cc.estado = 0 THEN 'OTRO' ELSE 'OTRO_ESTIMADO' END, COALESCE(ce.monto, 0) " +
    'FROM cc_egresos ce ' +
    'JOIN centro_costos cc ON cc.id = ce.centroCostoId ' +
    'JOIN cajas ca ON ca.id = cc.cajaId ' +
    "WHERE ce.estado_pago = 'PAGADA' " +
    'UNION ALL ' +
    "SELECT cc.id, ca.periodo, 'BODEGA', COALESCE(ln.total, 0) " +
    'FROM lista_insumos li ' +
    'JOIN centro_costos cc ON cc.id = li.centroCostoId ' +
    'JOIN cajas ca ON ca.id = cc.cajaId ' +
    'LEFT JOIN (SELECT listaInsumoId, SUM(total_linea) AS total FROM linea_insumos GROUP BY listaInsumoId) ln ' +
    '  ON ln.listaInsumoId = li.id ' +
    'WHERE li.estado = 1' +
    ') x GROUP BY x.centro_costo_id, x.periodo, x.tipo',

  v_bi_rent_facturado:
    "SELECT ci.centroCostoId AS centro_costo_id, DATE_FORMAT(ci.fecha_pago, '%Y-%m') AS periodo, " +
    'SUM(ci.monto) AS ingreso_facturado ' +
    'FROM cc_ingresos ci ' +
    "WHERE ci.estado_pago = 'PAGADA' AND ci.fecha_pago IS NOT NULL " +
    "GROUP BY ci.centroCostoId, DATE_FORMAT(ci.fecha_pago, '%Y-%m')",

  // Una fila por caja (0 si no hay egresos), para que el servicio no tenga que rellenar huecos.
  v_bi_rent_egresos_sin_centro:
    'SELECT ca.periodo, COALESCE(SUM(e.monto), 0) AS monto, COUNT(e.id) AS n_registros ' +
    'FROM cajas ca ' +
    'LEFT JOIN egresos e ON e.cajaId = ca.id AND ' + EGRESO_EN_CAJA + ' ' +
    '  AND NOT EXISTS (SELECT 1 FROM liquidaciones l ' +
    '                  JOIN centro_costo_trabajadores cct ON cct.liquidacioneId = l.id ' +
    '                  WHERE l.egreso_id = e.id AND e.tipo = 2 AND ' + LIQ_CON_CENTRO + ') ' +
    'GROUP BY ca.periodo'
};

module.exports = {
  up: async (queryInterface) => {
    for (const vista of VISTAS) {
      // INVOKER: la vista no depende de que exista el usuario que corrió la migración en RDS
      await queryInterface.sequelize.query(
        'CREATE OR REPLACE SQL SECURITY INVOKER VIEW `' + vista + '` AS ' + SQL[vista]);
    }
    console.log('[RF-BI-02] vistas ' + VISTAS.join(', ') + ' listas');
  },

  down: async (queryInterface) => {
    for (const vista of VISTAS.slice().reverse()) {
      await queryInterface.sequelize.query('DROP VIEW IF EXISTS `' + vista + '`');
    }
  }
};
