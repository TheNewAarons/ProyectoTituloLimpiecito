/**
 * RF-BI-05 — reservas desde la web: validación, cupos (misma regla que la app) y creación en transacción.
 */
jest.mock('../../../database/database', () => ({ sequelize: { query: jest.fn(), transaction: jest.fn() } }));
jest.mock('../../../modelos/sist_app/Reserva', () => ({ max: jest.fn(), create: jest.fn(), count: jest.fn(async () => 0) }));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));
jest.mock('../../../modelos/sist_app/Usuario_app', () => ({ findOne: jest.fn(), create: jest.fn() }));
jest.mock('../../../modelos/sist_app/Extra', () => ({ create: jest.fn() }));
jest.mock('../../../modelos/sist_app/Extra_lavado', () => ({ create: jest.fn() }));
jest.mock('../../../services/correo/transporte', () => ({ crearTransporte: jest.fn(), smtpConfigurado: jest.fn(() => false) }));

const db = require('../../../database/database');
const Reserva = require('../../../modelos/sist_app/Reserva');
const UsuarioApp = require('../../../modelos/sist_app/Usuario_app');
const Extra = require('../../../modelos/sist_app/Extra');
const ExtraLavado = require('../../../modelos/sist_app/Extra_lavado');
const web = require('../../../services/reservas/web');

const HOY = '2026-11-27';
const MARTES = '2026-12-01';
const T = { id: 'tx' };
const BLOQUES = [
  { id: 29, inicio: '09:00', fin: '11:00', dia: 'Martes', horario_id: 2, cant_servicios: 4 },
  { id: 30, inicio: '11:00', fin: '13:00', dia: 'Martes', horario_id: 2, cant_servicios: 4 },
  { id: 5, inicio: '09:00', fin: '11:00', dia: 'Miercoles', horario_id: 2, cant_servicios: 4 }
];

/** Responde según la consulta: servicio, bloques, ocupados y el FOR UPDATE del horario. */
function bd(o) {
  db.sequelize.query.mockImplementation(async (sql) => {
    if (/FROM servicios s JOIN categoria_servicios c ON c.id = s.categoriaServicioId WHERE s.id/.test(sql)) return o.servicio ? [o.servicio] : [];
    if (/FROM horarios h JOIN dias/.test(sql)) return BLOQUES;
    if (/FROM reservas r/.test(sql)) return o.ocupados || [];
    if (/MAX\(orden\) maximo FROM reservas FOR UPDATE/.test(sql)) return [{ maximo: 1122 }];
    if (/FOR UPDATE/.test(sql)) return [{ id: 2 }];
    if (/FROM categoria_servicios c JOIN servicios/.test(sql)) return o.catalogo || [];
    return [];
  });
}

const cuerpo = (extra) => Object.assign({
  servicio_id: 7, fecha: MARTES, bloque_id: 29,
  cliente: { nombre: 'Ana Rojas', correo: 'ana@correo.cl', celular: '+56 9 1234 5678', direccion: 'Calle 1 #23, Arica' }
}, extra);
const SERVICIO_HOGAR = { id: 7, nombre: 'Aseo profundo', precio: 45000, estado: 1, categoria_id: 1, categoria_estado: 1, activar_cantidad: 1, categoria: 'Aseo de hogar' };
const SERVICIO_LAVADO = { id: 8, nombre: 'Lavado completo', precio: 22000, estado: 1, categoria_id: 2, categoria_estado: 1, activar_cantidad: 0, categoria: 'Lavado de vehiculos' };

beforeEach(() => {
  jest.clearAllMocks();
  db.sequelize.transaction.mockImplementation(async (cb) => cb(T));
  Reserva.max.mockResolvedValue(1122);
  Reserva.create.mockImplementation(async (d) => Object.assign({ id: 500 }, d));
  UsuarioApp.findOne.mockResolvedValue(null);
  UsuarioApp.create.mockImplementation(async (d) => Object.assign({ id: 40 }, d));
});

