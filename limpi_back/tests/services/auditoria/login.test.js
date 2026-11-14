/**
 * Tests unitarios de services/auditoria/login.js (db y auditar mockeados, sin BD).
 * RNF-SEC-02 S4: registrarLogin es fail-open y nunca guarda password/hash/token.
 */
jest.mock('../../../database/database', () => ({
  sequelize: { transaction: jest.fn() }
}));
jest.mock('../../../services/auditoria', () => ({
  auditar: jest.fn()
}));

const db = require('../../../database/database');
const { auditar } = require('../../../services/auditoria');
const { registrarLogin } = require('../../../services/auditoria/login');

function fakeTransaction() {
  const t = { id: 'tx-login-1' };
  db.sequelize.transaction.mockImplementation((callback) => Promise.resolve().then(() => callback(t)));
  return t;
}

describe('services/auditoria registrarLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeTransaction();
    auditar.mockResolvedValue({ id: 1 });
  });

  it('login fallido audita LOGIN_FALLIDO con correo y motivo, sin password/hash/token', async () => {
    await registrarLogin({
      contexto: 'usuarios',
      entidad: 'usuarios',
      usuarioId: 7,
      correo: 'a@b.cl',
      ok: false,
      motivo: 'PASSWORD_INCORRECTA',
      ip: '127.0.0.1'
    });

    expect(auditar).toHaveBeenCalledTimes(1);
    const [params] = auditar.mock.calls[0];
    expect(params.accion).toBe('LOGIN_FALLIDO');
    expect(params.motivo).toBe('PASSWORD_INCORRECTA');
    expect(params.entidad).toBe('usuarios');
    expect(params.entidad_id).toBe(7);
    expect(params.usuario).toEqual({ id: 7, contexto: 'usuarios' });
    expect(params.ip).toBe('127.0.0.1');
    expect(params.despues).toEqual({ correo: 'a@b.cl' });
    expect(JSON.stringify(params.despues)).not.toMatch(/password|hash|token|pass/i);
  });

  it('login OK audita LOGIN_OK', async () => {
    await registrarLogin({
      contexto: 'acceso_clientes',
      entidad: 'acceso_clientes',
      usuarioId: 3,
      correo: 'c@d.cl',
      ok: true
    });

    const [params] = auditar.mock.calls[0];
    expect(params.accion).toBe('LOGIN_OK');
    expect(params.motivo).toBeNull();
    expect(params.despues).toEqual({ correo: 'c@d.cl' });
  });

  it('usuario inexistente audita usuarioId/entidad_id null', async () => {
    await registrarLogin({
      contexto: 'usuario_apps',
      entidad: 'usuario_apps',
      usuarioId: null,
      correo: 'nadie@x.cl',
      ok: false,
      motivo: 'USUARIO_NO_EXISTE'
    });

    const [params] = auditar.mock.calls[0];
    expect(params.usuario).toEqual({ id: null, contexto: 'usuario_apps' });
    expect(params.entidad_id).toBeNull();
  });

  it('USUARIO_NO_EXISTE con correo que no parece email guarda [no-correo]', async () => {
    await registrarLogin({
      contexto: 'usuarios',
      entidad: 'usuarios',
      usuarioId: null,
      correo: 'mi-super-password',
      ok: false,
      motivo: 'USUARIO_NO_EXISTE'
    });

    const [params] = auditar.mock.calls[0];
    expect(params.despues).toEqual({ correo: '[no-correo]' });
    expect(JSON.stringify(params)).not.toMatch(/mi-super-password/);
  });

  it('motivos distintos a USUARIO_NO_EXISTE conservan el correo tal cual', async () => {
    await registrarLogin({
      contexto: 'usuarios',
      entidad: 'usuarios',
      usuarioId: 7,
      correo: 'a@b.cl',
      ok: false,
      motivo: 'PASSWORD_INCORRECTA'
    });

    const [params] = auditar.mock.calls[0];
    expect(params.despues).toEqual({ correo: 'a@b.cl' });
  });

  it('fail-open: si auditar lanza, resuelve igual y loguea sin correo', async () => {
    auditar.mockRejectedValue(new Error('fallo auditoria'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      registrarLogin({
        contexto: 'usuario_apps',
        entidad: 'usuario_apps',
        usuarioId: null,
        correo: 'secreto@x.cl',
        ok: false,
        motivo: 'USUARIO_NO_EXISTE'
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [mensaje, detalle] = errorSpy.mock.calls[0];
    expect(mensaje).toContain('no se pudo auditar login');
    expect(detalle.auditoriaError).toEqual({ name: 'Error', code: undefined });
    expect(JSON.stringify(errorSpy.mock.calls[0])).not.toMatch(/fallo auditoria|secreto@x\.cl/);
    errorSpy.mockRestore();
  });
});
