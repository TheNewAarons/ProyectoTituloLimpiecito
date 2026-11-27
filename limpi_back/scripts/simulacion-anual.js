/**
 * Simulación de 1 año para pruebas manuales del sistema (complementa la BD local que ya trae caja, centros de costo,
 * reservas, liquidaciones y PEV desde 2025-11). SOLO BD LOCAL desechable: respaldar antes (mysqldump).
 *
 * Agrega:
 *  - cuentas: una por rol del ERP (crea Operaciones si falta) y contraseña conocida para todas las cuentas de prueba
 *    (@limpiecito.test, @cliente.test, @correo.test): ERP, accesos laborales, acceso trabajador, extranet cliente y app.
 *  - noviembre del año en curso: centros de costo abiertos, cronogramas, gastos, ingresos, reservas, listas de insumos
 *    y documentos por pagar/cobrar PENDIENTES para probar estados de pago.
 *  - bodega 12 meses: proveedores, órdenes de compra con recepciones históricas y solicitudes de bodega.
 *    Todo lo anterior al saldo inicial del kardex va sin movimientos (igual que la migración RF-BOD-06), así el kardex
 *    sigue cuadrado; se dejan órdenes ENVIADAS y solicitudes PENDIENTES para recibir/entregar en vivo.
 *  - web: publicaciones e ítems de catálogo.
 *
 * Uso (desde limpi_back/):
 *   PERMITIR_DATOS_PRUEBA=1 CLAVE_PRUEBA='una-clave-local' node scripts/simulacion-anual.js
 * Todo se crea en una sola transacción; se reconoce por @sim.test / 'SIM-ANUAL'. Para deshacer: restaurar el respaldo.
 */
const bcrypt = require('bcryptjs');
const db = require('../database/database');

const MARCA = 'SIM-ANUAL';
let t; // transacción única
const q = (s, r) => db.sequelize.query(s, { replacements: r || {}, type: db.sequelize.QueryTypes.SELECT, transaction: t });
const x = async (s, r) => (await db.sequelize.query(s, { replacements: r || {}, transaction: t }))[0];
const uno = async (s, r) => (await q(s, r))[0] || null;

