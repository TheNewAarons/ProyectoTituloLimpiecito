/**
 * RF-BOD-02 — Cruce de stock y lista de compra (Docs/DECISIONES.md D-052…D-063).
 * `cruzar`/`revertir` corren DENTRO de la transacción y con los productos ya bloqueados
 * (FOR UPDATE, id ASC) del llamador (services/bodega/solicitudes.js#crear/#anular, D-062):
 * no abren transacción propia ni vuelven a bloquear.
 */

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const READ_COMMITTED = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

const db = require('../../database/database');
const AppError = require('../../libs/app-error');
const { auditar } = require('../auditoria');
const { reintentarTransaccion } = require('../caja/cierre');
const Solicitud = require('../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../modelos/sistema_bodega/Solicitud_item');
const Movimiento = require('../../modelos/sistema_bodega/Movimiento_bodega');
const Producto = require('../../modelos/sistema_base/Producto');
const Proveedor = require('../../modelos/sistema_bodega/Proveedor');
const Orden_compra = require('../../modelos/sistema_bodega/Orden_compra');
const Orden_compra_item = require('../../modelos/sistema_bodega/Orden_compra_item');
const { ESTADOS_SOLICITUD: E, TIPOS_MOVIMIENTO: M } = require('./constantes');

const ESTADOS_ORDEN_PENDIENTE = ['ENVIADA', 'RECIBIDA_PARCIAL'];

const porId = (filas) => filas.reduce((m, f) => { m[f.id] = f; return m; }, {});
const unicos = (lista) => Array.from(new Set(lista.filter((v) => v !== null && v !== undefined)));

// D-054: stock NULL o negativo = 0 disponible, sin corregir el valor en productos.
function disponible(producto) {
  const s = Number(producto.stock);
  return Number.isFinite(s) && s > 0 ? s : 0;
}

/**
 * Cruza stock contra los items recién creados de una solicitud (D-053: misma transacción de crear()).
 * @param {object} solicitud instancia Solicitud_bodega recién creada
 * @param {object[]} items instancias Solicitud_item recién creadas (misma solicitud)
 * @param {object[]} productosLock instancias Producto bloqueadas (FOR UPDATE, id ASC) que cubren todos los items
 * @param {{id:number, contexto:string}} usuario actor (D-059)
 * @param {object} t transacción activa
 * @param {string} [ip]
 * @returns {Promise<object>} la instancia solicitud, con estado PARCIAL o LISTA_ENTREGA
 */
async function cruzar(solicitud, items, productosLock, usuario, t, ip) {
  if (solicitud.estado !== E.PENDIENTE) {
    throw new AppError('ESTADO_NO_PERMITE_CRUCE', 'la solicitud no se puede cruzar en estado ' + solicitud.estado, 409, { estado: solicitud.estado });
  }
  const productos = porId(productosLock);
  let hayFaltante = false;

  for (const item of items) {
    const producto = productos[item.producto_id];
    if (!producto) {
      throw new AppError('PRODUCTO_NO_BLOQUEADO', 'el producto ' + item.producto_id + ' no fue bloqueado para el cruce', 500, { producto_id: item.producto_id });
    }
    const pedida = Number(item.cantidad_pedida);
    const asignada = Math.min(disponible(producto), pedida);
    const faltante = pedida - asignada;
    if (faltante > 0) hayFaltante = true;

    await item.update({ cantidad_asignada: asignada, cantidad_faltante: faltante }, { transaction: t });

    if (asignada > 0) {
      await producto.update({ stock: Number(producto.stock) - asignada }, { transaction: t });
      await Movimiento.create({
        producto_id: producto.id,
        tipo: M.SALIDA_SOLICITUD,
        cantidad: -asignada,
        referencia_tipo: 'solicitudes_bodega',
        referencia_id: solicitud.id,
        usuario_id: usuario.id,
        contexto_usuario: usuario.contexto
      }, { transaction: t });
    }
  }

  const nuevoEstado = hayFaltante ? E.PARCIAL : E.LISTA_ENTREGA;
  const antes = solicitud.get({ plain: true });
  await solicitud.update({ estado: nuevoEstado }, { transaction: t });
  await auditar({
    transaction: t, usuario: { id: usuario.id, contexto: usuario.contexto }, entidad: 'solicitudes_bodega',
    entidad_id: solicitud.id, accion: 'CRUCE_STOCK', antes: antes, despues: solicitud, ip: ip
  });
  return solicitud;
}

