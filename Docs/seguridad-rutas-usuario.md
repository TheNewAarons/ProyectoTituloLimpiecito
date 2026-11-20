# Rutas de usuarios del sistema: sesión y roles (RNF-SEC-01, AUT-006)

Fecha: 2026-11-16 · Autor: Bastián Jofré · Revisión: Aarón Soto · Autorización: AUT-006

## Resumen

Las rutas `/web-limpiecito/usuario/*` (y su alias `/web-limpiecito/api/v1/usuario/*`) ahora **exigen sesión**
(`x-access-token`), salvo `POST /usuario/login`. La gestión de usuarios queda limitada a los roles configurados en
`ROLES_GESTION_USUARIOS` (por defecto solo `Administrador`), y cada usuario puede ver y editar **su propio perfil** sin poder
cambiarse el rol ni el estado. Ninguna respuesta de estas rutas incluye el campo `password`.

## Reglas de acceso

| Ruta | Antes | Ahora |
|---|---|---|
| `POST /usuario/login` | Pública | Pública (sin cambios) |
| `POST /usuario/registro` | Pública | Sesión + rol que gestiona usuarios |
| `GET /usuario/obtener`, `/obtener-inactivo` | Pública | Sesión + rol que gestiona usuarios |
| `GET /usuario/busca-activo/:busca?`, `/busca-inactivo/:busca?` | Pública | Sesión + rol que gestiona usuarios |
| `DELETE /usuario/eliminar/:id`, `/activar/:id` | Pública | Sesión + rol que gestiona usuarios |
| `GET /usuario/rescatar/:id` | Pública | Sesión; el propio usuario o un rol que gestiona usuarios |
| `PUT /usuario/editar/:id` | Pública | Sesión; el propio usuario o un rol que gestiona usuarios |
| `PUT /usuario/editar-password/:id` | Pública | Sesión; el propio usuario o un rol que gestiona usuarios |

Respuestas de error (formato del middleware central, RNF-API-02):
- Sin token, token inválido o vencido → `401` (`TOKEN_REQUERIDO`, `TOKEN_INVALID`, `TOKEN_EXPIRED`).
- Rol sin permiso o perfil ajeno → `403` (`FORBIDDEN`).

**Editar perfil:** si quien edita **no** gestiona usuarios, `editar` y `editar-password` ignoran `roleId` y `estado` del body
(se conservan los actuales). Un rol que gestiona usuarios sí puede cambiarlos, como antes.

## Configuración: `ROLES_GESTION_USUARIOS`

- Nombres de la tabla `roles`, separados por coma, sin distinguir mayúsculas. Ej.: `ROLES_GESTION_USUARIOS=Administrador,RRHH`.
- Vacía o ausente → solo `Administrador` (`ROL_ADMIN_NOMBRES` de `services/constantes.js`).
- Se aplica al reiniciar el backend. Al arrancar se escribe en el log: `[seguridad] roles que gestionan usuarios: ...`.
- La misma lista decide quién puede cambiar rol y estado al editar.
- Documentada en `limpi_back/.env.example` y `Docs/variables-de-entorno.md`.
- **Pendiente:** confirmar si en producción otro rol, además de Administrador, crea o edita usuarios. Si es así, se agrega
  en la variable (sin cambiar código). Si se quiere dejar fijo en el código, se cambia el valor por defecto en
  `config/roles.js` (requiere autorización, porque ya será código existente).

## Archivos

| Archivo | Cambio |
|---|---|
| `limpi_back/config/roles.js` *(nuevo)* | Lee `ROLES_GESTION_USUARIOS`; exporta la lista y `gestionaUsuarios(rol)` |
| `limpi_back/middleware/usuario-propio.js` *(nuevo)* | `propioOGestor`: deja pasar al propio usuario (`req.params.id`) o a un rol que gestiona usuarios; si no, 403 |
| `limpi_back/api/apartado_base/usuario/routes.js` | `autenticar` + `requerirRol(ROLES_GESTION_USUARIOS)` o `propioOGestor` por ruta. `middleware/auth` se carga al llegar la petición (los tests de login simulan la BD sin modelos) |
| `limpi_back/api/apartado_base/usuario/controlador.js` | `editar`/`editar-password` sin `roleId`/`estado` para quien no gestiona usuarios; `registro` responde sin `password` |
| `limpi_back/api/apartado_base/usuario/logica.js` | Listados, búsquedas y `rescatar` con `attributes: { exclude: ['password'] }` (la consulta del login no cambia) |
| `limpi_back/index.js` | Una línea: log de los roles habilitados al arrancar |
| `Lim_front/src/app/services/usuario/usuario.service.ts` | Envía `x-access-token` en todas las llamadas (mismo patrón que `caja.service.ts`) |

Las pantallas no cambian: *Gestión de usuarios* y *Editar perfil* funcionan igual para un Administrador. Un rol sin permiso que
entre a *Gestión de usuarios* verá la lista vacía (el backend responde 403).

## Pruebas

- `tests/api/usuario-rutas-protegidas.test.js` (10): 401 sin sesión en todas las rutas salvo login; 403 para un rol sin
  permiso; perfil propio permitido y ajeno rechazado; no administrador no cambia rol/estado; `registro` sin `password`;
  `ROLES_GESTION_USUARIOS` habilita un rol sin tocar código.
- `tests/api/usuario-logica-sin-password.test.js` (2): las consultas excluyen `password` salvo la del login.
- Prueba real local (13/13) con usuarios temporales de rol Administrador y Operaciones, y pantallas *Gestión de usuarios* y
  *Editar perfil* verificadas en el navegador.

## Despliegue

1. **Backend y front juntos.** Con el front anterior (sin token), *Gestión de usuarios* y *Editar perfil* responderían 401.
2. `ROLES_GESTION_USUARIOS`: dejarla vacía salvo que se confirme otro rol.
3. Ventana después de las 18:30, con respaldo. Revisar en el log la línea `[seguridad] roles que gestionan usuarios`.
4. **Reversión:** revert del merge (backend y front juntos).

## Relacionado

- RNF-SEC-01: AUT-001 (recuperación de contraseña), AUT-005 (clave JWT y sesiones de 8 h), AUT-004 (tokens y respuestas sin
  hash). AUT-006 completa la protección de la cuenta de los usuarios del sistema.
- Pendiente general: revisar si otras rutas legacy montadas en `index.js` tampoco exigen sesión (RNF-ARQ-01).