let semilla = 20261123; // determinístico
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
const barajar = (xs) => xs.map((v) => [azar(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

// Fechas "ingenuas" en hora de Santiago (así guarda la BD): se opera en UTC solo como calendario.
const fecha = (anio, mes, dia, h, m) => new Date(Date.UTC(anio, mes - 1, dia, h || 0, m || 0));
const sql = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const dia = (d) => sql(d).slice(0, 10);
const masDias = (d, n) => new Date(d.getTime() + n * 86400000);
const masMes = (s) => { const d = new Date(s.replace(' ', 'T') + 'Z'); d.setUTCMonth(d.getUTCMonth() + 1); return d; };
const HOY = new Date(new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(' ', 'T') + 'Z');

function exigirLocal() {
  const host = db.sequelize.config.host || db.sequelize.options.host;
  if (process.env.NODE_ENV === 'production' || ['localhost', '127.0.0.1', '::1'].indexOf(host) === -1) {
    throw new Error('solo corre contra una BD local (host actual: ' + host + ')');
  }
  if (process.env.PERMITIR_DATOS_PRUEBA !== '1') throw new Error('defina PERMITIR_DATOS_PRUEBA=1 para confirmar que la BD es local y desechable');
  const c = process.env.CLAVE_PRUEBA;
  if (!c || c.length < 8) throw new Error('defina CLAVE_PRUEBA (mínimo 8 caracteres); no se guarda en el repo');
}

async function cuentas() {
  const hash = bcrypt.hashSync(process.env.CLAVE_PRUEBA, 10);
  const roles = await q('SELECT id, nombre FROM roles WHERE estado = 1');
  for (const r of roles) {
    const correo = r.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '.') + '@limpiecito.test';
    const existe = await uno('SELECT u.id FROM usuarios u WHERE u.roleId = :r AND u.correo LIKE :d', { r: r.id, d: '%@limpiecito.test' });
    if (!existe) {
      await x("INSERT INTO usuarios (nombre, apellido, password, correo, rut, estado, roleId) VALUES (:n, 'Prueba', :h, :c, NULL, 1, :r)",
        { n: r.nombre, h: hash, c: correo, r: r.id });
    }
  }
  // admin@limpiecito.com conserva su clave documentada (Docs/inicio-proyecto-local.md).
  await x("UPDATE usuarios SET password = :h, estado = 1 WHERE correo LIKE '%@limpiecito.test'", { h: hash });
  await x("UPDATE accesos_laborales SET password = :h, estado = 1 WHERE correo LIKE '%@limpiecito.test'", { h: hash });
  await x("UPDATE acceso_trabajadores SET password = :h, estado = 1 WHERE correo LIKE '%@limpiecito.test'", { h: hash });
  await x("UPDATE acceso_clientes SET password = :h WHERE correo LIKE '%@cliente.test'", { h: hash });
  await x("UPDATE usuario_apps SET password = :h, estado = 1 WHERE correo LIKE '%@correo.test'", { h: hash });
}

/** Abre el mes en curso copiando la estructura del mes anterior (lo que haría la operación diaria). */
async function mesEnCurso(ctx) {
  const periodo = sql(HOY).slice(0, 7);
  const anterior = sql(masDias(fecha(HOY.getUTCFullYear(), HOY.getUTCMonth() + 1, 1), -1)).slice(0, 7);
  const caja = await uno('SELECT id FROM cajas WHERE periodo = :p', { p: periodo });
  if (!caja) throw new Error('no existe la caja del período ' + periodo);
  const enRango = (d) => d <= HOY;

  // Centros de costo abiertos + trabajadores asignados.
  const centros = await q("SELECT * FROM centro_costos WHERE DATE_FORMAT(fecha_inicio, '%Y-%m') = :p ORDER BY clienteId", { p: anterior });
  let numero = (await uno('SELECT MAX(numero_cc) n FROM centro_costos')).n;
  const mapaCc = {};
  for (const c of centros) {
    const id = await x('INSERT INTO centro_costos (fecha_inicio, precio_servicio, numero_cc, estado, cajaId, clienteId) VALUES (:f, :p, :n, 1, :caja, :cli)',
      { f: periodo + '-01 08:00:00', p: c.precio_servicio, n: ++numero, caja: caja.id, cli: c.clienteId });
    mapaCc[c.id] = id;
    await x('INSERT INTO centro_costo_trabajadores (trabajadoreId, centroCostoId) SELECT trabajadoreId, :n FROM centro_costo_trabajadores WHERE centroCostoId = :v',
      { n: id, v: c.id });
  }

  // Cronogramas: el del mes anterior se cierra (estado 2) y se abre el nuevo con sus tareas, trabajadores y chequeos.
  const cronos = await q('SELECT * FROM cronogramas WHERE anio = :a AND mes = :m', { a: Number(anterior.slice(0, 4)), m: Number(anterior.slice(5)) });
  for (const c of cronos) {
    const id = await x('INSERT INTO cronogramas (mes, anio, fecha, estado, fecha_inicio, fecha_termino, clienteId, turnoId) VALUES (:m, :a, :f, 1, :fi, :ft, :cli, :tu)', {
      m: Number(periodo.slice(5)), a: Number(periodo.slice(0, 4)), f: periodo + '-01 08:00:00', fi: periodo + '-01 08:00:00',
      ft: c.fecha_termino ? sql(masMes(sql(c.fecha_termino))) : null, cli: c.clienteId, tu: c.turnoId
    });
    await x('UPDATE cronogramas SET estado = 2 WHERE id = :id', { id: c.id });
    await x('INSERT INTO trabajadores_cronogramas (cronogramaId, trabajadoreId) SELECT :n, trabajadoreId FROM trabajadores_cronogramas WHERE cronogramaId = :v', { n: id, v: c.id });
    for (const l of await q('SELECT * FROM linea_cronogramas WHERE cronogramaId = :id', { id: c.id })) {
      const idL = await x('INSERT INTO linea_cronogramas (cronogramaId, tareaId) VALUES (:c, :t)', { c: id, t: l.tareaId });
      for (const k of await q('SELECT * FROM checkeos WHERE lineaCronogramaId = :id', { id: l.id })) {
        const f = masMes(sql(k.fecha));
        if (enRango(f)) await x('INSERT INTO checkeos (`check`, fecha, comentario, lineaCronogramaId) VALUES (:c, :f, :co, :l)', { c: k.check, f: sql(f), co: k.comentario, l: idL });
      }
    }
  }

  // Gastos generales del mes (sin sueldos: esos salen al pagar liquidaciones).
  for (const e of await q("SELECT * FROM egresos WHERE tipo = 1 AND estado = 1 AND DATE_FORMAT(fecha, '%Y-%m') = :p", { p: anterior })) {
    const f = masMes(sql(e.fecha));
    if (!enRango(f)) continue;
    await x("INSERT INTO egresos (monto, comentario, fecha, estado, tipo, usuarioId, cajaId, estado_pago, fecha_pago) VALUES (:m, :c, :f, 1, 1, :u, :caja, 'PAGADA', :fp)",
      { m: e.monto, c: String(e.comentario).replace(anterior, periodo), f: sql(f), u: e.usuarioId, caja: caja.id, fp: dia(f) });
  }
  for (const e of await q("SELECT * FROM cc_egresos WHERE DATE_FORMAT(fecha, '%Y-%m') = :p", { p: anterior })) {
    const f = masMes(sql(e.fecha));
    if (!enRango(f) || !mapaCc[e.centroCostoId]) continue;
    await x("INSERT INTO cc_egresos (fecha, monto, comentario, centroCostoId, estado_pago, fecha_pago) VALUES (:f, :m, :c, :cc, 'PAGADA', :fp)",
      { f: sql(f), m: e.monto, c: e.comentario, cc: mapaCc[e.centroCostoId], fp: dia(f) });
  }
  let idIng = (await uno('SELECT COALESCE(MAX(id), 0) n FROM cc_ingresos')).n; // cc_ingresos.id no es autoincremental
  for (const e of await q("SELECT * FROM cc_ingresos WHERE DATE_FORMAT(fecha, '%Y-%m') = :p", { p: anterior })) {
    const f = masMes(sql(e.fecha));
    if (!enRango(f) || !mapaCc[e.centroCostoId]) continue;
    await x("INSERT INTO cc_ingresos (id, fecha, monto, comentario, centroCostoId, estado_pago, fecha_pago) VALUES (:id, :f, :m, :c, :cc, 'PAGADA', :fp)",
      { id: ++idIng, f: sql(f), m: e.monto, c: e.comentario, cc: mapaCc[e.centroCostoId], fp: dia(f) });
  }

  // Documentos PENDIENTES (no impactan caja hasta marcarlos pagados: RF-CAJA-02 / RF-FAC-01).
  const nuevos = Object.keys(mapaCc).map((k) => mapaCc[k]);
  const emision = periodo + '-05';
  const vence = dia(masDias(new Date(emision + 'T00:00:00Z'), 30));
  for (const [i, cc] of nuevos.slice(0, 4).entries()) {
    await x("INSERT INTO cc_ingresos (id, fecha, monto, comentario, centroCostoId, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, estado_pago) " +
      "VALUES (:id, :f, :m, 'Servicio adicional', :cc, 'FACTURA', :n, :e, :v, 'PENDIENTE')",
    { id: ++idIng, f: emision + ' 12:00:00', m: entre(60, 220) * 1000, cc: cc, n: 'F-' + (5100 + i), e: emision, v: vence });
  }
  for (const [i, g] of [['Mantención máquinas lavadoras', 185000], ['Compra uniformes temporada', 342000]].entries()) {
    await x("INSERT INTO egresos (monto, comentario, fecha, estado, tipo, usuarioId, cajaId, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, estado_pago) " +
      "VALUES (:m, :c, :f, 1, 1, :u, :caja, 'FACTURA', :n, :e, :v, 'PENDIENTE')",
    { m: g[1], c: g[0], f: emision + ' 10:00:00', u: ctx.admin, caja: caja.id, n: 'P-' + (880 + i), e: emision, v: vence });
  }
  await x("INSERT INTO cc_egresos (fecha, monto, comentario, centroCostoId, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, estado_pago) " +
    "VALUES (:f, 96000, 'Insumos urgentes', :cc, 'FACTURA', 'P-890', :e, :v, 'PENDIENTE')", { f: emision + ' 10:00:00', cc: nuevos[0], e: emision, v: vence });

  // Reservas (app) del mes: las futuras quedan pendientes.
  let orden = (await uno('SELECT MAX(orden) n FROM reservas')).n;
  for (const r of await q("SELECT * FROM reservas WHERE DATE_FORMAT(fecha_reserva, '%Y-%m') = :p", { p: anterior })) {
    const f = masMes(sql(r.fecha_reserva));
    const futura = !enRango(f);
    await x('INSERT INTO reservas (orden, fecha_creacion, hora_inicio, hora_fin, fecha_reserva, precio, estado, tipo, metodo_pago, pagado, cantidad, precio_total, usuarioAppId, servicioId) ' +
      'VALUES (:o, :fc, :hi, :hf, :fr, :p, :e, :t, :mp, :pg, :c, :pt, :u, :s)', {
      o: ++orden, fc: sql(masMes(sql(r.fecha_creacion))), hi: r.hora_inicio, hf: r.hora_fin, fr: sql(f), p: r.precio,
      e: futura ? 1 : r.estado, t: r.tipo, mp: r.metodo_pago, pg: futura ? 0 : r.pagado, c: r.cantidad, pt: r.precio_total, u: r.usuarioAppId, s: r.servicioId
    });
  }

  // Listas de insumos del mes (anteriores al saldo inicial del kardex: sin movimiento, igual que el historial).
  for (const l of await q("SELECT * FROM lista_insumos WHERE DATE_FORMAT(fecha, '%Y-%m') = :p", { p: anterior })) {
    const f = masMes(sql(l.fecha));
    if (f >= ctx.corteKardex || !mapaCc[l.centroCostoId]) continue;
    const id = await x('INSERT INTO lista_insumos (estado, fecha, total, centroCostoId, usuarioCreaId, usuarioApruebaId) VALUES (1, :f, :t, :cc, :u, :u)',
      { f: sql(f), t: l.total, cc: mapaCc[l.centroCostoId], u: ctx.admin });
    await x('INSERT INTO linea_insumos (precio, total_linea, cantidad, productoId, listaInsumoId) SELECT precio, total_linea, cantidad, productoId, :n FROM linea_insumos WHERE listaInsumoId = :v',
      { n: id, v: l.id });
  }
  return { centros: nuevos.length, cronogramas: cronos.length };
}

async function bodega(ctx) {
  const provs = [];
  for (const [i, p] of [['Distribuidora Aseo Sur', 'Paula Rojas'], ['Químicos del Pacífico', 'Jorge Muñoz'],
    ['Papeles Industriales Maipo', 'Carla Fuentes'], ['Ferretería Industrial Andes', 'Luis Pérez']].entries()) {
    provs.push(await x('INSERT INTO proveedores (nombre, rut, email, telefono, contacto, activo, created_at, updated_at) VALUES (:n, :r, :e, :t, :c, 1, :f, :f)', {
      n: p[0], r: (76100200 + i * 1111) + '-' + i, e: 'ventas' + (i + 1) + '@sim.test', t: '+5692200' + (1000 + i), c: p[1], f: '2025-11-15 10:00:00'
    }));
  }
  const productos = await q('SELECT id, precio, proveedor_id FROM productos WHERE estado = 1 ORDER BY id');
  for (const p of productos.filter((p) => !p.proveedor_id)) {
    p.proveedor_id = provs[p.id % provs.length];
    await x('UPDATE productos SET proveedor_id = :pv WHERE id = :id', { pv: p.proveedor_id, id: p.id });
  }
  const supervisores = (await q('SELECT trabajadoreId id FROM accesos_laborales WHERE tipo = 1 AND trabajadoreId IS NOT NULL')).map((s) => s.id);
  const corte = ctx.corteKardex;
  const res = { ordenes: 0, recepciones: 0, solicitudes: 0, enviadas_pendientes: 0 };

  for (let m = 0; m < 12; m++) {
    const base = fecha(HOY.getUTCFullYear(), HOY.getUTCMonth() + 1 - 11 + m, 1);
    const periodo = sql(base).slice(0, 7);
    const actual = m === 11;

    // Órdenes de compra: una por proveedor al mes.
    for (const [k, pv] of provs.entries()) {
      const enviada = masDias(base, entre(2, 9) + k);
      const r = azar();
      let estado = r < 0.88 ? 'RECIBIDA' : r < 0.95 ? 'RECIBIDA_PARCIAL' : 'ANULADA';
      if (actual && k >= 2) estado = 'ENVIADA'; // quedan en tránsito para probar la recepción en vivo
      const llegada = masDias(enviada, entre(2, 6));
      if (estado.indexOf('RECIBIDA') === 0 && llegada >= corte) estado = 'ENVIADA';
      const idOc = await x('INSERT INTO ordenes_compra (proveedor_id, estado, enviada_at, enviada_a_email, created_by, created_at, updated_at) VALUES (:pv, :e, :env, :mail, :u, :c, :up)', {
        pv: pv, e: estado, env: sql(enviada), mail: 'ventas' + (k + 1) + '@sim.test', u: elegir([ctx.admin, ctx.operaciones]),
        c: sql(masDias(enviada, -1)), up: sql(estado === 'ENVIADA' || estado === 'ANULADA' ? enviada : llegada)
      });
      res.ordenes++;
      if (estado === 'ENVIADA') res.enviadas_pendientes++;
      const recibe = estado.indexOf('RECIBIDA') === 0;
      const idRec = recibe ? await x("INSERT INTO recepciones_compra (orden_id, fecha_recepcion, documento_tipo, documento_numero, observacion, estado, historica, created_by, contexto_usuario, created_at) " +
        "VALUES (:o, :f, 'FACTURA', :n, :obs, 'CONFIRMADA', 1, :u, 'usuarios', :f)", { o: idOc, f: sql(llegada), n: String(40000 + idOc), obs: MARCA, u: ctx.operaciones }) : null;
      if (recibe) res.recepciones++;
      const delProv = productos.filter((p) => p.proveedor_id === pv);
      for (const p of barajar(delProv).slice(0, entre(2, Math.min(5, delProv.length)))) {
        const cant = entre(4, 15) * 10;
        const recibida = estado === 'RECIBIDA' ? cant : estado === 'RECIBIDA_PARCIAL' ? Math.floor(cant * (0.4 + azar() * 0.4)) : 0;
        const costo = Math.round(p.precio * (0.95 + azar() * 0.1));
        const idItem = await x('INSERT INTO orden_compra_items (orden_id, producto_id, cantidad, cantidad_recibida, costo_unitario) VALUES (:o, :p, :c, :r, :cu)',
          { o: idOc, p: p.id, c: cant, r: recibida, cu: costo });
        if (recibida) {
          await x('INSERT INTO recepcion_items (recepcion_id, orden_item_id, producto_id, cantidad, costo_unitario) VALUES (:r, :i, :p, :c, :cu)',
            { r: idRec, i: idItem, p: p.id, c: recibida, cu: costo });
        }
      }
    }

    // Solicitudes de bodega: una o dos por centro de costo del mes.
    const centros = await q("SELECT id FROM centro_costos WHERE DATE_FORMAT(fecha_inicio, '%Y-%m') = :p", { p: periodo });
    for (const c of centros) {
      for (let n = entre(1, 2); n > 0; n--) {
        const creada = masDias(base, entre(1, 26));
        if (creada > HOY) continue;
        const r = azar();
        let estado = r < 0.85 ? 'ENTREGADA' : r < 0.92 ? 'PARCIAL' : 'ANULADA';
        const entrega = masDias(creada, entre(1, 3));
        if (estado !== 'ANULADA' && entrega >= corte) continue; // posterior al kardex: se crea en vivo (el cruce corre al crear)
        const web = azar() < 0.35 || !supervisores.length;
        const id = await x('INSERT INTO solicitudes_bodega (trabajador_id, usuario_id, centro_costo_id, estado, observacion, entregada_at, anulada_at, created_at, updated_at) ' +
          'VALUES (:t, :u, :cc, :e, :obs, :ent, :anu, :c, :up)', {
          t: web ? null : elegir(supervisores), u: web ? elegir([ctx.admin, ctx.operaciones]) : null, cc: c.id, e: estado, obs: MARCA,
          ent: estado === 'ENTREGADA' ? sql(entrega) : null, anu: estado === 'ANULADA' ? sql(entrega) : null, c: sql(creada),
          up: sql(estado === 'PENDIENTE' ? creada : entrega)
        });
        res.solicitudes++;
        for (const p of barajar(productos).slice(0, entre(2, 5))) {
          const pedida = entre(2, 20);
          const asignada = estado === 'ENTREGADA' ? pedida : estado === 'PARCIAL' ? Math.floor(pedida / 2) : 0;
          await x('INSERT INTO solicitud_items (solicitud_id, producto_id, cantidad_pedida, cantidad_asignada, cantidad_faltante, created_at) VALUES (:s, :p, :pe, :a, :f, :c)',
            { s: id, p: p.id, pe: pedida, a: asignada, f: pedida - asignada, c: sql(creada) });
        }
      }
    }
  }
  // Las solicitudes nuevas se crean en vivo desde la UI: el cruce con stock (RF-BOD-02) corre solo al crearlas.
  // Un borrador reciente para probar edición y envío.
  const idB = await x("INSERT INTO ordenes_compra (proveedor_id, estado, created_by, created_at, updated_at) VALUES (:pv, 'BORRADOR', :u, :f, :f)",
    { pv: provs[0], u: ctx.operaciones, f: sql(HOY) });
  const p0 = productos.find((p) => p.proveedor_id === provs[0]) || productos[0];
  await x('INSERT INTO orden_compra_items (orden_id, producto_id, cantidad, costo_unitario) VALUES (:o, :p, 60, :cu)', { o: idB, p: p0.id, cu: p0.precio });
  return res;
}

async function web() {
  const pubs = [
    ['Nuevo servicio de sanitización', '<p>Ahora ofrecemos sanitización certificada para oficinas y clínicas.</p>', -40, null, 1],
    ['Horario especial de fiestas patrias', '<p>Del 17 al 19 de septiembre atendemos solo urgencias.</p>', -75, -60, 1],
    ['Campaña de verano', '<p>Descuentos en limpieza profunda durante enero y febrero.</p>', -5, 60, 1],
    ['Borrador: certificación ISO', '<p>Texto en revisión.</p>', 0, null, 0]
  ];
  for (const p of pubs) {
    await x('INSERT INTO publicaciones (titulo, cuerpo, fecha_publicacion, fecha_expiracion, publicado, created_at, updated_at) VALUES (:t, :c, :f, :e, :p, :f, :f)',
      { t: p[0], c: p[1], f: sql(masDias(HOY, p[2])), e: p[3] === null ? null : sql(masDias(HOY, p[3])), p: p[4] });
  }
  const servicios = await q('SELECT id, nombre, precio FROM servicios WHERE estado = 1 ORDER BY id');
  for (const [i, s] of servicios.entries()) {
    await x("INSERT INTO catalogo_items (nombre, descripcion, categoria, precio, publicado, orden, servicio_id) VALUES (:n, :d, :c, :p, :pub, :o, :s)",
      { n: s.nombre, d: 'Servicio ' + s.nombre.toLowerCase() + ' realizado por personal capacitado.', c: i < 2 ? 'Hogar' : i < 4 ? 'Vehículos' : 'Empresas',
        p: s.precio, pub: i < 5 ? 1 : 0, o: i + 1, s: s.id });
  }
}

async function main() {
  exigirLocal();
  db.sequelize.options.logging = false;
  if (await uno("SELECT id FROM proveedores WHERE email LIKE '%@sim.test' LIMIT 1")) throw new Error('la simulación ya está cargada (restaure el respaldo para repetirla)');
  t = await db.sequelize.transaction();
  try {
    await cuentas();
    const usuario = async (rol) => (await uno("SELECT u.id FROM usuarios u JOIN roles r ON r.id = u.roleId WHERE r.nombre = :r AND u.estado = 1 ORDER BY u.id LIMIT 1", { r: rol })).id;
    const corte = await uno("SELECT MIN(created_at) f FROM movimientos_bodega WHERE tipo = 'SALDO_INICIAL'");
    const ctx = {
      admin: await usuario('Administrador'), operaciones: await usuario('Operaciones'),
      corteKardex: corte && corte.f ? new Date(sql(new Date(corte.f)).replace(' ', 'T') + 'Z') : HOY
    };
    const mes = await mesEnCurso(ctx);
    const bod = await bodega(ctx);
    await web();
    await t.commit();
    console.log('simulación cargada:', Object.assign({ hoy: sql(HOY) }, mes, bod));
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error('ERROR', err.message); process.exit(1); });