/**
 * Reversa de lo asignado al anular (D-063): repone stock y deja el hecho en `movimientos_bodega`
 * (REVERSA) + auditoría; NO toca cantidad_asignada/cantidad_faltante de los items.
 * @param {object} solicitud instancia Solicitud_bodega (ya bloqueada por el llamador)
 * @param {object[]} items instancias Solicitud_item de la solicitud
 * @param {object[]} productosLock instancias Producto bloqueadas (FOR UPDATE, id ASC) que cubren todos los items
 * @param {{id:number, contexto:string}} usuario actor
 * @param {object} t transacción activa
 * @param {string} [ip]
 */
async function revertir(solicitud, items, productosLock, usuario, t, ip) {
  const productos = porId(productosLock);
  const repuestos = [];

  for (const item of items) {
    const asignada = Number(item.cantidad_asignada) || 0;
    if (asignada <= 0) continue;
    const producto = productos[item.producto_id];
    if (!producto) {
      throw new AppError('PRODUCTO_NO_BLOQUEADO', 'el producto ' + item.producto_id + ' no fue bloqueado para la reversa', 500, { producto_id: item.producto_id });
    }
    await producto.update({ stock: Number(producto.stock || 0) + asignada }, { transaction: t });
    await Movimiento.create({
      producto_id: producto.id,
      tipo: M.REVERSA,
      cantidad: asignada,
      referencia_tipo: 'solicitudes_bodega',
      referencia_id: solicitud.id,
      usuario_id: usuario.id,
      contexto_usuario: usuario.contexto
    }, { transaction: t });
    repuestos.push({ producto_id: producto.id, cantidad: asignada });
  }

  if (repuestos.length) {
    await auditar({
      transaction: t, usuario: { id: usuario.id, contexto: usuario.contexto }, entidad: 'solicitudes_bodega',
      entidad_id: solicitud.id, accion: 'REVERSA_STOCK', antes: null, despues: { solicitud_id: solicitud.id, repuestos: repuestos }, ip: ip
    });
  }
}

/**
 * GET /solicitudes/:id/cruce — tres tablas derivadas de los items: lo pedido, lo descontado del
 * stock y lo que falta comprar.
 * @param {number} id id de la solicitud
 */
async function obtenerCruce(id) {
  const solicitud = await Solicitud.findById(id, { attributes: ['id', 'estado'] });
  if (!solicitud) {
    throw new AppError('SOLICITUD_NO_EXISTE', 'la solicitud no existe', 404, { id: id });
  }
  const items = await Item.findAll({ where: { solicitud_id: id }, order: [['id', 'ASC']] });
  const productos = porId(await Producto.findAll({ where: { id: { [Op.in]: unicos(items.map((i) => i.producto_id)) } }, attributes: ['id', 'nombre'] }));
  const nombreDe = (productoId) => (productos[productoId] ? productos[productoId].nombre : null);
  const fila = (i, cantidad) => ({ item_id: i.id, producto_id: i.producto_id, producto: nombreDe(i.producto_id), cantidad: cantidad });
  const revertido = solicitud.estado === E.ANULADA;

  return {
    solicitud_id: solicitud.id,
    estado: solicitud.estado,
    revertido: revertido,
    cruzada: items.length > 0 && items.every((i) => i.cantidad_faltante !== null && i.cantidad_faltante !== undefined),
    pedido: items.map((i) => fila(i, i.cantidad_pedida)),
    descontado: items.filter((i) => Number(i.cantidad_asignada) > 0).map((i) => Object.assign(fila(i, i.cantidad_asignada), { revertido: revertido })),
    falta_comprar: items.filter((i) => Number(i.cantidad_faltante) > 0).map((i) => fila(i, i.cantidad_faltante))
  };
}

// Σ cantidad_faltante de items de solicitudes PARCIAL, por producto_id.
async function sumarFaltantePendiente(transaction) {
  const solicitudesParcial = await Solicitud.findAll({ where: { estado: E.PARCIAL }, attributes: ['id'], transaction: transaction });
  const idsSolicitud = solicitudesParcial.map((s) => s.id);
  const itemsFaltantes = idsSolicitud.length
    ? await Item.findAll({ where: { solicitud_id: { [Op.in]: idsSolicitud } }, attributes: ['producto_id', 'cantidad_faltante'], transaction: transaction })
    : [];
  const porProducto = {};
  itemsFaltantes.forEach((i) => {
    const f = Number(i.cantidad_faltante) || 0;
    if (f > 0) porProducto[i.producto_id] = (porProducto[i.producto_id] || 0) + f;
  });
  return porProducto;
}

