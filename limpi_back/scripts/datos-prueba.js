/**
 * Datos de prueba para el plan de pruebas de aceptación (Docs/evidencias-pruebas/plan-pruebas-requerimientos.md).
 * SOLO para una copia LOCAL de la BD (se niega a correr si el host no es local o NODE_ENV=production).
 *
 * Uso (desde limpi_back/):
 *   CLAVE_PRUEBA='una-clave-local' node scripts/datos-prueba.js base     usuarios por rol, supervisor y escenario de bodega
 *   node scripts/datos-prueba.js bi                                       datos de demostración para los dashboards BI-03 y BI-04
 *   node scripts/datos-prueba.js limpiar                                  deja todo inactivo / anulado / borrado según corresponda
 *   CLAVE_PRUEBA='…' node scripts/datos-prueba.js token admin             imprime el token de la cuenta de prueba (backend corriendo)
 *
 * Todo lo creado se reconoce por `@local.test`, 'PRUEBA' o 'DEMO BI'. Lo de bodega nunca se borra físicamente (se anula).
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../database/database');

const ESTADO = path.join(__dirname, '..', 'tmp', 'datos-prueba-bi.json'); // limpi_back/tmp/ está en .gitignore
const CORREOS = { admin: 'admin.prueba@local.test', operaciones: 'operaciones.prueba@local.test', supervisor: 'supervisor.prueba@local.test' };
const PROVEEDOR = { nombre: 'Proveedor Prueba', email: 'proveedor.prueba@local.test' };
// RF-004 (criterio del acta): stock A=10, B=8, C=3, D=0.
const PRODUCTOS = [['PRUEBA A', 10], ['PRUEBA B', 8], ['PRUEBA C', 3], ['PRUEBA D', 0]];
const N_EMPLEADO_SUPERVISOR = 9901;

const q = (s, r) => db.sequelize.query(s, { replacements: r || {}, type: db.sequelize.QueryTypes.SELECT });
const x = async (s, r) => (await db.sequelize.query(s, { replacements: r || {} }))[0];
const sql = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

function exigirLocal() {
  const host = db.sequelize.config.host || db.sequelize.options.host;
  if (process.env.NODE_ENV === 'production' || ['localhost', '127.0.0.1', '::1'].indexOf(host) === -1) {
    throw new Error('datos-prueba solo corre contra una BD local (host actual: ' + host + ')');
  }
  // Un túnel SSH a una BD remota también se ve como localhost: se exige confirmación explícita.
  if (process.env.PERMITIR_DATOS_PRUEBA !== '1') throw new Error('defina PERMITIR_DATOS_PRUEBA=1 para confirmar que la BD es local y desechable');
}

function clave() {
  const c = process.env.CLAVE_PRUEBA;
  if (!c || c.length < 8) throw new Error('defina CLAVE_PRUEBA (mínimo 8 caracteres) para las cuentas de prueba; no se guarda en el repo');
  return c;
}

async function unoONulo(s, r) { const f = await q(s, r); return f.length ? f[0] : null; }

async function base() {
  const hash = bcrypt.hashSync(clave(), 10);
  // Usuarios del ERP: el login compara bcrypt(contraseña) tras decodificar el Base64 del front.
  for (const [rol, correo] of [['Administrador', CORREOS.admin], ['Operaciones', CORREOS.operaciones]]) {
    const r = await unoONulo('SELECT id FROM roles WHERE nombre = :n', { n: rol });
    if (!r) throw new Error('no existe el rol ' + rol);
    const u = await unoONulo('SELECT id FROM usuarios WHERE correo = :c', { c: correo });
    if (u) await x('UPDATE usuarios SET password = :h, estado = 1, roleId = :r WHERE id = :id', { h: hash, r: r.id, id: u.id });
    else await x("INSERT INTO usuarios (nombre, apellido, password, correo, rut, estado, roleId) VALUES (:n, 'Prueba', :h, :c, NULL, 1, :r)", { n: rol, h: hash, c: correo, r: r.id });
  }

  // Supervisor (app laboral): trabajador + acceso laboral tipo 1 + un centro de costo abierto asignado.
  let t = await unoONulo('SELECT id FROM trabajadores WHERE n_empleado = :n', { n: N_EMPLEADO_SUPERVISOR });
  if (!t) {
    await x("INSERT INTO trabajadores (nombre, apellido, rut, correo, estado, n_empleado) VALUES ('Supervisor', 'Prueba', '99.999.901-K', :c, 1, :n)",
      { c: CORREOS.supervisor, n: N_EMPLEADO_SUPERVISOR });
    t = await unoONulo('SELECT id FROM trabajadores WHERE n_empleado = :n', { n: N_EMPLEADO_SUPERVISOR });
  } else await x('UPDATE trabajadores SET estado = 1 WHERE id = :id', { id: t.id });
  const acceso = await unoONulo('SELECT id FROM accesos_laborales WHERE correo = :c', { c: CORREOS.supervisor });
  if (acceso) await x('UPDATE accesos_laborales SET password = :h, estado = 1, tipo = 1, trabajadoreId = :t WHERE id = :id', { h: hash, t: t.id, id: acceso.id });
  else await x('INSERT INTO accesos_laborales (correo, password, estado, tipo, trabajadoreId) VALUES (:c, :h, 1, 1, :t)', { c: CORREOS.supervisor, h: hash, t: t.id });
  const centro = await unoONulo('SELECT cc.id, cc.numero_cc FROM centro_costos cc WHERE cc.estado = 1 AND cc.clienteId IS NOT NULL ORDER BY cc.id DESC LIMIT 1');
  if (!centro) throw new Error('no hay un centro de costo abierto con cliente para el supervisor');
  if (!(await unoONulo('SELECT id FROM centro_costo_trabajadores WHERE trabajadoreId = :t AND centroCostoId = :c', { t: t.id, c: centro.id }))) {
    await x('INSERT INTO centro_costo_trabajadores (trabajadoreId, centroCostoId) VALUES (:t, :c)', { t: t.id, c: centro.id });
  }

  // Bodega: proveedor y productos del escenario RF-004, asociados al proveedor (lista de compra por proveedor).
  let p = await unoONulo('SELECT id FROM proveedores WHERE email = :e', { e: PROVEEDOR.email });
  if (!p) {
    await x('INSERT INTO proveedores (nombre, email, activo, created_at, updated_at) VALUES (:n, :e, 1, NOW(), NOW())', { n: PROVEEDOR.nombre, e: PROVEEDOR.email });
    p = await unoONulo('SELECT id FROM proveedores WHERE email = :e', { e: PROVEEDOR.email });
  } else await x('UPDATE proveedores SET activo = 1 WHERE id = :id', { id: p.id });
  for (const [nombre, stock] of PRODUCTOS) {
    const prod = await unoONulo('SELECT id FROM productos WHERE nombre = :n ORDER BY id DESC LIMIT 1', { n: nombre });
    // Se reinicia el stock del escenario para poder repetir la prueba (solo productos PRUEBA).
    if (prod) await x('UPDATE productos SET stock = :s, estado = 1, stock_minimo = 0, proveedor_id = :p WHERE id = :id', { s: stock, p: p.id, id: prod.id });
    else await x("INSERT INTO productos (nombre, descripcion, tipo, estado, stock, precio, proveedor_id, costo_unitario, stock_minimo) VALUES (:n, 'Producto de prueba', 1, 1, :s, 1000, :p, 600, 0)",
      { n: nombre, s: stock, p: p.id });
  }
  console.log('base lista:', { usuarios: [CORREOS.admin, CORREOS.operaciones], supervisor: CORREOS.supervisor, centro_costo: centro.numero_cc,
    proveedor: PROVEEDOR.nombre, productos: PRODUCTOS.map((f) => f[0] + '=' + f[1]).join(', ') });
}

// ---------- Datos de demostración BI (BI-03 bodega y BI-04 PEV) ----------
let semilla = 20261121; // determinístico: la demo sale igual cada vez
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
const hora = (h, m) => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00';
const OBS = ['Faltó reponer papel higiénico', 'Piso húmedo sin señalética', 'Basurero sin vaciar al cierre', 'Vidrios con marcas',
  'Falta jabón en dispensador', 'Mancha persistente en pasillo', 'Contenedor dañado, informar a cliente'];

/** Fechas relativas a hoy: la demo siempre cae en los últimos meses. */
function diaAtras(dias, horaUtc) {
  const d = new Date();
  d.setUTCHours(horaUtc, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - dias);
  return d;
}

