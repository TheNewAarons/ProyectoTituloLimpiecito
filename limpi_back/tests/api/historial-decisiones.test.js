/**
 * RNF-SEC-02 (revisión de requerimientos: trazabilidad visible de decisiones con dinero).
 * - GET /api/v1/auditoria/historial?entidad=&entidad_id= (solo Admin) con nombre y rol de quien actuó.
 * - PUT /centro_costo/cerrar/:id (AUT-020): exige sesión y rol, y deja CIERRE en la auditoría (antes/después).
 * jsonwebtoken real; modelos simulados.
 */
jest.mock('../../database/database', () => ({
  sequelize: { transaction: jest.fn(async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } })) }
}));
jest.mock('../../modelos/sistema_base/Role', () => ({
  findById: jest.fn(async (id) => ({ 1: { id: 1, nombre: 'Administrador' }, 7: { id: 7, nombre: 'APOYO_LVL_1' }, 9: { id: 9, nombre: 'Operaciones' } }[id] || null)),
  findAll: jest.fn(async () => [{ id: 1, nombre: 'Administrador' }])
}));
jest.mock('../../modelos/sistema_base/Usuario', () => ({
  findById: jest.fn(async (id) => ({ id: id, correo: 'u' + id + '@prueba.cl', roleId: id, estado: 1 })),
  findAll: jest.fn(async () => [{ id: 1, nombre: 'Ana', apellido: 'Soto', roleId: 1 }])
}));
jest.mock('../../modelos/sistema_base/Trabajadore', () => ({ findById: jest.fn() }));
jest.mock('../../modelos/sistema_intranet/acceso_laboral', () => ({ findOne: jest.fn() }));
jest.mock('../../modelos/sistema_base/Auditoria', () => ({ findAll: jest.fn(), findAndCountAll: jest.fn(), findById: jest.fn() }));
jest.mock('../../modelos/sistema_bodega/Movimiento_bodega', () => ({}));
jest.mock('../../modelos/sistema_base/Producto', () => ({}));
jest.mock('../../modelos/sistema_base/Centro_costo', () => ({ findById: jest.fn(), update: jest.fn() }));
jest.mock('../../api/apartado_base/centro_costo/logica', () => ({ obtenerCentroCostoIdDB: jest.fn(), editarCentroCostoDB: jest.fn() }));
jest.mock('../../services/auditoria', () => {
  const real = jest.requireActual('../../services/auditoria');
  return Object.assign({}, real, { auditar: jest.fn(async () => ({})) });
});

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const Auditoria = require('../../modelos/sistema_base/Auditoria');
const Centro = require('../../modelos/sistema_base/Centro_costo');
const logica = require('../../api/apartado_base/centro_costo/logica');
const { auditar } = require('../../services/auditoria');
const { autenticar, requerirRol } = require('../../middleware/auth');
const { manejadorErrores } = require('../../middleware/errores');
const { ROL_ADMIN_NOMBRES } = require('../../services/constantes');

const CLAVE = 'clave-de-prueba-rnf-sec-02';
const ADMIN = jwt.sign({ id: 1, correo: 'u1@prueba.cl', roleId: 1 }, CLAVE);
const OPERACIONES = jwt.sign({ id: 9, correo: 'u9@prueba.cl', roleId: 9 }, CLAVE);
const APOYO = jwt.sign({ id: 7, correo: 'u7@prueba.cl', roleId: 7 }, CLAVE);

function app() {
  const a = express();
  a.use(express.json());
  a.use(express.urlencoded({ extended: true }));
  a.use('/api/v1/auditoria', autenticar, requerirRol.apply(null, ROL_ADMIN_NOMBRES), require('../../api/v1/auditoria/routes'));
  a.use('/centro_costo', require('../../api/apartado_base/centro_costo/routes'));
  a.use(manejadorErrores);
  return a;
}
const conToken = (r, t) => (t ? r.set('x-access-token', t) : r);
const historial = (q, t) => conToken(request(app()).get('/api/v1/auditoria/historial').query(q), t);
const CENTRO = { fecha_inicio: '2026-11-01', fecha_cierre: '2026-11-25', precio_servicio: 1000000, total_costos: 700000, utilidad: 300000, numero_cc: 196, estado: 0, clienteId: 3, cajaId: 13 };
const cerrar = (t) => conToken(request(app()).put('/centro_costo/cerrar/50'), t).send({ centro_costo: JSON.stringify(CENTRO) });

beforeEach(() => {
  process.env.SECRET_KEY = CLAVE;
  jest.clearAllMocks();
});