// Σ (cantidad - cantidad_recibida, minimo 0) de items de ordenes ENVIADA/RECIBIDA_PARCIAL, por producto_id.
async function sumarPendienteOrdenes(transaction) {
  const ordenes = await Orden_compra.findAll({ where: { estado: { [Op.in]: ESTADOS_ORDEN_PENDIENTE } }, attributes: ['id'], transaction: transaction });
  const idsOrden = ordenes.map((o) => o.id);
  const items = idsOrden.length
    ? await Orden_compra_item.findAll({ where: { orden_id: { [Op.in]: idsOrden } }, attributes: ['producto_id', 'cantidad', 'cantidad_recibida'], transaction: transaction })
    : [];
  const porProducto = {};
  items.forEach((i) => {
    const pendiente = Math.max(Number(i.cantidad) - Number(i.cantidad_recibida), 0);
    if (pendiente > 0) porProducto[i.producto_id] = (porProducto[i.producto_id] || 0) + pendiente;
  });
  return porProducto;
}

// Σ cantidad de items en ordenes BORRADOR, por producto_id (informativo, no resta de la lista).
async function sumarEnBorrador(transaction) {
  const borradores = await Orden_compra.findAll({ where: { estado: 'BORRADOR' }, attributes: ['id'], transaction: transaction });
  const idsOrden = borradores.map((o) => o.id);
  const items = idsOrden.length
    ? await Orden_compra_item.findAll({ where: { orden_id: { [Op.in]: idsOrden } }, attributes: ['producto_id', 'cantidad'], transaction: transaction })
    : [];
  const porProducto = {};
  items.forEach((i) => { porProducto[i.producto_id] = (porProducto[i.producto_id] || 0) + Number(i.cantidad); });
  return porProducto;
}

/**
 * GET /lista-compra — D-061: faltante(PARCIAL) - pendiente(ENVIADA/RECIBIDA_PARCIAL) de entrega,
 * solo > 0; `stock_actual`/`en_borrador` son informativos y no restan.
 * @param {{agrupar?: (string|null)}} filtros agrupar='proveedor' devuelve grupos por proveedor_id (null aparte)
 * @param {object} [transaction] transacción del llamador (generarDesdeLista); sin ella, lectura suelta
 * @returns {Promise<object[]>} filas planas, o grupos `{proveedor_id, proveedor, productos}` si agrupar='proveedor'
 */
async function listaCompra(filtros, transaction) {
  const [faltante, pendiente, enBorrador] = await Promise.all([
    sumarFaltantePendiente(transaction),
    sumarPendienteOrdenes(transaction),
    sumarEnBorrador(transaction)
  ]);
  const productoIds = Object.keys(faltante).map(Number);
  if (!productoIds.length) return [];

  const productos = porId(await Producto.findAll({ where: { id: { [Op.in]: productoIds } }, attributes: ['id', 'nombre', 'stock', 'proveedor_id', 'costo_unitario'], transaction: transaction }));
  const filas = [];
  productoIds.forEach((id) => {
    const neto = faltante[id] - (pendiente[id] || 0);
    if (neto <= 0) return;
    const producto = productos[id];
    filas.push({
      producto_id: id,
      producto: producto ? producto.nombre : null,
      proveedor_id: producto ? producto.proveedor_id : null,
      costo_unitario: producto ? producto.costo_unitario : null,
      cantidad_a_comprar: neto,
      stock_actual: producto ? disponible(producto) : 0,
      en_borrador: enBorrador[id] || 0
    });
  });

  if (!filtros || filtros.agrupar !== 'proveedor') return filas;

  const proveedorIds = unicos(filas.map((f) => f.proveedor_id)).filter((v) => v !== null);
  const proveedores = porId(await Proveedor.findAll({ where: { id: { [Op.in]: proveedorIds } }, attributes: ['id', 'nombre', 'activo'], transaction: transaction }));
  const grupos = {};
  filas.forEach((f) => {
    const clave = f.proveedor_id === null ? 'sin_proveedor' : String(f.proveedor_id);
    if (!grupos[clave]) {
      const proveedor = f.proveedor_id !== null ? proveedores[f.proveedor_id] : null;
      grupos[clave] = {
        proveedor_id: f.proveedor_id,
        proveedor: proveedor ? proveedor.nombre : null,
        proveedor_activo: proveedor ? Number(proveedor.activo) === 1 : null,
        productos: []
      };
    }
    grupos[clave].productos.push(f);
  });
  return Object.keys(grupos).map((k) => grupos[k]);
}