describe('validación', () => {
  it.each([
    ['2026-11-27', /desde mañana/],
    ['2026-11-20', /desde mañana/],
    ['2027-02-01', /hasta 60 días/],
    ['2026-02-30', /YYYY-MM-DD/],
    ['01-12-2026', /YYYY-MM-DD/]
  ])('fecha %s se rechaza', (f, msg) => {
    expect(() => web.normalizar(cuerpo({ fecha: f }), HOY)).toThrow(msg);
  });

  it('exige datos del cliente válidos y una patente con formato si viene vehículo', () => {
    try {
      web.normalizar(cuerpo({ cliente: { nombre: '', correo: 'malo', celular: 'abc', direccion: 'x' }, cantidad: 50, vehiculo: { tipo: 'Auto', marca: 'Kia', modelo: 'Rio', patente: 'AB CD 12!' } }), HOY);
      throw new Error('no lanzó');
    } catch (e) {
      expect(e.code).toBe('CAMPO_INVALIDO');
      expect(Object.keys(e.details).sort()).toEqual(['cantidad', 'celular', 'correo', 'direccion', 'nombre', 'vehiculo.patente']);
    }
  });

  it('nombre y quién recibe solo letras; la dirección acepta números pero exige letras', () => {
    const err = (cliente) => { try { web.normalizar(cuerpo({ cliente: Object.assign({ nombre: 'Ana Rojas', correo: 'ana@correo.cl', celular: '912345678', direccion: 'Calle 1 #23' }, cliente) }), HOY); return null; } catch (e) { return e.details; } };
    expect(err({})).toBeNull();
    expect(err({ nombre: 'José Ñúñez-O\'Ryan' })).toBeNull();
    expect(err({ nombre: 'Ana 123' })).toMatchObject({ nombre: 'solo letras' });
    expect(err({ recibe: '4567' })).toMatchObject({ recibe: 'solo letras' });
    expect(err({ direccion: '12345' })).toMatchObject({ direccion: expect.any(String) });
    expect(err({ direccion: 'Los Rosales #2097' })).toBeNull();
  });

  it('patente chilena: 6 caracteres (BCDF12 o AB1234), con separadores al escribir; se guarda limpia en mayúsculas', () => {
    const veh = (patente) => ({ tipo: 'Auto', marca: 'Kia', modelo: 'Rio', patente: patente });
    expect(web.normalizar(cuerpo({ vehiculo: veh('bc-df·12') }), HOY).vehiculo.patente).toBe('BCDF12');
    expect(web.normalizar(cuerpo({ vehiculo: veh('AB 12 34') }), HOY).vehiculo.patente).toBe('AB1234');
    for (const p of ['ABC123', 'ABCD1', 'ABCDE12', '1234AB', 'AB12345']) {
      expect(() => web.normalizar(cuerpo({ vehiculo: veh(p) }), HOY)).toThrow(expect.objectContaining({ code: 'CAMPO_INVALIDO' }));
    }
  });

  it('diaSemana usa el calendario (sin depender de la zona del servidor)', () => {
    expect(web.diaSemana('2026-12-01')).toBe('martes');
    expect(web.diaSemana('2026-12-02')).toBe('miercoles');
    expect(web.diaSemana('2026-12-06')).toBe('domingo');
  });
});

describe('disponibilidad', () => {
  it('solo los bloques de ese día de la semana, con cupos libres = cupos - (aprobadas + en proceso)', async () => {
    bd({ ocupados: [{ inicio: '09:00', n: 3 }, { inicio: '11:00', n: 6 }] });
    const d = await web.disponibilidad({ categoria_id: '2', fecha: MARTES }, HOY);
    expect(d.dia).toBe('martes');
    expect(d.bloques).toEqual([
      { id: 29, inicio: '09:00', fin: '11:00', cupos: 4, libres: 1 },
      { id: 30, inicio: '11:00', fin: '13:00', cupos: 4, libres: 0 }
    ]);
    const sqlOcupados = db.sequelize.query.mock.calls.find((c) => /FROM reservas r/.test(c[0]));
    expect(sqlOcupados[1].replacements).toMatchObject({ categoria: 2, dia: MARTES, estados: [2, 3] });
  });

  it('categoria_id inválido responde 400 sin consultar', async () => {
    await expect(web.disponibilidad({ categoria_id: 'x', fecha: MARTES }, HOY)).rejects.toMatchObject({ code: 'CAMPO_INVALIDO' });
    expect(db.sequelize.query).not.toHaveBeenCalled();
  });
});

