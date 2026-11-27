/**
 * RNF-SEC-02 (cobertura completa) — Auditoría automática por hooks globales de Sequelize.
 * Cubre las rutas legacy que escriben sin llamar a `auditar()`: toda creación, edición y borrado
 * hecho con el ORM queda en `auditoria` con usuario, fecha, valores antes y después.
 *
 * Reglas:
 * - Con transacción del llamador: la fila se escribe en esa transacción (si falla, rollback).
 * - Sin transacción (legacy autocommit): la fila se escribe en una transacción propia; si falla se
 *   registra el error en consola y la petición sigue (el cambio ya quedó guardado).
 * - Tablas con auditoría manual (TABLAS_AUDITORIA_MANUAL) se omiten cuando la escritura va en
 *   transacción: esos caminos ya llaman a `auditar()` con una acción más precisa.
 * - Límites: no cubre SQL crudo (`sequelize.query`) ni `Model.upsert`.
 */

const { AsyncLocalStorage } = require('async_hooks');
const jwt = require('jsonwebtoken');
const { auditar } = require('./index');
const { actorDeRequest } = require('./actor');

const contexto = new AsyncLocalStorage();

// Tablas cuyas operaciones transaccionales ya se auditan con `auditar()` (grep de `entidad:`).
const TABLAS_AUDITORIA_MANUAL = [
  'acceso_clientes', 'acceso_trabajadores', 'accesos_laborales', 'actividad_asignaciones', 'actividades',
  'anuncios', 'cajas', 'cc_egresos', 'cc_ingresos', 'centro_costos', 'documentos', 'egresos',
  'inventario_conteos', 'linea_cronogramas', 'linea_lista_pev_trabajadores', 'linea_lista_super_trabajadores',
  'liquidaciones', 'lista_insumos', 'ordenes_compra', 'productos', 'proveedores', 'solicitudes_bodega',
  'stock_rapidos', 'tareas', 'trabajadores_cronogramas', 'usuario_apps', 'usuarios'
];
// Nunca auditar: la propia auditoría y la tabla temporal que vacía el cron de los lunes.
const TABLAS_EXCLUIDAS = ['auditoria', 'doc_subidas'];

/** Middleware: guarda la petición en el contexto async para que los hooks lean usuario/IP. */
function middlewareContexto(req, res, next) {
  contexto.run({ req: req }, next);
}

/**
 * Actor de la petición actual. Si la ruta legacy no autenticó, intenta leer el JWT de intranet
 * (solo firma, sin BD); sin request (cron) queda como `sistema`.
 * @returns {{usuario: {id: (number|null), contexto: string}, ip: (string|null), motivo: (string|null)}}
 */
function actorActual() {
  const store = contexto.getStore();
  if (!store) return { usuario: { id: null, contexto: 'sistema' }, ip: null, motivo: 'SISTEMA_SIN_REQUEST' };
  const req = store.req;
  const actor = actorDeRequest(req);
  const token = req.headers && req.headers['x-access-token'];
  if (!actor.usuario.id && token) {
    try {
      const payload = jwt.verify(token, process.env.SECRET_KEY);
      // Solo el token de intranet (`usuarios`) trae roleId; otros contextos se dejan como sistema.
      if (payload && payload.id && payload.roleId) {
        return { usuario: { id: payload.id, contexto: 'usuarios' }, ip: actor.ip, motivo: null };
      }
    } catch (e) { /* token inválido/expirado: queda como sistema sin token */ }
  }
  return { usuario: actor.usuario, ip: actor.ip, motivo: actor.motivoSinToken };
}

function tablaDe(modelo) {
  return modelo && modelo.tableName;
}

function debeAuditar(modelo, options) {
  const tabla = tablaDe(modelo);
  if (!tabla || TABLAS_EXCLUIDAS.indexOf(tabla) !== -1) return false;
  if (options && options.transaction && TABLAS_AUDITORIA_MANUAL.indexOf(tabla) !== -1) return false;
  return true;
}

function idDe(instancia) {
  const pk = instancia.constructor.primaryKeyAttribute;
  return pk ? instancia.get(pk) : null;
}

/** Escribe la fila; con transacción del llamador propaga el error, sin ella lo registra y sigue. */
function registrar(sequelize, options, datos) {
  const actor = actorActual();
  const params = Object.assign({ usuario: actor.usuario, ip: actor.ip, motivo: actor.motivo }, datos);
  if (options && options.transaction) {
    return auditar(Object.assign({ transaction: options.transaction }, params));
  }
  return sequelize.transaction(function (t) {
    return auditar(Object.assign({ transaction: t }, params));
  }).catch(function (err) {
    console.error('[auditoria-hook] no se pudo auditar', params.entidad, params.accion, err && err.message);
  });
}

/** Valores de los campos realmente cambiados (antes/después), sin ruido de Date iguales. */
function cambios(instancia) {
  const antes = {};
  const despues = {};
  (instancia.changed() || []).forEach(function (campo) {
    const previo = instancia._previousDataValues[campo];
    const nuevo = instancia.dataValues[campo];
    if (JSON.stringify(previo) === JSON.stringify(nuevo)) return;
    antes[campo] = previo === undefined ? null : previo;
    despues[campo] = nuevo === undefined ? null : nuevo;
  });
  return Object.keys(despues).length ? { antes: antes, despues: despues } : null;
}

