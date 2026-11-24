/**
 * AUT-017 (obs. 13 de las pruebas web) — fechas realistas al crear un cronograma (POST /cronograma/crear-cronograma).
 * mes base 0 (Enero = 0) como lo guarda la pantalla; año actual o siguiente; fechas dentro del mes; término >= inicio.
 */
jest.mock('../../api/apartado_cronograma/cronograma/logica', () => ({
  crearCronogramaDB: jest.fn(async (c) => Object.assign({ id: 500 }, c)),
  crearLineaCronogramaDB: jest.fn(async () => ({}))
}));

const express = require('express');
const request = require('supertest');
const logica = require('../../api/apartado_cronograma/cronograma/logica');
const controlador = require('../../api/apartado_cronograma/cronograma/controlador');
const fechaLib = require('../../libs/fecha');

const ANIO = Number(fechaLib.hoySantiago().slice(0, 4));
// Noviembre (mes 10 base 0) del año actual.
const valido = () => ({ mes: 10, anio: ANIO, fecha_inicio: ANIO + '-11-01', fecha_termino: ANIO + '-11-30', clienteId: 8, turnoId: 8, estado: 1 });

function app() {
  const a = express();
  a.use(express.json());
  a.post('/cronograma/crear-cronograma', controlador.crearCronograma);
  return a;
}
const crear = (cronograma, lineas) => request(app()).post('/cronograma/crear-cronograma').send({ cronograma: cronograma, lineas_cronograma: lineas === undefined ? [] : lineas });

beforeEach(() => jest.clearAllMocks());

describe('validarFechasCronograma', () => {
  it('acepta el mes completo y un rango dentro del mes', () => {
    expect(controlador.validarFechasCronograma(valido())).toBeNull();
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { fecha_inicio: ANIO + '-11-10', fecha_termino: ANIO + '-11-10' }))).toBeNull();
  });

  it('rechaza término anterior al inicio', () => {
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { fecha_inicio: ANIO + '-11-20', fecha_termino: ANIO + '-11-10' })))
      .toMatch(/término no puede ser anterior/);
  });

  it('rechaza fechas fuera del mes elegido (incluido el año 2150)', () => {
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { fecha_termino: ANIO + '-12-01' }))).toMatch(/dentro del mes/);
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { fecha_inicio: '2150-04-20', fecha_termino: '2150-04-30' }))).toMatch(/dentro del mes/);
  });

  it('solo año actual o siguiente', () => {
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { anio: 2150, fecha_inicio: '2150-11-01', fecha_termino: '2150-11-30' }))).toMatch(/El año debe ser/);
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { anio: ANIO - 1 }))).toMatch(/El año debe ser/);
    const sig = ANIO + 1;
    expect(controlador.validarFechasCronograma({ mes: 0, anio: sig, fecha_inicio: sig + '-01-01', fecha_termino: sig + '-01-31' })).toBeNull();
  });

  it('mes base 0: febrero según el año (bisiesto o no) y diciembre', () => {
    // Año relativo (actual o siguiente): el test no depende de la fecha en que se ejecute.
    [ANIO, ANIO + 1].forEach((a) => {
      const bisiesto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
      const ultimo = bisiesto ? 29 : 28;
      expect(controlador.validarFechasCronograma({ mes: 1, anio: a, fecha_inicio: a + '-02-01', fecha_termino: a + '-02-' + ultimo })).toBeNull();
      if (!bisiesto) {
        expect(controlador.validarFechasCronograma({ mes: 1, anio: a, fecha_inicio: a + '-02-01', fecha_termino: a + '-02-29' })).toMatch(/fecha de inicio y de término|dentro del mes/);
      }
    });
    expect(controlador.validarFechasCronograma({ mes: 11, anio: ANIO, fecha_inicio: ANIO + '-12-01', fecha_termino: ANIO + '-12-31' })).toBeNull();
    expect(controlador.validarFechasCronograma({ mes: 12, anio: ANIO, fecha_inicio: ANIO + '-12-01', fecha_termino: ANIO + '-12-31' })).toMatch(/mes no es válido/);
  });

  it('fechas faltantes o con formato inválido', () => {
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { fecha_inicio: null }))).toMatch(/Indica la fecha/);
    expect(controlador.validarFechasCronograma(Object.assign(valido(), { fecha_termino: '30/11/2026' }))).toMatch(/Indica la fecha/);
    expect(controlador.validarFechasCronograma(null)).toMatch(/Faltan los datos/);
    // mes ausente no se toma como Enero (Number(null) === 0)
    [null, undefined, ''].forEach((m) => {
      expect(controlador.validarFechasCronograma({ mes: m, anio: ANIO, fecha_inicio: ANIO + '-01-01', fecha_termino: ANIO + '-01-31' })).toMatch(/mes no es válido/);
    });
  });
});

describe('POST /cronograma/crear-cronograma', () => {
  it('fechas inválidas: 400 con mensaje y no crea nada', async () => {
    const r = await crear(Object.assign(valido(), { fecha_inicio: ANIO + '-11-20', fecha_termino: ANIO + '-11-10' }));
    expect(r.status).toBe(400);
    expect(r.body.mensaje).toMatch(/término no puede ser anterior/);
    expect(logica.crearCronogramaDB).not.toHaveBeenCalled();
  });

  it('fechas válidas: crea el cronograma y sus líneas como antes', async () => {
    const r = await crear(valido(), [{ tareaId: 1 }, { tareaId: 2 }]);
    expect(r.status).toBe(200);
    expect(r.body.cronograma).toMatchObject({ id: 500, mes: 10, anio: ANIO });
    expect(logica.crearLineaCronogramaDB).toHaveBeenCalledTimes(2);
  });

  it('sin líneas (no es arreglo): 400 en vez de un error de servidor', async () => {
    const r = await crear(valido(), null);
    expect(r.status).toBe(400);
    expect(logica.crearCronogramaDB).not.toHaveBeenCalled();
  });
});
