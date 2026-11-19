/**
 * RNF-SEC-01 (AUT-005 parte 2): correo y Webpay solo desde el entorno; ninguna credencial escrita en el código.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const ENV = Object.assign({}, process.env);
afterEach(() => { process.env = Object.assign({}, ENV); jest.resetModules(); jest.dontMock('nodemailer'); jest.dontMock('transbank-sdk'); });

describe('services/correo/transporte', () => {
  const conNodemailer = () => {
    const createTransport = jest.fn(() => ({ sendMail: jest.fn() }));
    jest.doMock('nodemailer', () => ({ createTransport }));
    return { createTransport, transporte: require('../../services/correo/transporte') };
  };

  it('arma el transporte con SMTP_* (puerto 465 y TLS directo por defecto, como antes)', () => {
    Object.assign(process.env, { SMTP_HOST: 'smtp.test', SMTP_USER: 'u', SMTP_PASS: 'p' });
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    const { createTransport, transporte } = conNodemailer();
    transporte.crearTransporte();
    const [opciones] = createTransport.mock.calls[0];
    expect(opciones).toMatchObject({ host: 'smtp.test', port: 465, auth: { user: 'u', pass: 'p' }, tls: { rejectUnauthorized: false } });
    expect('secure' in opciones).toBe(false);
    expect(transporte.smtpConfigurado()).toBe(true);
  });

  it('respeta SMTP_PORT y SMTP_SECURE', () => {
    Object.assign(process.env, { SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p', SMTP_PORT: '587', SMTP_SECURE: 'false' });
    const { createTransport, transporte } = conNodemailer();
    transporte.crearTransporte();
    expect(createTransport.mock.calls[0][0]).toMatchObject({ port: 587, secure: false });
  });

  it('sin SMTP_* avisa que no está configurado', () => {
    delete process.env.SMTP_HOST;
    const { transporte } = conNodemailer();
    expect(transporte.smtpConfigurado()).toBe(false);
  });
});

describe('config/transbank', () => {
  const conSdk = () => {
    const WebpayPlus = { configureForProduction: jest.fn(), configureWebpayPlusForTesting: jest.fn() };
    jest.doMock('transbank-sdk', () => ({ WebpayPlus }));
    return { WebpayPlus, configurarWebpay: require('../../config/transbank').configurarWebpay };
  };

  it('sin TRANSBANK_ENV no arranca', () => {
    delete process.env.TRANSBANK_ENV;
    const { configurarWebpay } = conSdk();
    expect(() => configurarWebpay()).toThrow(/TRANSBANK_ENV/);
  });

  it('production exige código y llave, y los usa', () => {
    process.env.TRANSBANK_ENV = 'production';
    delete process.env.TRANSBANK_COMMERCE_CODE;
    delete process.env.TRANSBANK_API_KEY;
    let sdk = conSdk();
    expect(() => sdk.configurarWebpay()).toThrow(/TRANSBANK_COMMERCE_CODE/);
    jest.resetModules();
    Object.assign(process.env, { TRANSBANK_COMMERCE_CODE: 'codigo-test', TRANSBANK_API_KEY: 'llave-test' });
    sdk = conSdk();
    expect(sdk.configurarWebpay()).toBe('production');
    expect(sdk.WebpayPlus.configureForProduction).toHaveBeenCalledWith('codigo-test', 'llave-test');
  });

  it('integration usa las credenciales de prueba del SDK', () => {
    process.env.TRANSBANK_ENV = 'integration';
    const { WebpayPlus, configurarWebpay } = conSdk();
    expect(configurarWebpay()).toBe('integration');
    expect(WebpayPlus.configureWebpayPlusForTesting).toHaveBeenCalled();
    expect(WebpayPlus.configureForProduction).not.toHaveBeenCalled();
  });
});

describe('chequeo estático (sin tests ni node_modules)', () => {
  const archivos = [];
  const recorrer = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['node_modules', 'tests', '.git', 'migrations', 'uploads'].includes(e.name)) recorrer(p); } else if (e.name.endsWith('.js')) archivos.push(p);
  });
  recorrer(RAIZ);
  const rel = (p) => path.relative(RAIZ, p).split(path.sep).join('/');
  const con = (re) => archivos.filter((p) => re.test(fs.readFileSync(p, 'utf8'))).map(rel);

  it('createTransport solo en los servicios que leen SMTP_* del entorno', () => {
    expect(con(/createTransport\(/).sort()).toEqual(['services/bodega/correoOrdenCompra.js', 'services/correo/transporte.js']);
  });

  it('ninguna contraseña escrita como `pass: "..."`', () => {
    expect(con(/\bpass\s*:\s*['"][^'"]+['"]/)).toEqual([]);
  });

  it('Webpay solo se configura en config/transbank.js', () => {
    expect(con(/configureForProduction\(|configureForIntegration\(/)).toEqual(['config/transbank.js']);
  });
});
