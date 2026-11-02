# Solicitudes de bodega (RF-BOD-01)

> Estado: esquema, endpoints `/api/v1/bodega`, tests y vista de administración en Lim_front listos.
> **Pendiente de definir: la entrada del supervisor desde su app** (ver "Pendientes").
> Jira: SCRUM-8. Base para RF-BOD-02 (cruce con stock).

## Traspaso para Aarón (estado al 2026-10-25)

Rama `feature/RF-BOD-01-solicitudes-bodega-bastian` (desde `develop` en `fcd5b92`). **Aún sin PR**: queda abierta una decisión sobre el supervisor (abajo). Todo es código nuevo; en archivos existentes sólo se agregaron 4 líneas en `limpi_back/index.js` (montaje del router) y 7 en `Lim_front` (`app.routing.ts` y el ítem del menú en `sidebar.component.ts`).

### Qué se hizo
| Commit | Qué |
|---|---|
| `db(RF-BOD-01)` | Migración `20261024215235`: tablas `solicitudes_bodega` y `solicitud_items` (sin tocar tablas existentes). Modelos en `limpi_back/modelos/sistema_bodega/`, constantes en `services/bodega/constantes.js`. |
| `feat(RF-BOD-01)` endpoints | `api/v1/bodega/{routes,controlador}.js`, `services/bodega/solicitudes.js`, `middleware/auth-bodega.js`. |
| `test(RF-BOD-01)` ×2 | Modelos, servicio, HTTP y autenticación (JWT real). |
| `feat(RF-BOD-01)` vista | `Lim_front/src/app/component/solicitudes-bodega/` (módulo diferido), `services/solicitud-bodega/`, `model/solicitud-bodega.ts`. |
| `fix(RF-BOD-01)` | Ajustes móviles: botones ≥ 44 px, tabla sin scroll a 360 px. |
| `docs(RF-BOD-01)` | Este documento. |

### Verificación hecha
- `npm test` en `limpi_back`: 211/211. La suite `middleware/errores.test.js` aparece como fallida porque es `node:test` y Jest la recoge (ya pasaba en `develop`; 13/13 con `node --test`). Falta acordar config de Jest (p. ej. `testPathIgnorePatterns` o migrarla a Jest).
- Migraciones en MySQL 9.7.4 local: `migrate`, `undo` y `migrate` de la nueva. Prueba del esquema contra la BD (FK, UNIQUE, UNSIGNED, RESTRICT) 15/15 dentro de una transacción con rollback.
- `ng build --prod` OK. Vista nueva medida a 360 px.
- Revisión con el subagente revisor: sin bloqueantes; se aplicaron los hallazgos 1, 2, 3, 7, 9 y 10 (ver "Autenticación") y se quitó el cambio de estado manual (hallazgo 4).

### Cómo probarlo
1. `cd limpi_back && npx sequelize-cli db:migrate` (sólo BD local) y `npm start` (`npm run dev` no funciona: `nodemon` no está en `package.json`).
2. `cd Lim_front`, `NODE_OPTIONS=--openssl-legacy-provider npx ng serve`, entrar como Administrador.
3. Datos mínimos desde las pantallas existentes: caja del mes, cliente, centro de costo abierto y algún producto.
4. Menú **Bodega → Solicitudes**: crear, listar, filtrar por estado ("En proceso" = `PARCIAL` + `LISTA_ENTREGA`), ver detalle y anular.
5. Supervisor (sin pantalla aún): crear trabajador, darle acceso laboral tipo "Trabajador y Supervisor" en *Colaborador → Trabajadores → Ver → Acciones*, asignarlo al centro de costo, y desde la consola del navegador hacer `POST /web-limpiecito/acces_laboral/login` con `{ credenciales: { correo, password } }` y usar el `token` contra `/api/v1/bodega`. **Ese acceso no sirve en el login de Lim_front** (que valida contra `usuarios`).

