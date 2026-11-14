/**
 * RF-WEB-02 — tests unitarios de middleware/rate-limit.js (sin BD, sin express).
 */
const { crearLimitePorIp } = require('../../middleware/rate-limit');

function peticion(ip) {
  return { ip: ip };
}

describe('crearLimitePorIp', () => {
  let ahora;
  beforeEach(() => { ahora = 0; jest.spyOn(Date, 'now').mockImplementation(() => ahora); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('permite hasta max', () => {
    const mw = crearLimitePorIp({ ventanaMs: 1000, max: 2 });
    const res = { set: jest.fn() };
    const next = jest.fn();
    mw(peticion('1.1.1.1'), res, next);
    mw(peticion('1.1.1.1'), res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[0]).toEqual([]);
    expect(next.mock.calls[1]).toEqual([]);
  });

  it('bloquea el siguiente con 429, code RATE_LIMITED y header Retry-After', () => {
    const mw = crearLimitePorIp({ ventanaMs: 1000, max: 2 });
    const res = { set: jest.fn() };
    const next = jest.fn();
    mw(peticion('1.1.1.1'), res, next);
    mw(peticion('1.1.1.1'), res, next);
    mw(peticion('1.1.1.1'), res, next);
    const err = next.mock.calls[2][0];
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.httpStatus).toBe(429);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '1');
  });

  it('vuelve a permitir al vencer la ventana', () => {
    const mw = crearLimitePorIp({ ventanaMs: 1000, max: 2 });
    const res = { set: jest.fn() };
    const next = jest.fn();
    mw(peticion('1.1.1.1'), res, next);
    mw(peticion('1.1.1.1'), res, next);
    mw(peticion('1.1.1.1'), res, next);
    expect(next.mock.calls[2][0].code).toBe('RATE_LIMITED');
    ahora = 1001;
    mw(peticion('1.1.1.1'), res, next);
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.calls[3]).toEqual([]);
  });
});
