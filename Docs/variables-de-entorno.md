# Variables de entorno (RNF-SEC-01, etapa C1)

La plantilla es `limpi_back/.env.example` (sin valores reales). El archivo real, `limpi_back/.env`, **no se versiona**
y cada ambiente tiene el suyo. Esta etapa solo **declara** las variables; mover las claves que hoy están escritas
en el código (etapa C2) requiere autorización por modificar código existente.

## Estado de cada variable

| Variable | Qué es | ¿La lee el código hoy? |
|---|---|---|
| `DATABASE_NAME`, `DATABASE_SERVER`, `DATABASE_USER`, `DATABASE_USER_PASSWORD` | Conexión a la BD | Sí |
| `PORT`, `PREFIJO` | Puerto y prefijo de las rutas (`/web-limpiecito`) | Sí |
| `NODE_ENV` | `development` o `production` | **Sí**: el middleware de errores (RNF-API-02) oculta stack y detalles internos si vale `production` |
| `SECRET_KEY` | Clave de firma de los JWT | **No**: 9 archivos la asignan con un literal al cargarse y pisan lo que diga el `.env` |
| `JWT_SEED` | Clave que espera `services/jwt.js` | **No**: ese archivo no se usa en ningún sitio |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Correo saliente (Nodemailer) | **No**: están escritos en cada controlador |
| `TRANSBANK_ENV`, `TRANSBANK_COMMERCE_CODE`, `TRANSBANK_API_KEY` | Pagos Webpay Plus | **No**: están escritos en `routes/rutas_app/Reserva.js` |

## Desarrollo vs producción

| Variable | Desarrollo (cada integrante, `.env` local) | Producción (servidor EC2) |
|---|---|---|
| `NODE_ENV` | `development` (o vacío): los errores incluyen `stack` | `production`: sin `stack` ni mensajes internos en los 500 |
| `DATABASE_*` | BD local (`localhost`) | RDS; credenciales solo en el servidor |
| `SECRET_KEY` | Valor propio, aleatorio y distinto al de producción | Valor aleatorio largo, **rotado** y solo en el servidor |
| `SMTP_*` | Cuenta de pruebas o vacío. **No usar el SMTP real** con una BD que tenga correos de clientes: el cron de las 18:00 envía correos de verdad | Cuenta real, **rotada** |
| `TRANSBANK_ENV` | `integration` (credenciales públicas de pruebas de Transbank) | `production` |
| `TRANSBANK_COMMERCE_CODE`, `TRANSBANK_API_KEY` | Los de integración | Los reales, solo en el servidor |

## Reglas

- Nunca poner valores reales en `.env.example`, en commits, PR, logs ni chat.
- El servidor no debería arrancar si falta una variable obligatoria (se agrega cuando el código empiece a leerlas, en C2).
- Una variable nueva se documenta aquí y en `.env.example` en el mismo cambio.

## Pendiente antes del despliegue (manual, no lo hace Claude)

1. Cargar las variables en el servidor de producción.
2. Rotar las credenciales que estuvieron en el código y en el historial de git: JWT (`SECRET_KEY`), SMTP, BD y Transbank.
3. Confirmar el efecto de rotar `SECRET_KEY`: en el backend solo se firman tokens (no se encontró ningún `jwt.verify` en uso), así que rotarla no invalida sesiones ahí. Una vez que algo los verifique, los tokens firmados con la clave anterior dejarán de valer.
