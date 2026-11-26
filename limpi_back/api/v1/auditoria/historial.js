/**
 * RNF-SEC-02 (revisión de requerimientos: trazabilidad visible) — GET /api/v1/auditoria/historial
 * ?entidad=&entidad_id= (solo Admin; la sesión y el rol los aplica index.js sobre /api/v1/auditoria).
 * Historial de UNA entidad para el botón "Historial" del ERP: lo mismo que la auditoría, más el nombre y rol
 * de quien actuó (la tabla guarda solo usuario_id + contexto). Solo lectura.
 */
const Op = require('sequelize').Op;
const AppError = require('../../../libs/app-error');
const Auditoria = require('../../../modelos/sistema_base/Auditoria');
const Usuario = require('../../../modelos/sistema_base/Usuario');
const Role = require('../../../modelos/sistema_base/Role');
const Caja = require('../../../modelos/sistema_base/Caja');
const CentroCosto = require('../../../modelos/sistema_base/Centro_costo');
const CcEgreso = require('../../../modelos/sistema_base/CcEgreso');
const CcIngreso = require('../../../modelos/sistema_base/CcIngreso');
const ListaInsumo = require('../../../modelos/sistema_base/Lista_insumo');
const CentroTrabajador = require('../../../modelos/sistema_base/Centro_costo_trabajadore');
const Egreso = require('../../../modelos/sistema_base/Egreso');
const { serializar } = require('./controlador');

const LIMITE = 100;

// Quien no es un usuario del ERP se muestra por su tipo (los ids de otras tablas no se resuelven aquí).
const ETIQUETA_CONTEXTO = {
  sistema: 'Sistema',
  acceso_clientes: 'Acceso de cliente',
  acceso_trabajadores: 'App laboral',
  usuario_apps: 'Usuario de la app'
};

async function nombresDeUsuarios(filas) {
  const ids = Array.from(new Set(filas.filter((f) => f.contexto_usuario === 'usuarios' && f.usuario_id).map((f) => f.usuario_id)));
  if (!ids.length) return {};
  const usuarios = await Usuario.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'nombre', 'apellido', 'roleId'] });
  const rolIds = Array.from(new Set(usuarios.map((u) => u.roleId).filter(Boolean)));
  const roles = rolIds.length ? await Role.findAll({ where: { id: { [Op.in]: rolIds } }, attributes: ['id', 'nombre'] }) : [];
  const rolPorId = {};
  roles.forEach((r) => { rolPorId[r.id] = r.nombre; });
  const r = {};
  usuarios.forEach((u) => {
    r[u.id] = { nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || ('Usuario #' + u.id), rol: rolPorId[u.roleId] || null };
  });
  return r;
}

function quien(fila, nombres) {
  if (fila.contexto_usuario === 'usuarios' && fila.usuario_id) {
    return nombres[fila.usuario_id] || { nombre: 'Usuario #' + fila.usuario_id, rol: null };
  }
  const etiqueta = ETIQUETA_CONTEXTO[fila.contexto_usuario] || fila.contexto_usuario || 'Desconocido';
  return { nombre: fila.usuario_id ? etiqueta + ' #' + fila.usuario_id : etiqueta, rol: null };
}

async function historial(req, res) {
  const q = req.query || {};
  const entidad = typeof q.entidad === 'string' ? q.entidad.trim() : '';
  const entidadId = typeof q.entidad_id === 'string' ? q.entidad_id.trim() : '';
  if (!/^[a-z_]{2,60}$/.test(entidad)) throw new AppError('CAMPO_INVALIDO', 'entidad invalida', 400, { campo: 'entidad' });
  if (!entidadId || entidadId.length > 64) throw new AppError('CAMPO_INVALIDO', 'entidad_id invalido', 400, { campo: 'entidad_id' });

  const filas = await Auditoria.findAll({
    where: { entidad: entidad, entidad_id: entidadId },
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: LIMITE + 1
  });
  const hayMas = filas.length > LIMITE;
  const visibles = filas.slice(0, LIMITE);
  const nombres = await nombresDeUsuarios(visibles);
  const data = visibles.map((f) => Object.assign(serializar(f), { quien: quien(f, nombres) }));
  return res.json({ ok: true, data: data, meta: { entidad: entidad, entidad_id: entidadId, limite: LIMITE, hay_mas: hayMas } });
}

const LIMITE_CAJA = 300;

function ids(filas, campo) {
  return filas.map((f) => f[campo || 'id']).filter((v) => v !== null && v !== undefined).map(String);
}

/**
 * GET /api/v1/auditoria/historial-caja?caja_id= — TODO lo auditado de una caja mensual: la caja, sus centros de
 * costo y lo que cuelga de ellos (egresos/ingresos CC, listas de insumos, liquidaciones) y sus egresos generales.
 */
async function historialCaja(req, res) {
  const cajaId = Number((req.query || {}).caja_id);
  if (!Number.isInteger(cajaId) || cajaId <= 0) throw new AppError('CAMPO_INVALIDO', 'caja_id invalido', 400, { campo: 'caja_id' });
  const caja = await Caja.findById(cajaId);
  if (!caja) throw new AppError('NOT_FOUND', 'caja no encontrada', 404);

  const centros = await CentroCosto.findAll({ where: { cajaId: cajaId }, attributes: ['id'] });
  const centroIds = ids(centros);
  const porCentro = { centroCostoId: { [Op.in]: centroIds.length ? centroIds : [-1] } };
  const [ccEgresos, ccIngresos, listas, asignaciones, egresos] = await Promise.all([
    CcEgreso.findAll({ where: porCentro, attributes: ['id'] }),
    CcIngreso.findAll({ where: porCentro, attributes: ['id'] }),
    ListaInsumo.findAll({ where: porCentro, attributes: ['id'] }),
    CentroTrabajador.findAll({ where: porCentro, attributes: ['liquidacioneId'] }),
    Egreso.findAll({ where: { cajaId: cajaId }, attributes: ['id'] })
  ]);

  const condiciones = [
    { entidad: 'cajas', entidad_id: { [Op.in]: [String(cajaId), String(caja.periodo)] } },
    // recálculos en cascada se auditan con el rango 'desde..hasta'
    { entidad: 'cajas', entidad_id: { [Op.like]: '%..%' } }
  ];
  [['centro_costos', centroIds], ['cc_egresos', ids(ccEgresos)], ['cc_ingresos', ids(ccIngresos)],
    ['lista_insumos', ids(listas)], ['liquidaciones', ids(asignaciones, 'liquidacioneId')], ['egresos', ids(egresos)]]
    .forEach(([entidad, lista]) => { if (lista.length) condiciones.push({ entidad: entidad, entidad_id: { [Op.in]: lista } }); });

  const periodo = String(caja.periodo || '');
  const filas = (await Auditoria.findAll({
    where: { [Op.or]: condiciones },
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: LIMITE_CAJA + 50
  })).filter((f) => {
    const rango = String(f.entidad_id).split('..');
    return rango.length !== 2 || (periodo >= rango[0] && periodo <= rango[1]);
  });
  const hayMas = filas.length > LIMITE_CAJA;
  const visibles = filas.slice(0, LIMITE_CAJA);
  const nombres = await nombresDeUsuarios(visibles);
  const data = visibles.map((f) => Object.assign(serializar(f), { quien: quien(f, nombres) }));
  return res.json({ ok: true, data: data, meta: { caja_id: cajaId, periodo: periodo, limite: LIMITE_CAJA, hay_mas: hayMas } });
}

module.exports = { historial, historialCaja };