### ❓ Decisión abierta: ¿quién es "el supervisor"?
La spec (§2.2, RF-BOD-01 regla 1) dice que el supervisor entra con su usuario de trabajador; así quedó implementado (`accesos_laborales`, `tipo = 1`). Pero en *Gestión → Usuarios* también se crean usuarios con rol. Hay que confirmar:
1. ¿El supervisor inicia sesión en **Lim_front como usuario con rol "Supervisor"** o en **la app de trabajadores con acceso laboral**?
2. Si es usuario con rol: ¿cómo se sabe qué centros de costo tiene a cargo? Hoy los centros se asignan a **trabajadores** (`centro_costo_trabajadores`); un usuario no tiene relación con centros (opciones: ver todos los abiertos, tabla nueva usuario–centro, o vincular usuario con su ficha de trabajador).
3. Nombres exactos en `roles` de producción para Supervisor y Subjefe de Operaciones (en local sólo existe `Administrador`).

Impacto: el **esquema no cambia** en ninguno de los dos casos (`trabajador_id` y `usuario_id` son NULL-ables). Si es usuario con rol, cambian `middleware/auth-bodega.js` (supervisor por rol), `listarCentrosPermitidos` y la vista (una pantalla "Mis solicitudes" para ese rol); serían commits nuevos encima, sin reescribir los actuales.

## Endpoints (`/web-limpiecito/api/v1/bodega`)

Header `x-access-token`. Respuestas `{ ok, data, meta }` / `{ ok:false, error:{ code, message, details } }` (spec §2.6).

| Método | Ruta | Quién | Notas |
|---|---|---|---|
| GET | `/productos/solicitables` | Supervisor, Admin | `productos.estado = 1`; sin stock ni precio. |
| GET | `/centros-costo/permitidos` | Supervisor, Admin | No está en la spec: lo necesita el formulario. Supervisor: sus centros abiertos; Admin: todos los abiertos. |
| POST | `/solicitudes` | Supervisor, Admin | Body `{ centro_costo_id, items:[{producto_id, cantidad}], observacion }`. 1–100 ítems, cantidad entera 1–100000, repetidos se suman. 201. |
| GET | `/solicitudes/mias` | Supervisor, Admin | Las creadas por quien consulta (columna de su contexto). |
| GET | `/solicitudes?estado=&centro_costo_id=&page=&limit=` | Admin | `estado` acepta varios separados por coma (`PARCIAL,LISTA_ENTREGA` = "En proceso"). `limit` ≤ 100, `page` ≤ 10000. |
| GET | `/solicitudes/:id` | Dueño, Admin | Supervisor no dueño → 404. `meta.acciones.puede_anular`. |
| PATCH | `/solicitudes/:id/anular` | Supervisor (propia y `PENDIENTE`), Admin (no finalizada) | Body `{ motivo? }`. Queda en `auditoria`. |

**No hay cambio de estado manual** (decisión tras la revisión): `PARCIAL`/`LISTA_ENTREGA` los pone el cruce (RF-BOD-02) y `ENTREGADA` la entrega (RF-BOD-04), para que nunca exista una entrega sin su movimiento de stock.

## Autenticación (`limpi_back/middleware/auth-bodega.js`)

- `jwt.verify` con `algorithms: ['HS256']`, una vez; el contexto se decide con el payload ya verificado.
- **Supervisor:** token de `/acces_laboral/login` con `tipo_acceso = 1`. En cada request se revalida que el trabajador esté activo **y** que su `accesos_laborales` siga con `estado = 1` y `tipo = 1` (el token dura 1 día). Si no, 401 genérico `credenciales no validas`.
- **Usuario intranet:** delega en `middleware/auth.autenticar` (RF-CAJA-02, sin modificarlo) y además exige que el usuario exista con `estado = 1`, el mismo `correo` y el mismo `roleId` del token. `autenticar` por sí solo acepta tokens de `acceso_clientes`/`usuario_apps` (traen `id` sin `roleId`; hoy los frena `requerirRol`); aquí se rechazan con 401.
- Nunca se comparan ids entre contextos: `req.usuario.contexto` indica la tabla de `req.usuario.id`.

