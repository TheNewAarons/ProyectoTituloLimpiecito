/**
 * RF-BI-05 — aprobar / rechazar / finalizar reservas: transiciones válidas, motivo, auditoría y correo al cliente.
 */
jest.mock('../../../database/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn() }));
jest.mock('../../../modelos/sist_app/Reserva', () => ({ findById: jest.fn() }));
jest.mock('../../../modelos/sist_app/Usuario_app', () => ({ findById: jest.fn() }));
jest.mock('../../../modelos/sist_app/Servicio', () => ({ findById: jest.fn() }));
jest.mock('../../../services/reservas/correo-aprobada', () => ({
  armarCorreoAprobada: jest.fn(async () => ({ subject: 'aprobada' })),
  armarCorreoRechazada: jest.fn(async () => ({ subject: 'rechazada' })),
  armarCorreoFinalizada: jest.fn(async () => ({ subject: 'finalizada' }))
}));
jest.mock('../../../services/correo/transporte', () => ({ crearTransporte: jest.fn(), smtpConfigurado: jest.fn(() => false) }));

const db = require('../../../database/database');
const { auditar } = require('../../../services/auditoria');
const Reserva = require('../../../modelos/sist_app/Reserva');
const UsuarioApp = require('../../../modelos/sist_app/Usuario_app');
const Servicio = require('../../../modelos/sist_app/Servicio');
const correos = require('../../../services/reservas/correo-aprobada');
const { cambiarEstado } = require('../../../services/reservas/gestion');

const T = { LOCK: { UPDATE: 'U' } };
const ctx = (extra) => Object.assign({ usuario: { id: 2, contexto: 'usuarios' }, ip: '1.1.1.1', transporte: { sendMail: jest.fn(async () => ({})) } }, extra);
function reserva(estado) {
  const r = { id: 5, orden: 1124, estado: estado, usuarioAppId: 3, servicioId: 7 };
  r.get = () => Object.assign({}, r);
  r.update = jest.fn(async (c) => Object.assign(r, c));
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  db.sequelize.transaction.mockImplementation(async (cb) => cb(T));
  auditar.mockResolvedValue({});
  UsuarioApp.findById.mockResolvedValue({ nombre: 'Ana', correo: 'ana@correo.cl' });
  Servicio.findById.mockResolvedValue({ nombre: 'Lavado completo' });
});

it('aprobar: EN PROCESO -> APROBADA con bloqueo, auditoría APROBAR y correo de confirmación', async () => {
  const r = reserva(3);
  Reserva.findById.mockResolvedValue(r);
  const c = ctx();
  const res = await cambiarEstado('aprobar', '5', c);
  expect(Reserva.findById).toHaveBeenCalledWith(5, { transaction: T, lock: 'U' });
  expect(r.update).toHaveBeenCalledWith({ estado: 2 }, { transaction: T });
  expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'reservas', entidad_id: 5, accion: 'APROBAR', transaction: T, usuario: { id: 2, contexto: 'usuarios' } }));
  expect(correos.armarCorreoAprobada).toHaveBeenCalled();
  expect(c.transporte.sendMail).toHaveBeenCalledWith({ subject: 'aprobada' });
  expect(res).toEqual({ id: 5, orden: 1124, estado: 2, estado_texto: 'Aprobada', correo_enviado: true });
});

it('rechazar exige motivo de 5 a 300 caracteres y lo deja en la auditoría y en el correo', async () => {
  await expect(cambiarEstado('rechazar', 5, ctx({ motivo: 'no' }))).rejects.toMatchObject({ code: 'MOTIVO_REQUERIDO', httpStatus: 400 });
  expect(Reserva.findById).not.toHaveBeenCalled();
  const r = reserva(2);
  Reserva.findById.mockResolvedValue(r);
  await cambiarEstado('rechazar', 5, ctx({ motivo: '  Sin equipo disponible ese día  ' }));
  expect(r.update).toHaveBeenCalledWith({ estado: 4 }, { transaction: T });
  expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ accion: 'RECHAZAR', motivo: 'Sin equipo disponible ese día' }));
  expect(correos.armarCorreoRechazada).toHaveBeenCalledWith(expect.objectContaining({ motivo: 'Sin equipo disponible ese día' }));
});

it('finalizar: solo desde APROBADA, marca pagado y envía el correo de servicio realizado', async () => {
  const r = reserva(2);
  Reserva.findById.mockResolvedValue(r);
  await cambiarEstado('finalizar', 5, ctx());
  expect(r.update).toHaveBeenCalledWith({ estado: 1, pagado: true }, { transaction: T });
  expect(correos.armarCorreoFinalizada).toHaveBeenCalled();
});

it.each([
  ['aprobar', 2], ['aprobar', 4], ['aprobar', 1], ['finalizar', 3], ['finalizar', 4], ['rechazar', 1], ['rechazar', 4]
])('%s desde estado %i responde 409 sin cambiar ni auditar ni enviar', async (accion, estado) => {
  const r = reserva(estado);
  Reserva.findById.mockResolvedValue(r);
  const c = ctx({ motivo: 'motivo suficiente' });
  await expect(cambiarEstado(accion, 5, c)).rejects.toMatchObject({ code: 'ESTADO_INVALIDO', httpStatus: 409 });
  expect(r.update).not.toHaveBeenCalled();
  expect(auditar).not.toHaveBeenCalled();
  expect(c.transporte.sendMail).not.toHaveBeenCalled();
});

it('reserva inexistente 404; id o acción inválidos 400', async () => {
  Reserva.findById.mockResolvedValue(null);
  await expect(cambiarEstado('aprobar', 9, ctx())).rejects.toMatchObject({ code: 'RESERVA_NO_EXISTE', httpStatus: 404 });
  await expect(cambiarEstado('aprobar', 'x', ctx())).rejects.toMatchObject({ code: 'ID_INVALIDO' });
  await expect(cambiarEstado('borrar', 5, ctx())).rejects.toMatchObject({ code: 'ACCION_INVALIDA' });
});

it('si el correo falla el cambio queda hecho y se informa correo_enviado=false', async () => {
  Reserva.findById.mockResolvedValue(reserva(3));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await cambiarEstado('aprobar', 5, ctx({ transporte: { sendMail: jest.fn(async () => { throw new Error('smtp'); }) } }));
  console.error.mockRestore();
  expect(res).toMatchObject({ estado: 2, correo_enviado: false });
});
