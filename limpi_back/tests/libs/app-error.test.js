/**
 * Tests unitarios de libs/app-error.js (sin BD).
 */
const AppError = require('../../libs/app-error');

describe('libs/app-error AppError', () => {
  it('expone code, message, httpStatus y details', () => {
    const err = new AppError('CAJA_NO_EXISTE', 'no existe la caja', 404, { periodo: '2026-10' });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('CAJA_NO_EXISTE');
    expect(err.message).toBe('no existe la caja');
    expect(err.httpStatus).toBe(404);
    expect(err.details).toEqual({ periodo: '2026-10' });
  });

  it('usa httpStatus 500 y details {} por defecto', () => {
    const err = new AppError('ALGO', 'mensaje');
    expect(err.httpStatus).toBe(500);
    expect(err.details).toEqual({});
  });
});
