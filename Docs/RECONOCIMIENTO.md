# Reconocimiento del Repositorio (Fase 0) — Limpiecito ERP

> Estado: **COMPLETO (pendiente de revisión y firma de ambos integrantes)**. Criterio de término (spec §3): cada nombre propuesto en la spec tiene equivalente real o "no existe — se creará".

## Hallazgos verificados (2026-10-15)
| Ítem | Resultado |
|---|---|
| Migraciones Sequelize | No hay `.sequelizerc` ni carpeta `migrations/` en `limpi_back/`; `sequelize-cli` no está en `package.json` → hay que configurarlo (RNF/CAJA). |
| Framework de tests | No hay `jest`/`supertest`/`mocha` en `limpi_back/package.json`. |
| `.env` / dotenv | `.env` y `.env.example` existen; `dotenv@^16` instalado. |
| JWT | Todos los `jwt.sign` usan `process.env.SECRET_KEY` (una sola clave para todos los contextos). Archivos: `api/apartado_base/{usuario,recuperar_pass}`, `api/sistema_intranet/accesos_laborales`, `api/sistema_extranet_cliente`, `routes/sistema_base/{Usuario,Recuperar_pass}`, `routes/rutas_app/{Usuario,Login,Recuperar_password}`, `routes/sist_cliente/Login`, `routes/sist_ext_doc_cliente/Login`, `services/jwt.js` (revisar `verify`). |
| Estructura `api/` | `apartado_app`, `apartado_base`, `apartado_cronograma`, `apartado_doc_cliente`, `apartado_listas_pev`, `apartado_web`, `sistema_extranet_cliente`, `sistema_intranet`. |
| Versión MySQL local | Local: `SELECT VERSION()` devuelve `26.7.0` (soporta `JSON`). Versión de RDS sin confirmar (≥ 5.7 para `JSON`). |

## Checklist (spec §3)

### 1. [x] Rutas legacy (`routes/`, `route/`) y `limpi_back/api/`

`limpi_back/route/index.js` está **vacío** (0 bytes) — no se usa; el montaje real de rutas ocurre en `limpi_back/index.js` (`index.js:26-302`), que registra tanto módulos legacy (`require('./routes/...')`) como nuevos (`require('./api/...')`) bajo el mismo router `api`, montado en `app.use(process.env.PREFIJO, api)` (`index.js:291`, `PREFIJO=/web-limpiecito`).

**Legacy (`routes/`, por archivo; ejemplo de métodos citado, no se listan todos los endpoints):**

| Archivo | Prefijo montado (`index.js`) | Ejemplo de endpoint | Controlador | Tabla(s) principal(es) |
|---|---|---|---|---|
| `routes/sistema_base/Caja.js` (230 líneas, no montado — reemplazado por `api/apartado_base/caja`) | — (comentado `index.js:41`) | `POST /crear` | inline en el propio archivo (no separa lógica) | `cajas` |
| `routes/sistema_base/Liquidacion.js` (354 líneas, no montado — reemplazado) | — (comentado `index.js:106`) | `POST /crear/:idCentroTrabajador` | inline | `liquidaciones`, `centro_costo_trabajadores` |
| `routes/sistema_base/Egreso.js` (111 líneas, no montado — reemplazado) | — (comentado `index.js:96`) | `POST /crear` | inline | `egresos` |
| `routes/documentos/{Categoria,Documento,Asociacion,Descarga,Acceso}.js` | `/categoria`, `/documento`, `/asociacion`, `/descarga`, `/acceso` (`index.js:120-137`) | `POST /documento/crear` (ejemplo) | inline | `categoria_documentos`, `documentos` (ver modelo `Documento.js`) |
| `routes/sist_cliente/{Login,Documentos}.js` | `/login_cliente`, `/archivo_cliente` (`index.js:143-147`) | `POST /login_cliente/login` (ejemplo) | inline, `jwt.sign` con `SECRET_KEY` | `acceso_clientes` (ver `Acceso_cliente.js`) |
| `routes/sist_app/*.js` (Bloque, Categoria_servicio, Horarios, Instructivo, Observacion, Reserva, Servicio, Usuario_app, `dia/`) | `/md_app/*` (`index.js:153-178`) | `POST /md_app/reserva/crear` (ejemplo) | inline / `dia/controlador.js` separa lógica (`dia/logicaDB.js`, `dia/validacion.js`) | `reservas`, `servicios`, `horarios`, `usuario_apps`, `dias` |
| `routes/rutas_app/*.js` (Cate_servicio, Instructivo, Login, Recuperar_password, Reserva, Servicio, Usuario) | `/app_lim/*` (`index.js:184-203`) | `POST /app_lim/login/login` (ejemplo); `routes/rutas_app/Reserva.js` incluye integración Transbank (`returnUrl` línea 72) | inline | `reservas`, `servicios`, `usuario_apps` |
| `routes/sistema_web/{Anuncios,Contactanos,Documentos}.js` | `/anuncios_web`, `/contactanos_web`, `/documento_web` (`index.js:210-217`) | `POST /anuncios_web/crear_anuncio/crear` (`Anuncios.js:18`) | inline, usa Multer (`libs/multer_web.js`) | `anuncios` (ver `modelos/sistema_web/Anuncio.js`) |
| `routes/doc_cliente/{Carpeta_padre,Carpeta,Doc_cliente,Funcion_programada}.js` | `/carpeta_padre`, `/carpeta`, `/carpeta_documento` (`index.js:223-228`); `Funcion_programada.js` no se monta como ruta, se invoca directo en los `cron.schedule` (`index.js:307-321`) | `POST /carpeta/crear` (ejemplo) | inline | `carpetas`, `carpeta_padres`, `doc_clientes`, `doc_subidas` |
| `routes/sist_ext_doc_cliente/{Login,Documentos}.js` | `/sistema_ext_doc_login`, `/sistema_ext_doc_documentos` (`index.js:232-236`) | `POST /sistema_ext_doc_login/login` (ejemplo) | inline, `jwt.sign` con `SECRET_KEY` | `acceso_clientes` |