describe('GET /api/v1/auditoria/historial', () => {
  const fila = (o) => Object.assign({ id: 1, usuario_id: 1, contexto_usuario: 'usuarios', entidad: 'cajas', entidad_id: '13', accion: 'REAPERTURA',
    valores_antes: '{"estado":0}', valores_despues: '{"estado":1}', motivo: 'Faltó un egreso', ip: '::1', created_at: new Date('2026-11-25T15:00:00Z') }, o);

  it('devuelve el historial de la entidad con nombre y rol de quien actuó', async () => {
    Auditoria.findAll.mockResolvedValue([fila(), fila({ id: 2, usuario_id: null, contexto_usuario: 'sistema', accion: 'RECALCULO', motivo: 'CASCADA' })]);
    const r = await historial({ entidad: 'cajas', entidad_id: '13' }, ADMIN);
    expect(r.status).toBe(200);
    expect(Auditoria.findAll.mock.calls[0][0].where).toEqual({ entidad: 'cajas', entidad_id: '13' });
    expect(r.body.data[0]).toMatchObject({ accion: 'REAPERTURA', motivo: 'Faltó un egreso', valores_antes: { estado: 0 }, quien: { nombre: 'Ana Soto', rol: 'Administrador' } });
    expect(r.body.data[1].quien).toEqual({ nombre: 'Sistema', rol: null });
    expect(r.body.meta).toMatchObject({ hay_mas: false, limite: 100 });
  });

  it('avisa cuando hay más de 100 registros', async () => {
    Auditoria.findAll.mockResolvedValue(Array.from({ length: 101 }, (_, i) => fila({ id: i + 1 })));
    const r = await historial({ entidad: 'cajas', entidad_id: '13' }, ADMIN);
    expect(r.body.data).toHaveLength(100);
    expect(r.body.meta.hay_mas).toBe(true);
  });

  it('valida entidad y entidad_id (400)', async () => {
    expect((await historial({ entidad: 'cajas; drop', entidad_id: '13' }, ADMIN)).status).toBe(400);
    expect((await historial({ entidad: 'cajas' }, ADMIN)).status).toBe(400);
    expect(Auditoria.findAll).not.toHaveBeenCalled();
  });

  it('sin sesión 401 y sin rol Administrador 403', async () => {
    expect((await historial({ entidad: 'cajas', entidad_id: '13' })).status).toBe(401);
    expect((await historial({ entidad: 'cajas', entidad_id: '13' }, OPERACIONES)).status).toBe(403);
  });

  it('no tapa la consulta por id existente (/:id sigue funcionando)', async () => {
    Auditoria.findById.mockResolvedValue(fila({ id: 5 }));
    const r = await conToken(request(app()).get('/api/v1/auditoria/5'), ADMIN);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(5);
  });
});

describe('PUT /centro_costo/cerrar/:id (AUT-020)', () => {
  beforeEach(() => {
    logica.obtenerCentroCostoIdDB.mockResolvedValue({ id: 50 });
    Centro.findById.mockResolvedValue({ get: () => ({ id: 50, estado: 1, fecha_cierre: null, precio_servicio: 1000000, total_costos: 650000, utilidad: 350000 }) });
    Centro.update.mockResolvedValue([1]);
  });

  it('con sesión: cierra como antes y deja CIERRE con quién y valores antes/después', async () => {
    const r = await cerrar(OPERACIONES);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ filas: [1] });
    expect(Centro.update).toHaveBeenCalledWith(expect.objectContaining({ estado: 0, utilidad: 300000 }), expect.objectContaining({ where: { id: '50' } }));
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      entidad: 'centro_costos', entidad_id: 50, accion: 'CIERRE',
      usuario: { id: 9, contexto: 'usuarios' },
      antes: expect.objectContaining({ estado: 1, utilidad: 350000 }),
      despues: expect.objectContaining({ estado: 0, utilidad: 300000, total_costos: 700000 })
    }));
    expect(logica.editarCentroCostoDB).not.toHaveBeenCalled();
  });

  it('si la auditoría falla, no responde éxito (la transacción se revierte)', async () => {
    auditar.mockRejectedValueOnce(new Error('auditoría caída'));
    const r = await cerrar(ADMIN);
    expect(r.text).toMatch(/^error/);
    expect(r.body.filas).toBeUndefined();
  });

  it('sin sesión 401 y con APOYO_LVL_1 403, sin tocar la BD', async () => {
    expect((await cerrar(null)).status).toBe(401);
    expect((await cerrar(APOYO)).status).toBe(403);
    expect(Centro.update).not.toHaveBeenCalled();
    expect(auditar).not.toHaveBeenCalled();
  });
});
