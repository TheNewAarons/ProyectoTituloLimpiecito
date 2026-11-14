/**
 * RNF-SEC-02 — Sanitización recursiva de auditar() (D-077): por segmento de clave, en cualquier
 * profundidad, con detección de ciclos y sin romper Date. Verificado vía auditar() (modelo mockeado).
 */
jest.mock('../modelos/sistema_base/Auditoria', () => ({ create: jest.fn() }));

const Auditoria = require('../modelos/sistema_base/Auditoria');
const { auditar } = require('../services/auditoria');

const tx = { id: 'tx-1' };
const usuario = { id: 5, contexto: 'usuarios' };

async function valoresAntes(params) {
  await auditar(params);
  const [datos] = Auditoria.create.mock.calls[0];
  return JSON.parse(datos.valores_antes);
}

async function valoresDespues(params) {
  await auditar(params);
  const [datos] = Auditoria.create.mock.calls[0];
  return JSON.parse(datos.valores_despues);
}

describe('services/auditoria: sanitización recursiva (D-077)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auditoria.create.mockResolvedValue({ id: 1 });
  });

  it('quita password de objetos anidados y conserva las claves no sensibles', async () => {
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: { usuario: { password: 'x', nombre: 'a' } }
    });
    expect(antes).toEqual({ usuario: { nombre: 'a' } });
    expect(antes.usuario.password).toBeUndefined();
  });

  it('quita token dentro de arrays', async () => {
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: [{ token: 'x' }, { ok: 1 }]
    });
    expect(antes).toEqual([{}, { ok: 1 }]);
  });

  it('quita claves camelCase y snake_case: passwordHash, reset_token, resetToken, clave, secret, hash', async () => {
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: { passwordHash: 'a', reset_token: 'b', resetToken: 'c', clave: 'd', secret: 'e', hash: 'f', nombre: 'g' }
    });
    expect(antes).toEqual({ nombre: 'g' });
  });

  it('quita claves ampliadas (x-access-token, password1, passwd, pwd, resettoken, tokens, HTTPToken, jwt, authorization, apikey, api_key, contraseña) sin tocar claves de negocio', async () => {
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: {
        'x-access-token': 'a', x_access_token: 'b', password1: 'c', passwd: 'd', pwd: 'e',
        resettoken: 'f', tokens: 'g', HTTPToken: 'h', jwt: 'i', authorization: 'j',
        apikey: 'k', api_key: 'l', contraseña: 'm',
        producto_id: 1, producto: 'Guantes', cantidad: 2, precio: 100, total: 200, origen: 'COSTO'
      }
    });
    expect(antes).toEqual({ producto_id: 1, producto: 'Guantes', cantidad: 2, precio: 100, total: 200, origen: 'COSTO' });
  });

  it('aplana instancias Sequelize anidadas (valor.get) y limpia dentro', async () => {
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: { usuario: { get: () => ({ password: 'x', nombre: 'a' }) }, otro: 1 }
    });
    expect(antes).toEqual({ usuario: { nombre: 'a' }, otro: 1 });
  });

  it('no rompe con objetos cíclicos: la referencia se marca [Circular]', async () => {
    const ciclo = { nombre: 'x' };
    ciclo.self = ciclo;
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: ciclo
    });
    expect(antes).toEqual({ nombre: 'x', self: '[Circular]' });
  });

  it('conserva Date (no lo convierte en objeto vacío)', async () => {
    const antes = await valoresAntes({
      transaction: tx, usuario: usuario, entidad: 'usuarios', accion: 'EDITAR',
      antes: { fecha: new Date('2026-01-01T00:00:00.000Z') }
    });
    expect(antes.fecha).toBe('2026-01-01T00:00:00.000Z');
  });

  it('conserva las claves legítimas que lee services/bodega/entrega.formatoEntrega', async () => {
    const despues = await valoresDespues({
      transaction: tx, usuario: usuario, entidad: 'solicitudes_bodega', accion: 'ENTREGA',
      despues: {
        estado: 'ENTREGADA', entregada_at: '2026-01-01T10:00:00.000Z', lista_insumo_id: 5, total: 200,
        lineas: [{ producto_id: 1, producto: 'Guantes', cantidad: 2, precio: 100, origen: 'COSTO', total: 200 }]
      }
    });
    expect(despues).toEqual({
      estado: 'ENTREGADA', entregada_at: '2026-01-01T10:00:00.000Z', lista_insumo_id: 5, total: 200,
      lineas: [{ producto_id: 1, producto: 'Guantes', cantidad: 2, precio: 100, origen: 'COSTO', total: 200 }]
    });
  });
});