Nota: todos los módulos bajo `routes/sistema_base/*` para `Caja`, `Liquidacion`, `Egreso`, `Usuario`, `Rol` (`Role.js`), `Cliente`, `Producto`, `Salude`, `Seguro`, `Instituto_previsione`, `Vestimenta`, `Trabajadore`, `Stock_rapido`, `Centro_costo`, `DetalleCentro`, `Recuperar_pass` existen como legacy pero están **comentados/no montados** en `index.js` (p. ej. `index.js:36,41,46,51,56,61,66,71,76,81,86,91,96,101,106,111`) — fueron reemplazados por sus equivalentes en `api/apartado_base/*`. Permanecen en el repo pero no reciben tráfico salvo invocación directa de otro módulo.

**`api/` (nuevo, por módulo; método/path toma como ejemplo el `routes.js` de cada carpeta):**

| Módulo (`api/<carpeta>`) | Prefijo montado | Ejemplo de ruta (archivo `routes.js`) | Tabla(s) (modelo Sequelize) |
|---|---|---|---|
| `apartado_base/usuario` | `/usuario` | `POST /usuario/crear` | `usuarios` |
| `apartado_base/caja` | `/caja` | `POST /caja/crear`, `PUT /caja/cerrar/:idCaja` | `cajas` |
| `apartado_base/rol` | `/rol` | `GET /rol/...` | `roles` |
| `apartado_base/cliente` | `/cliente` | `POST /cliente/crear` | `clientes` |
| `apartado_base/producto` | `/producto` | `POST /producto/crear` | `productos` |
| `apartado_base/salud`, `seguro`, `instituto_prevision` | `/salud`, `/seguro`, `/instituto_prevision` | CRUD estándar | `saludes`, `seguros`, `instituto_previsiones` |
| `apartado_base/vestimenta` | `/vestimenta` | CRUD estándar | `vestimentas` |
| `apartado_base/trabajador` | `/trabajador` | CRUD estándar | `trabajadores` |
| `apartado_base/stock_rapido` | `/stock` | `POST /stock/crear` | `stock_rapidos`, `productos` |
| `apartado_base/centro_costo` | `/centro` | `POST /centro/crear`, `PUT /centro/cerrar/:id` | `centro_costos` |
| `apartado_base/egreso` | `/egreso` | `POST /egreso/crear`, `GET /egreso/obtener-caja/:id` | `egresos` |
| `apartado_base/detalle_centro` | `/detalle` | `POST /detalle/...` (asociación trabajador, lista insumo) | `centro_costo_trabajadores`, `lista_insumos`, `linea_insumos` |
| `apartado_base/liquidacion` | `/liquidacion` | `POST /liquidacion/crear/:idCentroTrabajador` | `liquidaciones` |
| `apartado_base/recuperar_pass` | `/recuperar` | `POST /recuperar/...` | `usuarios` |
| `apartado_app/*` (bloque, categoria_servicio, dia, horario, instructivo, observacion, reserva, servicio, usuario_app) | `/md_app/...` (no montado en `index.js`; `routes/sist_app` sigue activo para este dominio) | — | `reservas`, `servicios`, `horarios`, etc. |
| `apartado_cronograma/{chekeo,cronograma}` | `/checkeo`, `/cronograma` | `POST /cronograma/crear` | `cronogramas`, `checkeos`, `linea_cronogramas` |
| `apartado_doc_cliente/{carpeta_padre,carpeta,doc_cliente,funcion_programada,solicitud}` | `/solicitud` montado (`index.js:301-302`); el resto (`carpeta*`, `doc_cliente`) **no tiene `routes.js`** propio ni se monta — el tráfico real sigue yendo por `routes/doc_cliente/*` legacy | `POST /solicitud/...` | `doc_clientes`, `carpetas`, `solicitudes` |
| `apartado_listas_pev/{areas,sectores,tareas,turnos,turnos_tareas,lista_pev_trabajador,lista_super_trabajador}` | `/area`, `/sector`, `/tarea`, `/turno`, `/turno_tarea`, `/lista_pev_trabajador`, `/lista_supervisor` | `POST /sector/crear` | `areas`, `sectores`, `tareas`, `turnos`, `turno_tareas`, `lista_pev_trabajadores`, `lista_super_trabajadores`, `linea_lista_pev_trabajadores`, `linea_super_trabajadores` |
| `apartado_web/usuario` | — (no se encontró `api.use` para este módulo en `index.js`) | — | `usuarios` (web pública, distinto dominio) |
| `sistema_extranet_cliente` | `/sistema_extranet` | `POST /sistema_extranet/login` (ejemplo, usa `jwt.sign` con `SECRET_KEY`) | `acceso_clientes` |
| `sistema_intranet/{accesos_laborales,clientes-trabajador}` | `/acces_laboral`, `/cliente-trabajador` | `POST /acces_laboral/...` | `acceso_laborales` |

