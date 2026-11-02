/**
 * RF-BOD-01 — Tests de los modelos de bodega (sin BD): nombres de tabla/columna alineados con la
 * migración 20261024215235 y validaciones en el modelo. La instancia de Sequelize no se conecta.
 */
jest.mock('../../database/database', () => {
  const Sequelize = require('sequelize');
  return { sequelize: new Sequelize('test', 'test', 'test', { dialect: 'mysql', logging: false, operatorsAliases: false }) };
});

const Solicitud = require('../../modelos/sistema_bodega/Solicitud_bodega');
const Item = require('../../modelos/sistema_bodega/Solicitud_item');
const { ESTADOS_SOLICITUD, ETIQUETA_ESTADO } = require('../../services/bodega/constantes');

describe('modelo solicitudes_bodega', () => {
  it('usa la tabla y columnas de la migración', () => {
    expect(Solicitud.getTableName()).toBe('solicitudes_bodega');
    expect(Object.keys(Solicitud.rawAttributes).sort()).toEqual([
      'anulada_at', 'centro_costo_id', 'created_at', 'entregada_at', 'estado', 'id',
      'observacion', 'trabajador_id', 'updated_at', 'usuario_id'
    ]);
  });

  it('nace PENDIENTE', () => {
    expect(Solicitud.build({ centro_costo_id: 1, trabajador_id: 1 }).estado).toBe(ESTADOS_SOLICITUD.PENDIENTE);
  });

  it('exige centro de costo', async () => {
    await expect(Solicitud.build({ trabajador_id: 1 }).validate()).rejects.toThrow(/centro_costo_id/);
  });
});

describe('modelo solicitud_items', () => {
  it('usa la tabla y columnas de la migración', () => {
    expect(Item.getTableName()).toBe('solicitud_items');
    expect(Object.keys(Item.rawAttributes).sort()).toEqual([
      'cantidad_asignada', 'cantidad_faltante', 'cantidad_pedida', 'created_at', 'id', 'producto_id', 'solicitud_id'
    ]);
  });

  it('asignada 0 y faltante null antes del cruce', () => {
    const item = Item.build({ solicitud_id: 1, producto_id: 1, cantidad_pedida: 3 });
    expect(item.cantidad_asignada).toBe(0);
    expect(item.cantidad_faltante == null).toBe(true);
  });

  it.each([0, -2, 1.5])('rechaza cantidad_pedida %p', async (cantidad) => {
    await expect(Item.build({ solicitud_id: 1, producto_id: 1, cantidad_pedida: cantidad }).validate()).rejects.toThrow();
  });

  it('acepta cantidad entera positiva', async () => {
    await expect(Item.build({ solicitud_id: 1, producto_id: 1, cantidad_pedida: 12 }).validate()).resolves.toBeDefined();
  });
});

describe('constantes de estado', () => {
  it('cada estado tiene etiqueta y PARCIAL/LISTA_ENTREGA se muestran como En proceso', () => {
    Object.keys(ESTADOS_SOLICITUD).forEach((e) => expect(ETIQUETA_ESTADO[e]).toBeTruthy());
    expect(ETIQUETA_ESTADO.PARCIAL).toBe('En proceso');
    expect(ETIQUETA_ESTADO.LISTA_ENTREGA).toBe('En proceso');
  });
});