describe('crear', () => {
  it('crea EN PROCESO, simulada y sin pago, con el cliente nuevo y Extra; bloquea el horario antes de contar', async () => {
    bd({ servicio: SERVICIO_HOGAR, ocupados: [{ inicio: '09:00', n: 3 }] });
    const r = await web.crear(cuerpo({ cantidad: 2 }), { hoy: HOY });
    expect(r).toMatchObject({ orden: 1123, servicio: 'Aseo profundo', fecha: MARTES, bloque: '09:00 - 11:00', cantidad: 2, precio_total: 90000, estado: 'EN_PROCESO' });
    expect(Reserva.create.mock.calls[0][0]).toMatchObject({
      estado: 3, metodo_pago: 'SIMULADO', pagado: false, tipo: 1, servicioId: 7, usuarioAppId: 40,
      hora_inicio: '09:00:00', hora_fin: '11:00:00', fecha_reserva: new Date('2026-12-01T09:00:00Z')
    });
    expect(Extra.create).toHaveBeenCalledWith(expect.objectContaining({ reservaId: 500, recibe: 'Ana Rojas' }), { transaction: T });
    const sqls = db.sequelize.query.mock.calls.map((c) => c[0]);
    expect(sqls.findIndex((s) => /FOR UPDATE/.test(s))).toBeLessThan(sqls.findIndex((s) => /FROM reservas r/.test(s)));
  });

  it('sin cupo responde 409 y no crea nada', async () => {
    bd({ servicio: SERVICIO_HOGAR, ocupados: [{ inicio: '09:00', n: 4 }] });
    await expect(web.crear(cuerpo(), { hoy: HOY })).rejects.toMatchObject({ code: 'SIN_CUPO', httpStatus: 409 });
    expect(Reserva.create).not.toHaveBeenCalled();
    expect(UsuarioApp.create).not.toHaveBeenCalled();
  });

  it('un bloque de otro día o inexistente responde 409', async () => {
    bd({ servicio: SERVICIO_HOGAR });
    await expect(web.crear(cuerpo({ bloque_id: 5 }), { hoy: HOY })).rejects.toMatchObject({ code: 'BLOQUE_NO_DISPONIBLE' });
    await expect(web.crear(cuerpo({ bloque_id: 999 }), { hoy: HOY })).rejects.toMatchObject({ code: 'BLOQUE_NO_DISPONIBLE' });
  });

  it('servicio inactivo o inexistente responde 409', async () => {
    bd({ servicio: Object.assign({}, SERVICIO_HOGAR, { estado: 0 }) });
    await expect(web.crear(cuerpo(), { hoy: HOY })).rejects.toMatchObject({ code: 'SERVICIO_NO_DISPONIBLE' });
    bd({ servicio: null });
    await expect(web.crear(cuerpo(), { hoy: HOY })).rejects.toMatchObject({ code: 'SERVICIO_NO_DISPONIBLE' });
  });

  it('lavado: exige vehículo, guarda ExtraLavado con tipo 2 y reutiliza el cliente existente; cantidad vuelve a 1', async () => {
    bd({ servicio: SERVICIO_LAVADO });
    await expect(web.crear(cuerpo({ servicio_id: 8 }), { hoy: HOY })).rejects.toMatchObject({ code: 'CAMPO_INVALIDO', details: { vehiculo: expect.any(String) } });

    UsuarioApp.findOne.mockResolvedValue({ id: 3, correo: 'ana@correo.cl' });
    const r = await web.crear(cuerpo({ servicio_id: 8, cantidad: 3, vehiculo: { tipo: 'Auto', marca: 'Kia', modelo: 'Rio', patente: 'ABCD12' } }), { hoy: HOY });
    expect(r.cantidad).toBe(1);
    expect(UsuarioApp.create).not.toHaveBeenCalled();
    expect(Reserva.create.mock.calls[0][0]).toMatchObject({ tipo: 2, usuarioAppId: 3, precio_total: 22000 });
    expect(ExtraLavado.create).toHaveBeenCalledWith(expect.objectContaining({ patente: 'ABCD12', reservaId: 500 }), { transaction: T });
  });

  it('si el correo falla la reserva igual queda creada; los correos escapan el HTML', async () => {
    bd({ servicio: SERVICIO_HOGAR });
    const enviados = [];
    const transporte = { sendMail: jest.fn(async (c) => { enviados.push(c); if (enviados.length === 1) throw new Error('smtp caído'); }) };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const r = await web.crear(cuerpo({ cliente: { nombre: 'Ana', correo: 'ana@correo.cl', celular: '912345678', direccion: '<img src=x onerror=alert(1)> Calle 1' } }), { hoy: HOY, transporte: transporte });
    console.error.mockRestore();
    expect(r.orden).toBe(1123);
    expect(transporte.sendMail).toHaveBeenCalledTimes(2);
    expect(enviados[0].html).not.toContain('<img src=x');
    expect(enviados[0].html).toContain('&lt;img src&#x3D;x');
    expect(enviados[1].html).toContain('martes 1 de diciembre de 2026');
  });
});