### 2. [x] Mapeo de nombres (spec → real)

Ver tabla "Mapeo de nombres (spec → real)" al final del documento.

### 3. [x] Cálculo actual de la caja mensual y creación de mes nuevo

- **Creación de caja (mes nuevo):** `POST /caja/crear` → `api/apartado_base/caja/controlador.js:3-22` (`crearCaja`) recibe el objeto `caja` ya armado desde el frontend (incluye `fecha_inicio`, `estado`, `usuarioId`) y llama a `logicaDB.crearCajaDB` (`api/apartado_base/caja/logica.js:24-27`), que hace un `Caja.create()` simple. **No hay lógica de negocio en backend** que calcule automáticamente fechas de corte de mes ni que impida crear una caja nueva mientras otra esté `estado: 1` (activa); eso queda a cargo del frontend.
- **Cierre/cálculo de caja:** `PUT /caja/cerrar/:idCaja` → `cerrarCaja` (`api/apartado_base/caja/controlador.js:112-160`). Lógica:
  1. Verifica que no existan Centros de Costo abiertos para esa caja (`obtenerCantidadCentroCostoAbiertoDB`, `logica.js:71-74`, cuenta `Centro_costo` con `estado: 1`).
  2. Si no hay centros abiertos, suma `monto` de todos los `Egreso` de la caja (`obtenerEgresoCajaDB`, `logica.js:81-84`) y suma `utilidad`, `total_costos`, `precio_servicio` de los Centros de Costo cerrados de esa caja (`obtenerCentroCostoCerradoDB`, `logica.js:76-79`).
  3. Calcula `total_ingreso = Σ precio_servicio`, `total_egreso = Σ total_costos + Σ egresos`, `utilidad = Σ utilidad_centros − Σ egresos` (`controlador.js:131-133`).
  4. Actualiza la caja con `estado: 0` (cerrada) vía `editarCajaDB`.