## Auditoría

Crear y anular registran en `auditoria` dentro de la misma transacción. **En este módulo, `contexto_usuario = 'acceso_trabajadores'` lleva en `usuario_id` el id de `trabajadores`** (el token del supervisor no trae el id de `accesos_laborales`). `contexto_usuario = 'usuarios'` lleva `usuarios.id`.

## Vista en Lim_front

Módulo con carga diferida `component/solicitudes-bodega/` (menú Bodega → Solicitudes): listado con filtro por estado y paginación del servidor, detalle con ítems y anulación (según `meta.acciones`), y formulario de nueva solicitud usable en celular. Usa el token de sesión existente (`LoginService.getToken()`); un 401 cierra sesión. `loadChildren` usa la sintaxis de string como el resto de `app.routing.ts`: con `"module": "es2015"` en `tsconfig.json`, `import()` no compila.

## Pendientes

- **Entrada del supervisor desde su app:** Lim_front sólo tiene login de `usuarios`. El login de supervisores (`/acces_laboral/login`) lo usa otra app que no está en este repo. La API ya acepta su token; falta definir dónde vive su pantalla (app existente, ruta nueva en Lim_front u otra).
- **Rol de Operaciones (Subjefe):** no existe en la BD local; hoy sólo entra `Administrador`. Al agregarlo, usar una lista aparte para anular (la spec sólo permite anular a Supervisor y Admin).
- **Token de recuperación de contraseña:** firma el mismo payload que el login (1 h) y no se distingue; sirve como sesión. Afecta también a `middleware/auth.js`. Deuda de RNF-SEC-01 (agregar un claim de propósito).
- **Login laboral legacy (no modificado, código existente):** `api/sistema_intranet/accesos_laborales/controlador.js` hace `console.log(credenciales)` (la contraseña queda en texto plano en el log del servidor) y, con contraseña incorrecta, responde el registro `acceso_laboral` completo (incluye el hash). Además `actualizarAccesoLaboralDB` (`logica.js`) guarda `password` vacío si se edita sin escribir contraseña. Corregirlo requiere autorización de ambos (RNF-SEC-01).
- **`middleware/auth.autenticar` (RF-CAJA-02):** acepta tokens de `acceso_clientes`/`usuario_apps` (traen `id` sin `roleId`) y hoy sólo los frena `requerirRol`. Bodega no depende de eso (ver "Autenticación"), pero conviene revisarlo.
- **`db:migrate:undo:all`** se detiene en `RNF-SEC-02` porque `auditoria` ya tiene filas (las escribe la migración de saldo encadenado). Es por diseño, pero en local impide volver a cero.
- **Interceptor HTTP global (tarea D):** la vista maneja el 401 localmente (`solicitudes-bodega.errores.ts`, marcado `shortcut:`); al existir el interceptor se reemplaza.

## Tablas nuevas

Solo se crean tablas; ninguna tabla existente se altera.

### `solicitudes_bodega`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | INT PK AI | |
| `trabajador_id` | FK `trabajadores.id`, NULL | Supervisor que la creó (token de `/acces_laboral/login`). |
| `usuario_id` | FK `usuarios.id`, NULL | Admin/Operaciones que la creó. Exactamente uno de los dos tiene valor (lo valida el servicio). |
| `centro_costo_id` | FK `centro_costos.id`, NOT NULL | |
| `estado` | VARCHAR(20) NOT NULL DEFAULT `'PENDIENTE'` | Ver estados. |
| `observacion` | VARCHAR(500) NULL | |
| `entregada_at`, `anulada_at` | DATETIME NULL | |
| `created_at`, `updated_at` | DATETIME NOT NULL | |