async function bi() {
  if (fs.existsSync(ESTADO)) throw new Error('ya hay una demo BI cargada: ejecute "limpiar" primero');
  fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
  const e = { solicitudes: [], ordenes: [], minimos: [], listas_pev: [], listas_super: [], lineas_pev: [], lineas_super: [] };
  const guardar = () => fs.writeFileSync(ESTADO, JSON.stringify(e, null, 1));

  const productos = await q("SELECT id, stock, stock_minimo, precio, costo_unitario FROM productos WHERE estado = 1 AND nombre NOT LIKE 'PRUEBA %' ORDER BY id");
  const supervisores = await q('SELECT t.id FROM trabajadores t WHERE t.n_empleado IN (SELECT DISTINCT n_empleado FROM listas_super_trabajadores) ORDER BY t.id');
  const centros = await q('SELECT MAX(id) id FROM centro_costos WHERE clienteId IS NOT NULL GROUP BY clienteId ORDER BY id DESC LIMIT 6');
  const usuario = await unoONulo('SELECT id FROM usuarios WHERE estado = 1 ORDER BY id LIMIT 1');
  const proveedor = await unoONulo('SELECT id FROM proveedores WHERE activo = 1 ORDER BY id LIMIT 1');
  if (!productos.length || !supervisores.length || !centros.length || !usuario) throw new Error('faltan productos, supervisores, centros o usuarios base');
  const populares = productos.slice(0, 8);

  for (let i = 0; i < 42; i++) {
    const creada = diaAtras(entre(3, 175), entre(12, 20));
    const r = azar();
    const estado = r < 0.76 ? 'ENTREGADA' : r < 0.88 ? 'PARCIAL' : 'PENDIENTE';
    const entregada = estado === 'ENTREGADA' ? new Date(Math.min(creada.getTime() + entre(1, 3) * 86400000, Date.now() - 3600000)) : null;
    const web = azar() < 0.2;
    const id = await x("INSERT INTO solicitudes_bodega (trabajador_id, usuario_id, centro_costo_id, estado, observacion, entregada_at, created_at, updated_at) " +
      "VALUES (:t, :u, :cc, :estado, 'DEMO BI', :ent, :cre, :cre)",
    { t: web ? null : elegir(supervisores).id, u: web ? usuario.id : null, cc: elegir(centros).id, estado: estado, ent: entregada ? sql(entregada) : null, cre: sql(creada) });
    e.solicitudes.push(id);
    guardar(); // tras cada inserción: si falla a mitad, "limpiar" igual encuentra lo creado
    const usados = {};
    for (let k = 0, n = entre(1, 4); k < n; k++) {
      const p = azar() < 0.75 ? elegir(populares) : elegir(productos);
      if (usados[p.id]) continue;
      usados[p.id] = true;
      const pedida = entre(2, 24);
      const asignada = estado === 'ENTREGADA' ? pedida : estado === 'PARCIAL' ? Math.floor(pedida / 2) : 0;
      await x('INSERT INTO solicitud_items (solicitud_id, producto_id, cantidad_pedida, cantidad_asignada, cantidad_faltante, created_at) VALUES (:s, :p, :pe, :a, :f, :c)',
        { s: id, p: p.id, pe: pedida, a: asignada, f: pedida - asignada, c: sql(creada) });
    }
  }
  guardar();

  if (proveedor) {
    for (let i = 0; i < 9; i++) {
      const enviada = diaAtras(entre(3, 175), 15);
      const estado = elegir(['ENVIADA', 'RECIBIDA', 'RECIBIDA', 'RECIBIDA_PARCIAL']);
      const id = await x("INSERT INTO ordenes_compra (proveedor_id, estado, enviada_at, enviada_a_email, created_by, created_at, updated_at) " +
        "VALUES (:pv, :estado, :env, 'demo-bi@local.test', :u, :env, :env)", { pv: proveedor.id, estado: estado, env: sql(enviada), u: usuario.id });
      e.ordenes.push(id);
      guardar();
      const usados = {};
      for (let k = 0, n = entre(1, 3); k < n; k++) {
        const p = elegir(populares.slice(0, 5));
        if (usados[p.id]) continue;
        usados[p.id] = true;
        const cant = entre(20, 120);
        await x('INSERT INTO orden_compra_items (orden_id, producto_id, cantidad, cantidad_recibida, costo_unitario) VALUES (:o, :p, :c, :r, :cu)', {
          o: id, p: p.id, c: cant, r: estado === 'RECIBIDA' ? cant : estado === 'RECIBIDA_PARCIAL' ? Math.floor(cant / 2) : 0,
          cu: Math.round(Number(p.costo_unitario || p.precio || 1000) * 0.6)
        });
      }
    }
    guardar();
  }

  for (const p of productos.slice(2, 6)) {
    const puesto = Number(p.stock || 0) + entre(10, 80);
    e.minimos.push({ id: p.id, antes: Number(p.stock_minimo), puesto: puesto });
    guardar(); // antes del UPDATE: un producto real nunca queda alterado sin registro para restaurarlo
    await x('UPDATE productos SET stock_minimo = :m WHERE id = :id', { m: puesto, id: p.id });
  }
  guardar();

  // PEV: listas nuevas copiando la estructura de listas reales; las existentes no se modifican.
  const plantillas = await q('SELECT lp.* FROM listas_pev_trabajadores lp WHERE lp.fecha_chequeo IS NOT NULL ' +
    'AND EXISTS (SELECT 1 FROM listas_super_trabajadores st WHERE st.listasPevTrabajadoreId = lp.id) ' +
    'AND EXISTS (SELECT 1 FROM linea_lista_pev_trabajadores l WHERE l.listasPevTrabajadoreId = lp.id) ORDER BY lp.id DESC LIMIT 16');
  const perfilTrab = {};
  const perfilSup = {};
  const nivelesTrab = [0.98, 0.95, 0.9, 0.82, 0.7, 0.55];
  const nivelesSup = [1, 0.97, 0.9, 0.8, 0.6, 0.4];
  for (let i = 0; i < 36 && plantillas.length; i++) {
    const pl = plantillas[i % plantillas.length];
    const fecha = diaAtras(entre(2, 85), 3); // 03:00 UTC = 00:00 en Santiago (D-117)
    if (perfilTrab[pl.n_empleado] === undefined) perfilTrab[pl.n_empleado] = nivelesTrab[Object.keys(perfilTrab).length % nivelesTrab.length];
    const pT = perfilTrab[pl.n_empleado];
    const idPev = await x('INSERT INTO listas_pev_trabajadores (estado, fecha_creacion, fecha_firma, fecha_chequeo, n_empleado, sectoreId, cronogramaId) VALUES (2, :f, :firma, :f, :n, :s, :c)',
      { f: sql(fecha), firma: sql(new Date(fecha.getTime() + 18 * 3600000)), n: pl.n_empleado, s: pl.sectoreId, c: pl.cronogramaId });
    e.listas_pev.push(idPev);
    const st = await unoONulo('SELECT * FROM listas_super_trabajadores WHERE listasPevTrabajadoreId = :id ORDER BY id LIMIT 1', { id: pl.id });
    if (perfilSup[st.n_empleado] === undefined) perfilSup[st.n_empleado] = nivelesSup[Object.keys(perfilSup).length % nivelesSup.length];
    const pS = perfilSup[st.n_empleado];
    const firmada = azar() < pS + 0.1 ? 2 : 1;
    const idSup = await x('INSERT INTO listas_super_trabajadores (estado, fecha_creacion, fecha_firma, n_empleado, listaPevTrabId, listasPevTrabajadoreId) VALUES (:e, :f, :firma, :n, :id, :id)',
      { e: firmada, f: sql(fecha), firma: firmada === 2 ? sql(new Date(fecha.getTime() + 19 * 3600000)) : null, n: st.n_empleado, id: idPev });
    e.listas_super.push(idSup);
    guardar();
    const lineas = await q('SELECT * FROM linea_lista_pev_trabajadores WHERE listasPevTrabajadoreId = :id ORDER BY id', { id: pl.id });
    for (const l of lineas) {
      const c = [1, 2, 3].map(() => (azar() < pT ? 1 : 0));
      const idL = await x('INSERT INTO linea_lista_pev_trabajadores (check_trabajador_1, hora_check_trabajador_1, check_trabajador_2, hora_check_trabajador_2, ' +
        'check_trabajador_3, hora_check_trabajador_3, observaciones, listaPevTrabId, tareaId, listasPevTrabajadoreId, asignacionId) VALUES (:c1, :h1, :c2, :h2, :c3, :h3, NULL, :id, :tarea, :id, :asig)', {
        c1: c[0], h1: c[0] ? hora(9, entre(0, 59)) : null, c2: c[1], h2: c[1] ? hora(12, entre(0, 59)) : null,
        c3: c[2], h3: c[2] ? hora(16, entre(0, 59)) : null, id: idPev, tarea: l.tareaId, asig: l.asignacionId
      });
      e.lineas_pev.push(idL);
      const h = [1, 2, 3].map((n) => (azar() < pS ? hora(9 + n * 2, entre(0, 59)) : null));
      const idLS = await x('INSERT INTO linea_lista_super_trabajadores (hora_1, despolvado_1, aplicacion_producto_1, abrillantado_1, hora_2, despolvado_2, aplicacion_producto_2, abrillantado_2, ' +
        'hora_3, despolvado_3, aplicacion_producto_3, abrillantado_3, observaciones, listaSuperTrabId, tareaId, listasSuperTrabajadoreId, asignacionId) ' +
        'VALUES (:h1, :v1, :v1, :v1, :h2, :v2, :v2, :v2, :h3, :v3, :v3, :v3, :obs, :sid, :tarea, :sid, :asig)', {
        h1: h[0], v1: h[0] ? 1 : 0, h2: h[1], v2: h[1] ? 1 : 0, h3: h[2], v3: h[2] ? 1 : 0,
        obs: azar() < 0.12 ? elegir(OBS) : null, sid: idSup, tarea: l.tareaId, asig: l.asignacionId
      });
      e.lineas_super.push(idLS);
    }
    guardar();
  }
  console.log('demo BI lista:', { solicitudes: e.solicitudes.length, ordenes: e.ordenes.length, minimos: e.minimos.length, listas_pev: e.listas_pev.length });
}

