/**
 * Retroalimentación de la revisión (AUT-023): formato de RUT, teléfono y persona de contacto del proveedor.
 * Los tres son opcionales (null/undefined = sin valor); si vienen, deben ser válidos. Misma regla que la pantalla.
 */
const AppError = require('../../libs/app-error');

/** RUT chileno con dígito verificador (módulo 11). Acepta 12.345.678-9, 12345678-9 o 123456789; K mayúscula o minúscula. */
function rutValido(rut) {
  const limpio = String(rut).replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === limpio.slice(-1);
}

/** Solo dígitos, con + inicial y espacios opcionales; entre 8 y 15 dígitos (ej. +56 9 1234 5678). */
function telefonoValido(telefono) {
  const t = String(telefono);
  if (!/^\+?[\d ]+$/.test(t)) return false;
  const digitos = t.replace(/\D/g, '').length;
  return digitos >= 8 && digitos <= 15;
}

/** Nombre de la persona de contacto: letras (con tildes), espacios y . ' - ; al menos 2 letras. */
function contactoValido(contacto) {
  const c = String(contacto);
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]+$/.test(c) && (c.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length >= 2;
}

/**
 * Lanza 400 si alguno de los valores (ya normalizados con normalizarOpcional) no tiene formato válido.
 * @param {{rut?: string|null, telefono?: string|null, contacto?: string|null}} v
 */
function validarFormatos(v) {
  const hay = (x) => x !== undefined && x !== null;
  if (hay(v.rut) && !rutValido(v.rut)) {
    throw new AppError('RUT_INVALIDO', 'El RUT no es válido (revise el dígito verificador)', 400, { campo: 'rut' });
  }
  if (hay(v.telefono) && !telefonoValido(v.telefono)) {
    throw new AppError('TELEFONO_INVALIDO', 'El teléfono debe tener solo números (8 a 15 dígitos, con + y espacios opcionales)', 400, { campo: 'telefono' });
  }
  if (hay(v.contacto) && !contactoValido(v.contacto)) {
    throw new AppError('CONTACTO_INVALIDO', 'La persona de contacto debe ser un nombre (solo letras y espacios)', 400, { campo: 'contacto' });
  }
}

module.exports = { rutValido, telefonoValido, contactoValido, validarFormatos };
