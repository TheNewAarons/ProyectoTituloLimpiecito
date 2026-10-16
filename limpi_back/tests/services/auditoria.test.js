/**
 * Tests unitarios de services/auditoria/index.js (modelo Sequelize mockeado, sin BD).
 * TASK_PLAN §3: auditar() exige transaction y limpia claves sensibles.
 */
jest.mock('../../modelos/sistema_base/Auditoria', () => ({
  create: jest.fn()
}));

const Auditoria = require('../../modelos/sistema_base/Auditoria');
const { auditar } = require('../../services/auditoria');

describe('services/auditoria auditar()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auditoria.create.mockResolvedValue({ id: 1 });
  });

  const transaction = { id: 'tx-1' };
  const usuarioValido = { id: 5, contexto: 'usuarios' };

  it('lanza AUDITORIA_SIN_TRANSACCION si no recibe transaction', async () => {
    await expect(
      auditar({ usuario: usuarioValido, entidad: 'cajas', accion: 'CIERRE' })
    ).rejects.toMatchObject({ code: 'AUDITORIA_SIN_TRANSACCION', httpStatus: 500 });
    expect(Auditoria.create).not.toHaveBeenCalled();
  });

  it('lanza AUDITORIA_ENTIDAD_REQUERIDA si falta entidad', async () => {
    await expect(
      auditar({ transaction, usuario: usuarioValido, accion: 'CIERRE' })
    ).rejects.toMatchObject({ code: 'AUDITORIA_ENTIDAD_REQUERIDA' });
  });

  it('lanza AUDITORIA_ACCION_REQUERIDA si falta accion', async () => {
    await expect(
      auditar({ transaction, usuario: usuarioValido, entidad: 'cajas' })
    ).rejects.toMatchObject({ code: 'AUDITORIA_ACCION_REQUERIDA' });
  });

  it('lanza AUDITORIA_CONTEXTO_INVALIDO si el contexto no está en la lista', async () => {
    await expect(
      auditar({ transaction, usuario: { id: 1, contexto: 'inventado' }, entidad: 'cajas', accion: 'CIERRE' })
    ).rejects.toMatchObject({ code: 'AUDITORIA_CONTEXTO_INVALIDO' });
  });

  it('crea la fila dentro de la transaccion con valores_antes/despues como JSON string', async () => {
    await auditar({
      transaction,
      usuario: usuarioValido,
      entidad: 'cajas',
      entidad_id: 7,
      accion: 'CIERRE',
      antes: { estado: 1, saldo_final: null },
      despues: { estado: 0, saldo_final: 1000 },
      motivo: 'cierre mensual',
      ip: '127.0.0.1'
    });

    expect(Auditoria.create).toHaveBeenCalledTimes(1);
    const [datos, opciones] = Auditoria.create.mock.calls[0];
    expect(opciones).toEqual({ transaction });
    expect(datos.usuario_id).toBe(5);
    expect(datos.contexto_usuario).toBe('usuarios');
    expect(datos.entidad).toBe('cajas');
    expect(datos.entidad_id).toBe('7');
    expect(datos.accion).toBe('CIERRE');
    expect(datos.motivo).toBe('cierre mensual');
    expect(datos.ip).toBe('127.0.0.1');
    expect(JSON.parse(datos.valores_antes)).toEqual({ estado: 1, saldo_final: null });
    expect(JSON.parse(datos.valores_despues)).toEqual({ estado: 0, saldo_final: 1000 });
  });

  it('limpia claves sensibles (password, token, pass) de antes/despues', async () => {
    await auditar({
      transaction,
      usuario: usuarioValido,
      entidad: 'usuarios',
      entidad_id: 1,
      accion: 'EDITAR',
      antes: { id: 1, password: 'secreto', token: 'abc', nombre: 'Juan' },
      despues: { id: 1, pass: 'otro-secreto', nombre: 'Juan Actualizado' }
    });

    const [datos] = Auditoria.create.mock.calls[0];
    const antesPlano = JSON.parse(datos.valores_antes);
    const despuesPlano = JSON.parse(datos.valores_despues);
    expect(antesPlano).toEqual({ id: 1, nombre: 'Juan' });
    expect(antesPlano.password).toBeUndefined();
    expect(antesPlano.token).toBeUndefined();
    expect(despuesPlano).toEqual({ id: 1, nombre: 'Juan Actualizado' });
    expect(despuesPlano.pass).toBeUndefined();
  });

  it('acepta instancias Sequelize-like con .get({ plain: true })', async () => {
    const instanciaAntes = { get: jest.fn(() => ({ id: 2, password: 'x', saldo: 10 })) };
    const instanciaDespues = { get: jest.fn(() => ({ id: 2, saldo: 20 })) };

    await auditar({
      transaction,
      usuario: usuarioValido,
      entidad: 'cajas',
      entidad_id: 2,
      accion: 'RECALCULO',
      antes: instanciaAntes,
      despues: instanciaDespues
    });

    expect(instanciaAntes.get).toHaveBeenCalledWith({ plain: true });
    const [datos] = Auditoria.create.mock.calls[0];
    expect(JSON.parse(datos.valores_antes)).toEqual({ id: 2, saldo: 10 });
  });

  it('usuario_id null (sistema/cron) y entidad_id/antes/despues null se guardan como null', async () => {
    await auditar({
      transaction,
      usuario: { id: null, contexto: 'sistema' },
      entidad: 'cajas',
      accion: 'CIERRE'
    });
    const [datos] = Auditoria.create.mock.calls[0];
    expect(datos.usuario_id).toBeNull();
    expect(datos.entidad_id).toBeNull();
    expect(datos.valores_antes).toBeNull();
    expect(datos.valores_despues).toBeNull();
  });
});
