/**
 * Retroalimentación — "Desde" de la asignación masiva PEV anclado a un cronograma vigente.
 */
jest.mock('../../../services/pev/cronograma-asignacion', () => ({ cronogramasDestino: jest.fn() }));
jest.mock('../../../libs/fecha', () => ({ hoySantiago: () => '2026-11-27' }));

const { cronogramasDestino } = require('../../../services/pev/cronograma-asignacion');
const regla = require('../../../services/pev/asignacion-cronograma-regla');

const NOV = { id: 7, inicio: '2026-11-01', fin: '2026-11-30' };
const DIC = { id: 8, inicio: '2026-12-01', fin: '2026-12-31' };

beforeEach(() => jest.clearAllMocks());

it('vigentes consulta desde hoy con ids enteros y rechaza ids inválidos sin consultar', async () => {
  cronogramasDestino.mockResolvedValue([NOV]);
  await expect(regla.vigentes('3', '2')).resolves.toEqual([NOV]);
  expect(cronogramasDestino).toHaveBeenCalledWith(3, 2, '2026-11-27', null);
  for (const [c, t] of [[undefined, 1], [1, 'x'], ['0', 1], [1, '-2']]) {
    await expect(regla.vigentes(c, t)).rejects.toMatchObject({ code: 'CAMPO_INVALIDO', httpStatus: 400 });
  }
  expect(cronogramasDestino).toHaveBeenCalledTimes(1);
});

it('validarDesde acepta una fecha dentro de un cronograma (incluidos los bordes) y devuelve ese cronograma', async () => {
  cronogramasDestino.mockResolvedValue([NOV, DIC]);
  await expect(regla.validarDesde(3, 2, '2026-11-30')).resolves.toEqual(NOV);
  await expect(regla.validarDesde(3, 2, '2026-12-01')).resolves.toEqual(DIC);
});

it('validarDesde rechaza fechas absurdas o fuera de rango, y explica si no hay cronogramas', async () => {
  cronogramasDestino.mockResolvedValue([NOV]);
  await expect(regla.validarDesde(3, 2, '2050-03-10')).rejects.toMatchObject({ code: 'FECHA_FUERA_DE_CRONOGRAMA', httpStatus: 400 });
  cronogramasDestino.mockResolvedValue([]);
  await expect(regla.validarDesde(3, 2, '2026-11-27')).rejects.toMatchObject({
    code: 'FECHA_FUERA_DE_CRONOGRAMA', message: expect.stringMatching(/no tiene cronogramas vigentes/)
  });
});
