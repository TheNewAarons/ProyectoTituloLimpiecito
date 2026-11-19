/**
 * RNF-SEC-01 (AUT-005 parte 2): Webpay Plus configurado solo desde el entorno.
 * - TRANSBANK_ENV=production: exige TRANSBANK_COMMERCE_CODE y TRANSBANK_API_KEY.
 * - TRANSBANK_ENV=integration: credenciales públicas de prueba que trae el SDK (nunca cobran).
 * - Sin TRANSBANK_ENV (o con otro valor) el backend no arranca: producción no puede quedar en modo prueba sin aviso.
 */
const { WebpayPlus } = require('transbank-sdk');

function configurarWebpay() {
  const ambiente = process.env.TRANSBANK_ENV;
  if (ambiente === 'production') {
    const { TRANSBANK_COMMERCE_CODE: codigo, TRANSBANK_API_KEY: llave } = process.env;
    if (!codigo || !llave) {
      throw new Error('TRANSBANK_ENV=production exige TRANSBANK_COMMERCE_CODE y TRANSBANK_API_KEY. El servidor no arranca sin ellas.');
    }
    WebpayPlus.configureForProduction(codigo, llave);
    return 'production';
  }
  if (ambiente === 'integration') {
    WebpayPlus.configureWebpayPlusForTesting();
    return 'integration';
  }
  throw new Error('Falta TRANSBANK_ENV (integration o production). El servidor no arranca sin ella.');
}

module.exports = { configurarWebpay };
