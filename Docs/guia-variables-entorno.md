# Guía: dejar listo el `.env` del backend (RNF-SEC-01)

Para cada integrante (`.env` local) y para el servidor de producción. Complementa `Docs/variables-de-entorno.md`
(qué es cada variable). **Nunca** pegues valores reales en chats, PR, issues ni commits.

## 1. Qué cambió y desde cuándo es obligatorio

| PR / cambio | Variable | Si falta |
|---|---|---|
| AUT-005 parte 1 (#41, ya en `develop` y `main`) | `SECRET_KEY` | El backend **no arranca** |
| AUT-005 parte 1 | `JWT_EXPIRES_IN` | Se usa `8h` |
| AUT-005 parte 2 (correo y pagos) | `TRANSBANK_ENV` | El backend **no arranca** |
| AUT-005 parte 2 | `TRANSBANK_COMMERCE_CODE`, `TRANSBANK_API_KEY` | Con `TRANSBANK_ENV=production`, **no arranca** |
| AUT-005 parte 2 | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Arranca, avisa en el log y **no envía correos** |
| AUT-006 (rutas de usuarios) | `ROLES_GESTION_USUARIOS` | Solo `Administrador` gestiona usuarios |

## 2. Revisar cómo está tu `.env` (sin mostrar valores)

Desde `limpi_back`:

```bash
node scripts/verificar-entorno.js
```

Muestra una tabla con `OK` / `FALTA` / `INVÁLIDA` / `AVISO` por variable (nunca los valores) y sale con código 1 si falta algo
obligatorio. Repetirlo después de cada cambio.

## 3. `.env` local (cada integrante)

Valores recomendados en local:

| Variable | Valor en local |
|---|---|
| `SECRET_KEY` | Aleatoria y **propia** (no la de producción) |
| `JWT_EXPIRES_IN` | `8h` |
| `TRANSBANK_ENV` | `integration` (pagos de prueba del SDK; **no** poner código ni llave reales) |
| `TRANSBANK_COMMERCE_CODE`, `TRANSBANK_API_KEY` | Vacías |
| `SMTP_*` | Vacías. **No usar el SMTP real en local**: el envío de las 18:00 mandaría correos de verdad a los clientes de la BD local |
| `ROLES_GESTION_USUARIOS` | Vacía |

### macOS / Linux (Terminal, en `limpi_back`)

```bash
# 1. Respaldo del .env actual (queda local, no se versiona)
cp .env .env.respaldo

# 2. Generar SECRET_KEY y agregarla sin mostrarla (solo si no la tienes)
echo "SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env

# 3. Agregar el resto (solo las líneas que te falten)
printf '%s\n' 'JWT_EXPIRES_IN=8h' 'TRANSBANK_ENV=integration' >> .env

# 4. Revisar
node scripts/verificar-entorno.js
```

### Windows (PowerShell, en `limpi_back`)

```powershell
Copy-Item .env .env.respaldo
$clave = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Add-Content .env "SECRET_KEY=$clave"
Add-Content .env "JWT_EXPIRES_IN=8h"
Add-Content .env "TRANSBANK_ENV=integration"
node scripts/verificar-entorno.js
```

Si una variable ya existía, **edita su línea** en vez de agregar otra (con dos líneas iguales, `dotenv` toma la primera).
Para quitar del local valores reales de Transbank o SMTP, deja esas líneas vacías (`SMTP_PASS=`) y cambia `TRANSBANK_ENV` a `integration`.

## 4. `.env` del servidor de producción

Lo hace quien tenga acceso al servidor (EC2), **antes** de desplegar las ramas que lo exigen.

1. Entrar por SSH y ubicarse en la carpeta `limpi_back` desplegada.
2. Respaldar: `cp .env .env.respaldo-$(date +%Y%m%d)`.
3. Generar la `SECRET_KEY` del servidor y agregarla sin mostrarla:
   ```bash
   echo "SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
   ```
4. Editar con `nano .env` y dejar estas líneas (sin comillas, sin espacios alrededor del `=`), completando las vacías:
   ```
   JWT_EXPIRES_IN=8h
   SMTP_HOST=mail.aseolimpiecito.cl
   SMTP_PORT=465
   SMTP_USER=no-reply@aseolimpiecito.cl
   SMTP_PASS=
   TRANSBANK_ENV=production
   TRANSBANK_COMMERCE_CODE=
   TRANSBANK_API_KEY=
   ROLES_GESTION_USUARIOS=
   NODE_ENV=production
   ```
   | Línea vacía | Qué va |
   |---|---|
   | `SMTP_PASS` | Contraseña actual de la casilla `no-reply` |
   | `TRANSBANK_COMMERCE_CODE` | Código de comercio actual de Webpay Plus |
   | `TRANSBANK_API_KEY` | Llave actual de Webpay Plus |
   | `ROLES_GESTION_USUARIOS` | Vacía, salvo que se confirme otro rol |

   Valores actuales: los tiene Bastián (canal privado), el panel del hosting del correo y el portal de comercios de Transbank.
5. `node scripts/verificar-entorno.js` → todo `OK`. **El verificador se incluye con este cambio**: si el servidor aún no lo
   tiene, se corre después de desplegar y antes de reiniciar.
6. Desplegar y reiniciar el proceso de Node (como se hace hoy). En el log del arranque deben aparecer
   `[pagos] Webpay en modo: production` y `[seguridad] roles que gestionan usuarios: ...`, y **no** el aviso `[correo] ...`.
7. Probar: iniciar sesión, *Gestión de usuarios*, una recuperación de contraseña (debe llegar el correo).

### Formato de los valores

- Sin comillas ni `<>`: `SMTP_PASS=MiClave123`, no `SMTP_PASS='MiClave123'`.
- Excepción: si el valor tiene `#` o espacios, entre comillas dobles: `SMTP_PASS="clave con#signo"`.
- Comprobar sin mostrar el valor: `node -e "require('dotenv').config(); console.log((process.env.SMTP_PASS||'').length)"`.

## 5. Después del despliegue: rotar credenciales

Las credenciales que estuvieron escritas en el código siguen en el historial de git: hay que cambiarlas.

| Credencial | Dónde se cambia | Luego |
|---|---|---|
| `SECRET_KEY` | Se genera una nueva (comando del paso 3 de la sección 4) | Actualizar `.env` del servidor y reiniciar. Cierra todas las sesiones (esperado) |
| `SMTP_PASS` | Panel del hosting de aseolimpiecito.cl → cuentas de correo → `no-reply` | Actualizar `.env` del servidor y reiniciar |
| `TRANSBANK_API_KEY` | Portal de comercios de Transbank (o soporte de Transbank) | Actualizar `.env` del servidor y reiniciar |
| Usuario/contraseña de BD | Consola de AWS RDS (si alguna vez estuvo en el código) | Actualizar `DATABASE_*` y reiniciar |

## 6. Si algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `Falta la variable de entorno SECRET_KEY` al arrancar | Falta `SECRET_KEY` | Sección 3 o 4 |
| `Falta TRANSBANK_ENV` al arrancar | Falta `TRANSBANK_ENV` | `integration` en local, `production` en el servidor |
| `TRANSBANK_ENV=production exige ...` | Faltan código o llave | Cargarlos o usar `integration` en local |
| `[correo] ... no configurados` y no llegan correos | Faltan `SMTP_*` | Cargarlos (solo en el servidor) |
| Todos deben volver a iniciar sesión | Cambió `SECRET_KEY` | Esperado tras rotarla |
| *Gestión de usuarios* responde 403 a un rol que antes entraba | Rol no está en `ROLES_GESTION_USUARIOS` | Agregarlo si corresponde y reiniciar |
