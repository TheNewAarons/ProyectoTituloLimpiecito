/**
 * RNF-SEC-01 (AUT-005): la clave de los JWT y la duración de las sesiones salen solo del entorno.
 * - SECRET_KEY: obligatoria; index.js llama a exigirSecreto() al arrancar y el servidor no levanta sin ella.
 * - JWT_EXPIRES_IN: duración de las sesiones (spec: 8 h) para usuarios, trabajadores, clientes y app.
 * La firma sigue leyendo process.env.SECRET_KEY en cada llamada, igual que los middlewares de verificación.
 */
const expiraEn = process.env.JWT_EXPIRES_IN || '8h';

// Solo bajo Jest (no carga .env): los tests existentes firmaban con los literales que AUT-005 quitó.
// JEST_WORKER_ID no existe fuera de Jest, así que en el servidor exigirSecreto() sigue deteniendo el arranque.
if (process.env.JEST_WORKER_ID && !process.env.SECRET_KEY) process.env.SECRET_KEY = 'clave-solo-para-jest';

const exigirSecreto = () => {
  if (!process.env.SECRET_KEY) {
    throw new Error('Falta la variable de entorno SECRET_KEY (clave de los JWT). El servidor no arranca sin ella.');
  }
};

module.exports = { expiraEn, exigirSecreto };
