# Checklist de validación de infraestructura con TI (INF-01)

> Origen: retroalimentación Sumativa 2. Se completa en reunión con el administrador TI y se firma **antes** del
> próximo despliegue a producción (el que lleva RF-BOD-06, RF-BOD-04b y RF-BOD-07).
> Columna "Repo" = lo que ya se sabe desde el código; "TI" = lo que solo TI puede confirmar en AWS.
> No anotar aquí contraseñas, IPs públicas completas, ARN ni ids de cuenta: basta "sí/no", el nombre lógico y la evidencia.

| Campo | Valor |
|---|---|
| Fecha de la reunión | |
| Administrador TI | |
| Equipo de desarrollo | Aaron Soto, Bastián Jofré |
| Versión a desplegar | (la que incluya RF-BOD-06/04b/07) |

## 1. Topología real

| # | Punto | Repo | TI confirma |
|---|---|---|---|
| 1.1 | Backend Node/Express en EC2, puerto 3000, prefijo `PREFIJO` (`/web-limpiecito`) | `limpi_back/index.js:366` | ☐ |
| 1.2 | ¿Qué hay delante del Node? (nginx / ALB / acceso directo al 3000) y quién termina TLS | — | |
| 1.3 | ¿Cómo se mantiene vivo el proceso? (pm2 / systemd / otro) y quién lo reinicia | — | |
| 1.4 | Frontend Angular: ¿servido desde la misma EC2 (nginx) o desde otro lado (S3/CloudFront)? | `ng build --prod` | |
| 1.5 | BD en AWS RDS MySQL; versión exacta del motor (≥ 5.7 por columnas `JSON`; ≥ 8.0.16 para `CHECK`) | `Docs/RECONOCIMIENTO.md` §9 (sin confirmar) | |
| 1.6 | Zona horaria del sistema en EC2 y `time_zone` de RDS (el código asume `America/Santiago`) | crons en `index.js:382-399` | |
| 1.7 | Diagrama de despliegue entregado coincide con lo anterior | `Docs/diagramas/` | ☐ |

## 2. Red: RDS en subred privada

| # | Punto | Esperado | TI confirma |
|---|---|---|---|
| 2.1 | RDS con `Publicly accessible = No` | No | ☐ |
| 2.2 | RDS en subredes privadas (sin ruta a Internet Gateway) | Sí | ☐ |
| 2.3 | El equipo de desarrollo **no** tiene acceso directo a RDS; si se necesita, vía túnel SSH a la EC2 | Sí | ☐ |

## 3. Grupos de seguridad

| Puerto | Uso | Origen esperado | Estado real (TI) |
|---|---|---|---|
| 22 (SSH) | administración EC2 | solo IPs de TI / responsables (nunca `0.0.0.0/0`) | |
| 80 (HTTP) | redirección a 443 | `0.0.0.0/0` | |
| 443 (HTTPS) | web y API | `0.0.0.0/0` | |
| 3000 (Node) | API | solo desde el proxy local / ALB; **no** público | |
| 3306 (MySQL) | RDS | solo el grupo de seguridad de la EC2 | |

Salidas (egress) que necesita la app:

| Destino | Motivo | Repo | TI confirma |
|---|---|---|---|
| Servidor SMTP (`SMTP_HOST`:`SMTP_PORT`) | correos de OC a proveedores, notificaciones | `services/bodega/correoOrdenCompra.js` | ☐ |
| Transbank (Webpay) | pagos de reservas (`TRANSBANK_ENV`) | SDK Transbank | ☐ |

## 4. Respaldos, retención y restauración

| # | Punto | TI |
|---|---|---|
| 4.1 | Backups automáticos de RDS activos; período de retención (días) | |
| 4.2 | Ventana de backup y de mantenimiento (no debe chocar con el cron de 18:00 ni con despliegues > 18:30) | |
| 4.3 | Snapshot manual antes de cada despliegue: quién lo toma y cuánto se guarda | |
| 4.4 | Respaldo de la EC2 (AMI / snapshot EBS) y de archivos subidos con Multer (`uploads/`) | |
| 4.5 | Última prueba de restauración real (fecha) — se hace en QA-01 T7 (`Docs/evidencias-pruebas/2026-11-21-T7.md`) | |
| 4.6 | RTO / RPO objetivo acordados con la empresa | |

## 5. Rutas legacy en uso por la app móvil / reservas

El backend mantiene las rutas legacy (`/web-limpiecito/...`) y además las expone bajo `/api/v1` como alias
(`Docs/api-versionado.md`). Retirarlas es RNF-ARQ-01 y requiere saber qué consume cada cliente.

| # | Punto | TI / responsable app |
|---|---|---|
| 5.1 | ¿Hay app móvil en producción? ¿Qué versión y quién la mantiene? | |
| 5.2 | URL base que usa la app (¿`/web-limpiecito` directo?) | |
| 5.3 | Listado de endpoints que consume (extraer de logs del proxy de los últimos 30 días si no hay documentación) | |
| 5.4 | App de reservas (`APP_RESERVAS_URL`): dominio y endpoints que consume | |
| 5.5 | Acuerdo: ninguna ruta legacy se retira ni cambia su respuesta en este despliegue | ☐ |

## 6. Permisos en RDS para lo que trae el despliegue

| # | Punto | Por qué | TI confirma |
|---|---|---|---|
| 6.1 | El usuario de la app (`DATABASE_USER`) tiene `CREATE`, `ALTER`, `INDEX`, `REFERENCES` | migraciones RF-BOD-06/04b/07 crean tablas, columnas e índices | ☐ |
| 6.2 | `CREATE VIEW` | migraciones RF-BI-01/02 crean vistas | ☐ |
| 6.3 | ¿Triggers permitidos? (`TRIGGER` + `log_bin_trust_function_creators = 1` en el parameter group de RDS) | decisión P-4: hoy la inmutabilidad del kardex va por hooks de Sequelize; el trigger MySQL solo se agrega si TI lo habilita | |
| 6.4 | ¿Las migraciones las corre la app con su usuario o TI con uno administrador? | `deploy-skill` | |
| 6.5 | `sql_mode` de RDS (debe incluir `STRICT_TRANS_TABLES`, igual que local) | evitar truncados silenciosos de montos | |

## 7. Secretos y configuración

| # | Punto | TI confirma |
|---|---|---|
| 7.1 | `.env` de producción solo en la EC2, permisos `600`, fuera del repo | ☐ |
| 7.2 | Variables nuevas que debe tener (ver `limpi_back/.env.example`): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMPRESA_NOMBRE`, `EMPRESA_RUT`, `CAJA_APERTURA_AUTOMATICA`, `ROLES_GESTION_USUARIOS`, `JWT_EXPIRES_IN` | ☐ |
| 7.3 | `SECRET_KEY` (JWT) distinta a la de desarrollo | ☐ |
| 7.4 | `TRANSBANK_ENV` en producción con credenciales de comercio reales | ☐ |

## 8. Pendientes que dependen de este checklist

- QA-01 **T7**: restauración RDS/EC2 con medición de RTO/RPO.
- QA-01 **T4 y T6** sobre una copia de producción (`scripts/kardex-conciliar.js`, `scripts/qa01-checksum.js`).
- Decisión **P-4** (trigger de inmutabilidad) según 6.3.

## Observaciones

&nbsp;

## Firmas

| Rol | Nombre | Firma | Fecha |
|---|---|---|---|
| Administrador TI | | | |
| Desarrollo | | | |
| Desarrollo | | | |