/**
 * Registra los hooks globales en la instancia Sequelize (una sola vez, al arrancar la app).
 * @param {object} sequelize instancia `db.sequelize`
 */
function registrarHooksAuditoria(sequelize) {
  // Sequelize v4 usa su copia de Bluebird: sin esto, tras cada query se pierde el contexto async
  // y los hooks no sabrían qué usuario hizo el cambio (verificado con prueba de concurrencia).
  require('sequelize').Promise.config({ asyncHooks: true });

  // `Model.update/destroy(..., {where})` no disparan hooks por fila. No se fuerza `individualHooks`
  // porque cambia el valor de retorno ([n, filas]) que las rutas legacy devuelven tal cual al cliente:
  // se leen las filas antes y después y se audita cada una.
  function leerAntes(options) {
    if (options.truncate || options.individualHooks || !debeAuditar(this, options)) return;
    return this.findAll({ where: options.where, transaction: options.transaction, raw: true }).then(function (filas) {
      options._auditoriaAntes = filas;
    });
  }
  sequelize.addHook('beforeBulkUpdate', 'auditoriaLeerAntes', leerAntes);
  sequelize.addHook('beforeBulkDestroy', 'auditoriaLeerAntes', leerAntes);

  sequelize.addHook('afterBulkUpdate', 'auditoriaEditarMasivo', function (options) {
    const antes = options._auditoriaAntes;
    delete options._auditoriaAntes;
    if (!antes || !antes.length) return;
    const Modelo = this;
    const pk = Modelo.primaryKeyAttribute;
    const where = {};
    where[pk] = antes.map(function (f) { return f[pk]; });
    return Modelo.findAll({ where: where, transaction: options.transaction, raw: true }).then(function (despues) {
      const porId = {};
      despues.forEach(function (f) { porId[f[pk]] = f; });
      return Promise.all(antes.map(function (filaAntes) {
        const filaDespues = porId[filaAntes[pk]] || {};
        const a = {};
        const d = {};
        Object.keys(filaDespues).forEach(function (campo) {
          if (JSON.stringify(filaAntes[campo]) === JSON.stringify(filaDespues[campo])) return;
          a[campo] = filaAntes[campo] === undefined ? null : filaAntes[campo];
          d[campo] = filaDespues[campo];
        });
        if (!Object.keys(d).length) return null;
        return registrar(sequelize, options, { entidad: tablaDe(Modelo), entidad_id: filaAntes[pk], accion: 'EDITAR', antes: a, despues: d });
      }));
    });
  });

  sequelize.addHook('afterBulkDestroy', 'auditoriaEliminarMasivo', function (options) {
    const antes = options._auditoriaAntes;
    delete options._auditoriaAntes;
    if (!antes || !antes.length) return;
    const Modelo = this;
    return Promise.all(antes.map(function (fila) {
      return registrar(sequelize, options, { entidad: tablaDe(Modelo), entidad_id: fila[Modelo.primaryKeyAttribute], accion: 'ELIMINAR', antes: fila, despues: null });
    }));
  });

  sequelize.addHook('afterCreate', 'auditoriaCrear', function (instancia, options) {
    if (!debeAuditar(instancia.constructor, options)) return;
    return registrar(sequelize, options, {
      entidad: tablaDe(instancia.constructor), entidad_id: idDe(instancia), accion: 'CREAR', antes: null, despues: instancia
    });
  });

  // Los cambios se calculan antes del UPDATE: después, save() limpia `_previousDataValues`.
  sequelize.addHook('beforeUpdate', 'auditoriaCapturarAntes', function (instancia, options) {
    if (debeAuditar(instancia.constructor, options)) instancia._auditoriaCambios = cambios(instancia);
  });
  sequelize.addHook('afterUpdate', 'auditoriaEditar', function (instancia, options) {
    const c = instancia._auditoriaCambios;
    delete instancia._auditoriaCambios;
    if (!c) return;
    return registrar(sequelize, options, {
      entidad: tablaDe(instancia.constructor), entidad_id: idDe(instancia), accion: 'EDITAR', antes: c.antes, despues: c.despues
    });
  });

  sequelize.addHook('afterDestroy', 'auditoriaEliminar', function (instancia, options) {
    if (!debeAuditar(instancia.constructor, options)) return;
    return registrar(sequelize, options, {
      entidad: tablaDe(instancia.constructor), entidad_id: idDe(instancia), accion: 'ELIMINAR', antes: instancia, despues: null
    });
  });

  // bulkCreate: una fila resumen (cantidad e ids) en vez de una por registro.
  sequelize.addHook('afterBulkCreate', 'auditoriaCrearMasivo', function (instancias, options) {
    if (options.individualHooks || !instancias || !instancias.length || !debeAuditar(instancias[0].constructor, options)) return;
    return registrar(sequelize, options, {
      entidad: tablaDe(instancias[0].constructor),
      accion: 'CREAR_MASIVO',
      despues: { cantidad: instancias.length, ids: instancias.map(idDe) }
    });
  });
}

module.exports = { registrarHooksAuditoria, middlewareContexto, actorActual, TABLAS_AUDITORIA_MANUAL };
