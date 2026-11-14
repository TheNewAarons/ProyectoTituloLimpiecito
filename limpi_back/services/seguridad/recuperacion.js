/**
 * RNF-SEC-01 (AUT-001): token del enlace de recuperación de contraseña.
 *
 * - Lleva solo { id, correo, proposito }: nada de hash ni datos de sesión.
 * - Se firma con SECRET_KEY + hash actual del usuario: deja de valer en cuanto la contraseña cambia
 *   (un solo uso) y un token de sesión (firmado solo con SECRET_KEY) no pasa la verificación.
 * - El proposito separa usuarios del sistema y de la app (ids de tablas distintas).
 */
const jwt = require('jsonwebtoken');

const PROPOSITO = { USUARIO: 'RECUPERAR_USUARIO', APP: 'RECUPERAR_APP' };
// Los correos (controlador y views/correo.hbs) prometen 1 hora.
const DURACION = '1h';

const clave = (usuario) => {
  if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY no configurada');
  return process.env.SECRET_KEY + usuario.password;
};

const firmar = (usuario, proposito) =>
  jwt.sign({ id: usuario.id, correo: usuario.correo, proposito }, clave(usuario), {
    algorithm: 'HS256',
    expiresIn: DURACION
  });

// Devuelve la instancia del usuario dueño del token, o null si el token no sirve.
const verificar = async (token, proposito, Modelo) => {
  const datos = typeof token === 'string' ? jwt.decode(token) : null;
  if (!datos || datos.proposito !== proposito || !datos.id) return null;
  const usuario = await Modelo.findOne({ where: { id: datos.id } });
  if (!usuario || !usuario.password || usuario.correo !== datos.correo) return null;
  try {
    jwt.verify(token, clave(usuario), { algorithms: ['HS256'] });
  } catch (e) {
    return null;
  }
  return usuario;
};

module.exports = { PROPOSITO, firmar, verificar };