- No se usa transacción de Sequelize (`sequelize.transaction`) en ninguno de los pasos anteriores, pese a tratarse de operaciones financieras concurrentes (riesgo citado en `.claude/rules/backend.md` §1).

### 4. [x] Generación de liquidación y egreso asociado

- `POST /liquidacion/crear/:idCentroTrabajador` → `crearLiquidacion` (`api/apartado_base/liquidacion/controlador.js:3-57`) crea el registro en `liquidaciones` (`crearLiquidacionDB`) y luego actualiza el `centro_costo_trabajadore` correspondiente con `liquidacioneId` (`editarCentroTrabajadorDB`, `logica.js:27-30`).
- **No existe vínculo automático con `egresos`** en este flujo: `crearLiquidacion` no invoca ninguna función de `api/apartado_base/egreso/logica.js`. La creación del egreso de caja asociado al pago de la liquidación se realiza con una llamada HTTP separada a `POST /egreso/crear` (`api/apartado_base/egreso/controlador.js:3-20`), coordinada desde el frontend (no verificado en este documento porque excede el alcance de backend; `Lim_front` no se revisó en detalle para este punto).
- `monto` en el modelo `Egreso` (`modelos/sistema_base/Egreso.js:12-14`) y en `Liquidacion` son `Sequelize.INTEGER`, no `DECIMAL(14,0)`/`BIGINT` — contradice la regla CLP entera de `.claude/rules/backend.md` §1; cambio de tipo requeriría migración (fuera de alcance de este reconocimiento, se anota para el agente `database`).

### 5. [x] Registro actual de insumos/EPP por centro de costo

- No existe una tabla dedicada "bodega" ni "EPP" como tal. El flujo de **insumos** usa `Lista_insumo` (modelo `lista_insumos`, `modelos/sistema_base/Lista_insumo.js`) como cabecera ligada a `Centro_costo` (`centroCostoId`) y `Usuario` (`usuarioCreaId`, `usuarioApruebaId`), con líneas en `Linea_insumo` (`linea_insumos`) ligadas a `Producto`.
- `POST /detalle/...crear-lista-insumo` → `crearListaInsumo` (`api/apartado_base/detalle_centro/controlador.js:31-56`): crea la cabecera `Lista_insumo`, itera `lineasInsumos`, por cada línea llama `disminuirCantidadProductoDB` (decrementa `Producto.stock` con `Producto.decrement`, `logica.js:20-25`) y crea la línea (`crearLineaInsumoDB`). Es decir, el "stock" vive en la tabla `productos` (campo `stock`), compartida para insumos de limpieza y cualquier otro `Producto` — no hay separación de categoría EPP vs. insumo de aseo a nivel de esquema, solo el campo `tipo` (INTEGER) en `Producto`.
- **EPP de vestuario** (tallas) se registra aparte en `Vestimenta` (`modelos/sistema_base/Vestimenta.js`), asociado a `Trabajadore` (1 a 1 por trabajador), sin relación con `Centro_costo` ni con stock/bodega — es un registro de tallas asignadas, no de inventario.
- No se encontraron validaciones de stock negativo (`decrement` no verifica si `stock - cantidad < 0` antes de ejecutar).

### 6. [x] Mecanismo actual de roles/categorías

- Existe el modelo `Role` (`modelos/sistema_base/Role.js`: `nombre`, `descripcion`, `estado`) referenciado por `Usuario.roleId` (`modelos/sistema_base/Usuario.js:30-35`).
- **No se encontró ningún middleware de autorización por rol en el backend.** Se buscó `requireRole`, middleware de permisos, y uso de `services/jwt.js` (que sí define `validarTokenLogin`, `validarTokenPerfil`, `validarTokenCambiarPassword`) en el resto del repo: **ninguna ruta de `api/` ni `routes/` importa ni usa `services/jwt.js`** (grep sin resultados fuera del propio archivo). Es decir, los endpoints de `api/` y `routes/` **no verifican el header `x-access-token`** del lado del servidor; solo lo generan al hacer login.
- La restricción por rol/categoría existe solo en el **frontend**, vía Angular route guards (`Lim_front/src/app/services/guard/{app_guard,archivo-guard,restriccion-guard}.service.ts`). Ejemplo: `RestriccionGuardService.canActivate()` (`Lim_front/src/app/services/guard/restriccion-guard.service.ts:10-17`) redirige si `usuario.role.nombre === 'APOYO_LVL_1'`, comparando por nombre de rol tomado de `localStorage`/servicio de login, no validado contra el token en cada request.
- **Riesgo de seguridad:** cualquier cliente HTTP que conozca las rutas de `api/`/`routes/` puede invocar los endpoints sin token válido ni rol verificado (el guard de Angular es trivialmente evitable llamando la API directamente). Corresponde a una brecha respecto a `.claude/rules/backend.md` §2 ("Permisos por rol con middleware reutilizable").