Índices: `(estado, created_at)`, `(trabajador_id, created_at)`, `(centro_costo_id)`.

### `solicitud_items`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | INT PK AI | |
| `solicitud_id` | FK `solicitudes_bodega.id` | |
| `producto_id` | FK `productos.id` | |
| `cantidad_pedida` | INT UNSIGNED NOT NULL | > 0, entero. |
| `cantidad_asignada` | INT UNSIGNED NOT NULL DEFAULT 0 | La escribe RF-BOD-02. |
| `cantidad_faltante` | INT UNSIGNED NULL | NULL = aún no cruzado. La escribe RF-BOD-02. |
| `created_at` | DATETIME NOT NULL | |

`UNIQUE (solicitud_id, producto_id)`: un producto no se repite en una solicitud (spec regla 4; el servicio suma cantidades antes de insertar).

FK con `ON UPDATE CASCADE` y `ON DELETE RESTRICT`. La migración copia el `COLUMN_TYPE` real de cada `id` referenciado y aborta sin cambios si alguna tabla no es InnoDB.

## Estados

| BD (spec §7) | Pantalla (Jira) | Quién lo pone |
|---|---|---|
| `PENDIENTE` | Pendiente | Al crear (RF-BOD-01) |
| `PARCIAL` | En proceso | Cruce con faltantes (RF-BOD-02) |
| `LISTA_ENTREGA` | En proceso | Cruce sin faltantes / recepción (RF-BOD-02, RF-BOD-04) |
| `ENTREGADA` | Entregada | Entrega (RF-BOD-04) |
| `ANULADA` | Anulada | Supervisor (propia, sólo `PENDIENTE`) o Admin |

VARCHAR y no ENUM para que RF-BOD-02/04 no necesiten cambiar la columna. Constantes en `limpi_back/services/bodega/constantes.js`. No hay borrado físico: se anula y queda en `auditoria`.

## Decisiones (diferencias con la spec)

- **Supervisor = `trabajadores`, no `acceso_trabajadores`.** El login real de supervisores es `POST /acces_laboral/login` (tabla `accesos_laborales`, `tipo = 1` "Trabajador y Supervisor"); su token trae el `id` de `trabajadores` y `tipo_acceso`, sin `roleId`. `acceso_trabajadores` ni siquiera declara `id` en su modelo.
- **Centros permitidos del supervisor:** sus filas en `centro_costo_trabajadores` con centro abierto (`centro_costos.estado = 1`). Si es uno solo, la UI lo preselecciona.
- **Productos solicitables:** `productos` con `estado = 1`, sin `stock` ni `precio` (regla 6). No se filtra por `productos.tipo` porque no está documentado qué valor es EPP o insumo SEO/BP; la columna `categoria` de la spec queda para RF-BOD-02.
- **Cruce inmediato (regla 7):** lo implementa RF-BOD-02. RF-BOD-01 deja la solicitud en `PENDIENTE` con `cantidad_faltante = NULL`.
- **Anulación:** hoy sólo exige `PENDIENTE`; la condición "sin orden de compra enviada" se agrega cuando exista RF-BOD-03.

## Para RF-BOD-02 (Aarón)

- Leer ítems con `cantidad_faltante IS NULL` para saber qué falta cruzar.
- El cruce actualiza `cantidad_asignada`, `cantidad_faltante` y `estado` (`PARCIAL` / `LISTA_ENTREGA`) en una transacción con `LOCK.UPDATE` sobre `productos`.
- Si se necesitan columnas nuevas (p. ej. `productos.categoria`, `stock_minimo`), van en una migración propia de RF-BOD-02.

## Reversión

`db:migrate:undo` de esta migración elimina las dos tablas **sólo si `solicitudes_bodega` está vacía**; con filas, aborta (decisión humana: respaldar y renombrar).