async function limpiar() {
  const ids = (xs) => (xs && xs.length ? xs : [0]);
  // Base: cuentas y supervisor inactivos; productos PRUEBA con borrado lógico; proveedor desactivado.
  await x('UPDATE usuarios SET estado = 0 WHERE correo IN (:c)', { c: [CORREOS.admin, CORREOS.operaciones] });
  await x('UPDATE accesos_laborales SET estado = 0 WHERE correo = :c', { c: CORREOS.supervisor });
  await x('UPDATE trabajadores SET estado = 0 WHERE n_empleado = :n', { n: N_EMPLEADO_SUPERVISOR });
  // Las ENTREGADAS se conservan: son historial de entrega (consumo del centro de costo).
  await x("UPDATE solicitudes_bodega SET estado = 'ANULADA', anulada_at = NOW() WHERE estado NOT IN ('ANULADA', 'ENTREGADA') AND id IN " +
    "(SELECT solicitud_id FROM solicitud_items WHERE producto_id IN (SELECT id FROM productos WHERE nombre LIKE 'PRUEBA %'))");
  await x("UPDATE productos SET estado = 2 WHERE nombre LIKE 'PRUEBA %'");
  // Órdenes del proveedor de prueba aún no recibidas: si no, quedan "en tránsito" en el dashboard.
  await x("UPDATE ordenes_compra SET estado = 'ANULADA' WHERE estado IN ('BORRADOR', 'ENVIADA') AND proveedor_id IN (SELECT id FROM proveedores WHERE email = :e)", { e: PROVEEDOR.email });
  await x('UPDATE proveedores SET activo = 0 WHERE email = :e', { e: PROVEEDOR.email });
  // Asignación supervisor ↔ centro de costo (no es dato financiero ni de bodega).
  await x('DELETE FROM centro_costo_trabajadores WHERE trabajadoreId IN (SELECT id FROM trabajadores WHERE n_empleado = :n)', { n: N_EMPLEADO_SUPERVISOR });
  // Demo BI (si se cargó): bodega anulada, mínimos restaurados, PEV de demostración borrado (no es dato de bodega ni financiero).
  if (fs.existsSync(ESTADO)) {
    const e = JSON.parse(fs.readFileSync(ESTADO));
    await x("UPDATE solicitudes_bodega SET estado = 'ANULADA', anulada_at = NOW() WHERE id IN (:ids) AND observacion = 'DEMO BI'", { ids: ids(e.solicitudes) });
    await x("UPDATE ordenes_compra SET estado = 'ANULADA' WHERE id IN (:ids) AND enviada_a_email = 'demo-bi@local.test'", { ids: ids(e.ordenes) });
    // Solo si nadie lo editó después (ej. RF-007 paso 3): no se pisa un cambio hecho durante las pruebas.
    for (const m of e.minimos) {
      const where = m.puesto === undefined ? '' : ' AND stock_minimo = :p';
      await x('UPDATE productos SET stock_minimo = :m WHERE id = :id' + where, { m: m.antes, id: m.id, p: m.puesto });
    }
    await x('DELETE FROM linea_lista_super_trabajadores WHERE id IN (:ids)', { ids: ids(e.lineas_super) });
    await x('DELETE FROM linea_lista_pev_trabajadores WHERE id IN (:ids)', { ids: ids(e.lineas_pev) });
    await x('DELETE FROM listas_super_trabajadores WHERE id IN (:ids)', { ids: ids(e.listas_super) });
    await x('DELETE FROM listas_pev_trabajadores WHERE id IN (:ids)', { ids: ids(e.listas_pev) });
    fs.unlinkSync(ESTADO);
  }
  console.log('limpieza lista (cuentas de prueba inactivas, bodega anulada, demo BI retirada)');
}