### 7. [x] Fuente de `verify` de JWT y claves por contexto

- Todas las emisiones de token (`jwt.sign`) usan **una sola clave**: `process.env.SECRET_KEY` (ver lista de archivos en la fila "JWT" de Hallazgos verificados). No hay claves distintas por contexto (admin/cliente/trabajador comparten la misma `SECRET_KEY`).
- `services/jwt.js` (no usado por ningún router, ver punto 6) define sus propias funciones de firma/verificación pero con una clave **distinta**: `process.env.JWT_SEED` (`services/jwt.js:8,19,28,38,49,60`). Esto es código muerto hoy, pero introduce confusión: si en el futuro se conecta este servicio sin corregir la discrepancia de variable de entorno, los tokens emitidos con `SECRET_KEY` fallarían la verificación contra `JWT_SEED`.
- No se encontró ningún `jwt.verify` activo en `api/` ni `routes/` fuera de `services/jwt.js` — es decir, **no hay verificación real de expiración/firma en los endpoints protegidos**, consistente con el hallazgo del punto 6.
- `.env.example` (`limpi_back/.env.example`) **no declara** `SECRET_KEY` ni `JWT_SEED` como variables esperadas (solo `DATABASE_*`, `PORT`, `PREFIJO`); ambas existen únicamente en `.env` (no leído por esta revisión, solo se citan sus nombres de variable).

### 8. [x] Configuración de Nodemailer; ubicación del sitio web público

- **Nodemailer no usa variables de entorno**: todas las instancias de `nodemailer.createTransport` encontradas tienen host/usuario/contraseña **hardcodeados** en el código fuente, por ejemplo:
  - `api/apartado_doc_cliente/funcion_programada/controlador.js:23-34` (`host: 'mail.aseolimpiecito.cl'`, `user: 'no-reply@aseolimpiecito.cl'`, `pass: '<REDACTADO>'`).
  - Mismo patrón repetido en `api/apartado_base/recuperar_pass/controlador.js:18-26`, `api/sistema_extranet_cliente/controlador.js:135-143`, `api/apartado_app/reserva/controlador.js:57-70`, `api/apartado_doc_cliente/solicitud/controlador.js:9-22`, y en los legacy `routes/sistema_base/Recuperar_pass.js:24-37`, `routes/rutas_app/Recuperar_password.js:28-50`, `routes/rutas_app/Reserva.js` (4 ocurrencias: líneas 104-121, 163-177, 292-306, 350-364), `routes/sist_app/Reserva.js:108-121`, `routes/sistema_web/Contactanos.js:11-46` (esta última además tiene una contraseña distinta comentada, `pass: '<REDACTADO>'`, línea 18).
  - **Riesgo de seguridad crítico:** credenciales SMTP en texto plano dentro del código versionado, en contravención directa de `.claude/rules/backend.md` §2 ("Claves JWT, credenciales de BD, SMTP y Transbank solo desde variables de entorno"). No se puede remediar en esta tarea de solo-lectura; se deja registrado para que un requerimiento de seguridad lo traslade a `.env`.
- `database/database.js` también contiene, **comentadas** (no activas, pero igualmente expuestas en el historial/diff del repo), credenciales de conexión anteriores con usuario/password en texto plano (`database/database.js:19,22-23,36`, valores omitidos en este documento). La conexión activa (`database/database.js:64-75`) sí usa `process.env.DATABASE_*`.
- **Sitio web público:** el dominio de producción de la ERP (SPA Angular) es `https://aseolimpiecito.cl` (`Lim_front/src/environments/environment.prod.ts:3-5`, prefijo `/web-limpiecito`), y existe además un subdominio `https://www.minda.aseolimpiecito.cl` usado específicamente en los enlaces de recuperación de contraseña (`api/apartado_base/recuperar_pass/controlador.js:17`, `routes/sistema_base/Recuperar_pass.js:23`, `routes/rutas_app/Recuperar_password.js:27`). La variante para transacciones Transbank usa `https://aseolimpiecito.com` (`routes/rutas_app/Reserva.js:72,219,231`) — dominio `.com`, distinto del `.cl` del resto del sistema; no se pudo determinar desde el repo cuál es el dominio "canónico" vigente en producción (podría ser vestigio de una migración de dominio).