it('catálogo agrupa por categoría y marca cantidad y vehículo', async () => {
  bd({ catalogo: [
    { categoria_id: 1, categoria: 'Aseo de hogar', activar_cantidad: 1, id: 7, nombre: 'Aseo profundo', descripcion: 'd', precio: 45000 },
    { categoria_id: 2, categoria: 'Lavado de vehiculos', activar_cantidad: 0, id: 8, nombre: 'Lavado completo', descripcion: 'd', precio: null }
  ] });
  const c = await web.catalogo();
  expect(c).toEqual([
    { id: 1, nombre: 'Aseo de hogar', pide_cantidad: true, pide_vehiculo: false, servicios: [{ id: 7, nombre: 'Aseo profundo', descripcion: 'd', precio: 45000 }] },
    { id: 2, nombre: 'Lavado de vehiculos', pide_cantidad: false, pide_vehiculo: true, servicios: [{ id: 8, nombre: 'Lavado completo', descripcion: 'd', precio: null }] }
  ]);
});

describe('revisión: abuso, auditoría y numeración', () => {
  const { auditar } = require('../../../services/auditoria');

  it('un correo con 3 reservas en proceso no puede crear otra (429) y no se crea nada', async () => {
    bd({ servicio: SERVICIO_HOGAR });
    UsuarioApp.findOne.mockResolvedValue({ id: 3, correo: 'ana@correo.cl' });
    Reserva.count.mockResolvedValueOnce(3);
    await expect(web.crear(cuerpo(), { hoy: HOY })).rejects.toMatchObject({ code: 'DEMASIADAS_PENDIENTES', httpStatus: 429 });
    expect(Reserva.create).not.toHaveBeenCalled();
    expect(Reserva.count).toHaveBeenCalledWith({ where: { usuarioAppId: 3, estado: 3 }, transaction: T });
  });

  it('el cliente nuevo queda auditado (CREAR usuario_apps, contexto sistema, IP) dentro de la transacción', async () => {
    bd({ servicio: SERVICIO_HOGAR });
    await web.crear(cuerpo(), { hoy: HOY, ip: '9.9.9.9' });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({
      transaction: T, entidad: 'usuario_apps', entidad_id: 40, accion: 'CREAR', usuario: { id: null, contexto: 'sistema' }, ip: '9.9.9.9'
    }));
  });

  it('la orden sale de una lectura bloqueante del máximo (no de Reserva.max sin bloqueo)', async () => {
    bd({ servicio: SERVICIO_HOGAR });
    await web.crear(cuerpo(), { hoy: HOY });
    expect(db.sequelize.query.mock.calls.some((c) => /SELECT MAX\(orden\) maximo FROM reservas FOR UPDATE/.test(c[0]) && c[1].transaction === T)).toBe(true);
    expect(Reserva.create.mock.calls[0][0].orden).toBe(1123);
    expect(Reserva.max).not.toHaveBeenCalled();
  });
});