/**
 * POST /ordenes-compra/desde-lista — un BORRADOR por proveedor a partir de la lista de compra
 * agrupada (D-060). Omite proveedores que ya tienen un BORRADOR (reportado, sin modificarlo) y
 * excluye productos sin proveedor o con proveedor inactivo (reportados). Mutex: FOR UPDATE sobre
 * `proveedores` id ASC.
 * @param {{usuario: {id:number, contexto:string}, ip?: string}} contexto
 * @returns {Promise<{creadas: object[], omitidas: object[], sin_proveedor: object[]}>}
 */
async function generarDesdeLista(contexto) {
  const usuario = contexto.usuario;
  const ip = contexto.ip;
  return reintentarTransaccion(function () {
    return db.sequelize.transaction({ isolationLevel: READ_COMMITTED }, async function (t) {
      const reporte = { creadas: [], omitidas: [], sin_proveedor: [] };

      // Lectura previa (sin lock) solo para saber qué bloquear. Orden de locks fijo para evitar
      // deadlock con proveedorProducto.asignarProveedor (X sobre productos, luego lee proveedores):
      // productos (id ASC) SIEMPRE antes de proveedores (id ASC) también aquí.
      const candidatos = await listaCompra({ agrupar: 'proveedor' }, t);
      const productoIdsCandidatos = unicos(candidatos.reduce((acc, g) => acc.concat(g.productos.map((p) => p.producto_id)), [])).sort((a, b) => a - b);
      if (productoIdsCandidatos.length) {
        await Producto.findAll({ where: { id: { [Op.in]: productoIdsCandidatos } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t });
      }
      const proveedorIdsCandidatos = unicos(candidatos.filter((g) => g.proveedor_id !== null).map((g) => g.proveedor_id)).sort((a, b) => a - b);
      if (proveedorIdsCandidatos.length) {
        await Proveedor.findAll({ where: { id: { [Op.in]: proveedorIdsCandidatos } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t });
      }

      // Recalculo DESPUES de ambos locks (D-062/reviewer): con READ_COMMITTED, el count de BORRADOR
      // de abajo ve lo que otra transaccion ya confirmo mientras esta esperaba el lock.
      const grupos = await listaCompra({ agrupar: 'proveedor' }, t);

      const sinProveedor = grupos.filter((g) => g.proveedor_id === null);
      if (sinProveedor.length) reporte.sin_proveedor = sinProveedor[0].productos;

      const conProveedor = grupos.filter((g) => g.proveedor_id !== null);
      if (!conProveedor.length) return reporte;

      const proveedorIds = conProveedor.map((g) => g.proveedor_id).sort((a, b) => a - b);
      const proveedores = porId(await Proveedor.findAll({
        where: { id: { [Op.in]: proveedorIds } }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t
      }));

      for (const grupo of conProveedor) {
        const proveedor = proveedores[grupo.proveedor_id];
        if (!proveedor || Number(proveedor.activo) !== 1) {
          reporte.sin_proveedor = reporte.sin_proveedor.concat(grupo.productos);
          continue;
        }
        const yaTieneBorrador = await Orden_compra.count({ where: { proveedor_id: proveedor.id, estado: 'BORRADOR' }, transaction: t });
        if (yaTieneBorrador > 0) {
          reporte.omitidas.push({ proveedor_id: proveedor.id, proveedor: proveedor.nombre, productos: grupo.productos });
          continue;
        }
        const orden = await Orden_compra.create({
          proveedor_id: proveedor.id, estado: 'BORRADOR',
          created_by: usuario.contexto === 'usuarios' ? usuario.id : null
        }, { transaction: t });
        for (const p of grupo.productos) {
          await Orden_compra_item.create({
            orden_id: orden.id, producto_id: p.producto_id, cantidad: p.cantidad_a_comprar, costo_unitario: p.costo_unitario || null
          }, { transaction: t });
        }
        await auditar({
          transaction: t, usuario: usuario, entidad: 'ordenes_compra', entidad_id: orden.id, accion: 'CREAR', motivo: 'DESDE_LISTA',
          antes: null, despues: { orden: orden.get({ plain: true }), items: grupo.productos }, ip: ip
        });
        reporte.creadas.push({ orden_id: orden.id, proveedor_id: proveedor.id, proveedor: proveedor.nombre, items: grupo.productos.length });
      }
      return reporte;
    });
  });
}

module.exports = {
  cruzar,
  revertir,
  obtenerCruce,
  listaCompra,
  generarDesdeLista
};
