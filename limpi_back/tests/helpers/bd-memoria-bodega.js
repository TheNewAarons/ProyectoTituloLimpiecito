/**
 * RF-BOD-04 (tests) — BD en memoria para los servicios de bodega, con LOCKS DE FILA reales:
 * `lock: t.LOCK.UPDATE` espera si otra transacción tiene la fila y la libera al terminar la transacción.
 * Cada operación cede el turno (setImmediate) para que dos transacciones concurrentes se intercalen.
 * Sin rollback: los casos de error deben fallar antes de escribir (como hacen los servicios).
 * Uso: jest.mock('<modelo>', () => require('<este archivo>').modelo('<tabla>')).
 */
const Op = require('sequelize').Op;

const OPS = [[Op.in, (v, x) => x.indexOf(v) !== -1], [Op.gt, (v, x) => v > x], [Op.gte, (v, x) => v >= x], [Op.lt, (v, x) => v < x], [Op.ne, (v, x) => v !== x]];
const DEFECTOS = {
  solicitudes: () => ({ trabajador_id: null, usuario_id: null, estado: 'PENDIENTE', observacion: null, entregada_at: null, anulada_at: null, lista_insumo_id: null, created_at: new Date() }),
  items: () => ({ cantidad_asignada: 0, cantidad_faltante: null }),
  orden_items: () => ({ cantidad_recibida: 0, costo_unitario: null }),
  movimientos: () => ({ created_at: new Date() })
};

const bd = { tablas: {}, ids: {}, locks: new Map(), siguienteTx: 1, historialLocks: [] };
const turno = () => new Promise((r) => setImmediate(r));

function reiniciar(datos) {
  bd.tablas = {};
  bd.ids = {};
  bd.locks = new Map();
  bd.historialLocks = [];
  Object.keys(datos || {}).forEach((t) => {
    bd.tablas[t] = datos[t].map((f) => Object.assign({}, f));
    bd.ids[t] = bd.tablas[t].reduce((m, f) => Math.max(m, f.id || 0), 0);
  });
}
const tabla = (n) => (bd.tablas[n] = bd.tablas[n] || []);

function coincide(fila, where) {
  return Object.keys(where || {}).every((k) => {
    const v = where[k];
    if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      return OPS.every(([sim, f]) => (v[sim] === undefined ? true : fila[k] !== null && fila[k] !== undefined && f(fila[k], v[sim])));
    }
    if (Array.isArray(v)) return v.indexOf(fila[k]) !== -1;
    return v === null ? fila[k] === null || fila[k] === undefined : fila[k] === v;
  });
}

function ordenar(filas, order) {
  if (!order) return filas;
  return filas.slice().sort((a, b) => {
    for (const [campo, dir] of order) {
      if (a[campo] < b[campo]) return dir === 'DESC' ? 1 : -1;
      if (a[campo] > b[campo]) return dir === 'DESC' ? -1 : 1;
    }
    return 0;
  });
}

async function bloquear(t, nombre, filas) {
  for (const f of filas) {
    const clave = nombre + ':' + f.id;
    for (;;) {
      const dueno = bd.locks.get(clave);
      if (!dueno || dueno.tx === t.id) break;
      await new Promise((r) => dueno.esperando.push(r));
    }
    if (!bd.locks.get(clave)) {
      bd.locks.set(clave, { tx: t.id, esperando: [] });
      t.claves.push(clave);
      bd.historialLocks.push({ tx: t.id, clave: clave });
    }
  }
}

function liberar(t) {
  t.claves.forEach((clave) => {
    const l = bd.locks.get(clave);
    bd.locks.delete(clave);
    if (l) l.esperando.forEach((r) => r());
  });
  t.claves = [];
}

function instancia(fila) {
  const inst = Object.assign({}, fila);
  inst.get = () => Object.assign({}, fila);
  inst.update = async function (cambios) {
    await turno();
    Object.assign(fila, cambios);
    Object.assign(inst, cambios);
    return inst;
  };
  return inst;
}

function modelo(nombre) {
  const buscar = async (o) => {
    await turno();
    const opciones = o || {};
    const filas = ordenar(tabla(nombre).filter((f) => coincide(f, opciones.where)), opciones.order);
    if (opciones.lock && opciones.transaction) await bloquear(opciones.transaction, nombre, filas);
    // Tras el lock se relee la fila vigente (como un SELECT ... FOR UPDATE).
    return filas.map(instancia);
  };
  return {
    findAll: buscar,
    findOne: async (o) => (await buscar(o))[0] || null,
    findById: async (id, o) => (await buscar(Object.assign({}, o, { where: { id: Number(id) } })))[0] || null,
    count: async (o) => (await buscar(o)).length,
    findAndCountAll: async (o) => {
      const todas = await buscar({ where: o.where, order: o.order });
      return { count: todas.length, rows: todas.slice(o.offset || 0, (o.offset || 0) + (o.limit || todas.length)) };
    },
    create: async (datos) => {
      await turno();
      bd.ids[nombre] = (bd.ids[nombre] || 0) + 1;
      const fila = Object.assign({ id: bd.ids[nombre] }, DEFECTOS[nombre] ? DEFECTOS[nombre]() : {}, datos);
      tabla(nombre).push(fila);
      return instancia(fila);
    }
  };
}

// db.sequelize: transaction(opciones?, fn) y query() para solicitudes_bodega.lista_insumo_id.
const sequelize = {
  transaction: jest.fn(async (a, b) => {
    const fn = typeof a === 'function' ? a : b;
    const t = { id: bd.siguienteTx++, claves: [], LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } };
    try { return await fn(t); } finally { liberar(t); }
  }),
  query: jest.fn(async (sql, o) => {
    await turno();
    const r = (o && o.replacements) || {};
    const fila = tabla('solicitudes').filter((f) => f.id === Number(r.id))[0];
    if (/^SELECT lista_insumo_id/.test(sql)) return fila ? [{ lista_insumo_id: fila.lista_insumo_id }] : [];
    if (/^UPDATE solicitudes_bodega SET lista_insumo_id/.test(sql)) { if (fila) fila.lista_insumo_id = r.lista; return [{}, {}]; }
    throw new Error('SQL no soportado en la BD en memoria: ' + sql);
  })
};

// auditar() real exige transacción; aquí registra en la tabla `auditoria` (valores como JSON, igual que el servicio).
const auditar = jest.fn(async (p) => {
  await turno();
  if (!p.transaction) throw new Error('auditar sin transaccion');
  bd.ids.auditoria = (bd.ids.auditoria || 0) + 1;
  tabla('auditoria').push({
    id: bd.ids.auditoria, usuario_id: p.usuario.id, contexto_usuario: p.usuario.contexto, entidad: p.entidad, entidad_id: String(p.entidad_id),
    accion: p.accion, motivo: p.motivo || null,
    valores_despues: p.despues ? JSON.stringify(p.despues.get ? p.despues.get({ plain: true }) : p.despues) : null, tx: p.transaction.id
  });
});

module.exports = { bd, reiniciar, modelo, sequelize, auditar, tabla };