### 9. [ ] Versión de MySQL en RDS

**No verificable desde el repo.** No existe documentación ni variable que indique la versión del motor RDS; `limpi_back/.env` (no leído, solo nombres de variable) define `DATABASE_SERVER` pero no la versión del engine. Se requiere confirmación directa en la consola de AWS RDS (fuera del alcance de esta revisión de solo-lectura de código).

## Mapeo de nombres (spec → real)
| Spec | Real (tabla Sequelize / archivo modelo) | Notas |
|---|---|---|
| `cajas` | `cajas` — `modelos/sistema_base/Caja.js` | Campos monto son `INTEGER`, no `DECIMAL`/`BIGINT`. |
| `ingresos` | `cc_ingresos` — `modelos/sistema_base/CcIngreso.js` | Ingreso a nivel de Centro de Costo, no de caja directamente. |
| `egresos` | `egresos` (caja) y `cc_egresos` (centro de costo) — `modelos/sistema_base/{Egreso,CcEgreso}.js` | Dos tablas distintas según si el egreso es de caja general o de un centro de costo específico. |
| `liquidaciones` | `liquidaciones` — `modelos/sistema_base/Liquidacion.js` | Vinculada 1-1 a `centro_costo_trabajadores` vía `liquidacioneId`. |
| `centros_costo` | `centro_costos` — `modelos/sistema_base/Centro_costo.js` | — |
| `clientes` | `clientes` — `modelos/sistema_base/Cliente.js` | — |
| `trabajadores` | `trabajadores` — `modelos/sistema_base/Trabajadore.js` | — |
| bodega/EPP/insumos | **no existe tabla "bodega" ni "EPP" dedicada** — insumos: `lista_insumos` + `linea_insumos` + `productos` (stock); EPP vestuario: `vestimentas` (solo tallas, sin inventario) | "no existe — se creará" si la spec requiere inventario de EPP separado del de insumos de aseo. |
| proveedores | **no existe — se creará** | No se encontró ningún modelo, ruta ni referencia a "proveedor" en todo `limpi_back`. |
| `listas_pev` | `lista_pev_trabajadores` + `linea_lista_pev_trabajadores` — `modelos/apartado_listas_pev/{listaPevTrabajador,lineaListaPevTrabajador}.js` | Existe también `lista_super_trabajadores` (supervisión) como tabla paralela. |
| sectores/áreas/tareas | `sectores`, `areas`, `tareas` — `modelos/apartado_listas_pev/{sector,area,tarea}.js` | — |
| `actividades` | **no existe tabla "actividades"** — lo más cercano es `tareas` y `turno_tareas` (`modelos/apartado_listas_pev/{tarea,turnoTarea}.js`) | Confirmar con negocio si "actividad" de la spec equivale a `tarea`. |
| `cronogramas` | `cronogramas` + `linea_cronogramas` + `checkeos` — `modelos/apartado_cronograma/{Cronograma,Linea_cronograma,checkeos}.js` | — |
| `reservas` | `reservas` — `modelos/sist_app/Reserva.js` | Pertenece al subsistema App; integración Transbank en `routes/rutas_app/Reserva.js`. |
| `categorias` | `categoria_documentos` — `modelos/sistema_base/Categoria.js` (ámbito documentos); `categoria_servicios` — `modelos/sist_app/Categoria_servicio.js` (ámbito App) | Dos tablas de "categoría" distintas según subsistema; no hay una tabla `categorias` genérica. |
| documentos | `documentos` (extranet, `modelos/sistema_base/Documento.js`), `doc_clientes` + `doc_subidas` (doc. cliente, `modelos/sist_doc_cliente/{Doc_cliente,Doc_subido}.js`), `carpetas` + `carpeta_padres` | Tres dominios de "documento" separados según subsistema (Documentos extranet vs. Doc. Cliente). |