/**
 * Inicia sesión con la cuenta de prueba del rol (backend corriendo en localhost:3000) e imprime solo el token,
 * para usarlo en los pasos por API: TOKEN=$(node scripts/datos-prueba.js token admin)
 */
async function token() {
  const rol = process.argv[3];
  if (!CORREOS[rol]) throw new Error('rol: admin | operaciones | supervisor');
  const base = 'http://localhost:' + (process.env.PUERTO_PRUEBA || 3000) + '/web-limpiecito';
  const body = rol === 'supervisor'
    ? { url: '/acces_laboral/login', datos: { credenciales: { correo: CORREOS[rol], password: clave() } } }
    : { url: '/usuario/login', datos: { usuario: JSON.stringify({ correo: CORREOS[rol], password: Buffer.from(clave()).toString('base64') }) } };
  const http = require('http');
  const texto = await new Promise((ok, mal) => {
    const req = http.request(base + body.url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let t = '';
      res.on('data', (c) => { t += c; });
      res.on('end', () => ok(t));
    });
    req.on('error', mal);
    req.end(JSON.stringify(body.datos));
  });
  let r = {};
  try { r = JSON.parse(texto); } catch (e) { /* el login legacy responde texto plano ante errores */ }
  if (!r.token) throw new Error('login rechazado: ' + String(texto).slice(0, 80));
  process.stdout.write(r.token + '\n');
}

const comandos = { base: base, bi: bi, limpiar: limpiar, token: token };
const cmd = comandos[process.argv[2]];
if (!cmd) {
  console.error('uso: node scripts/datos-prueba.js base|bi|limpiar|token <admin|operaciones|supervisor>');
  process.exit(1);
}
Promise.resolve().then(exigirLocal).then(cmd).then(() => process.exit(0)).catch((err) => { console.error('ERROR', err.message); process.exit(1); });
