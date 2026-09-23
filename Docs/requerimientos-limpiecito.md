# Limpiecito ERP — Especificación de Requerimientos para Implementación

> **Destinatario:** Claude Code (agente de desarrollo).
> **Versión:** 2.0 — consolidada al 23-sep-2026.
> **Fuentes:** backlog oficial (25 requerimientos, Notion), transcripción de la reunión de kickoff con el dueño (07-abr-2026), reunión con el Administrador TI (09-abr-2026), documento de arquitectura del sistema (Notion) e informe de Formulación del Proyecto de Título (TIHI84, versión corregida).
> **Equipo:** Aaron Soto · Bastián Jofré.

---

## 0. Cómo usar este documento (instrucciones para Claude Code)

1. **Este sistema está en producción.** Se trata de *evolucionar* el ERP existente, no de reescribirlo. Ningún cambio puede romper el uso diario de la empresa.
2. **Antes de escribir código de cualquier requerimiento, ejecuta la Fase 0 (sección 3).** Todos los nombres de tablas, columnas, modelos y rutas de este documento son **propuestas**: debes adaptarlos a los nombres reales que encuentres en el repositorio. Si un modelo ya existe con otro nombre, usa el existente y no dupliques.
3. **Trabaja un requerimiento a la vez**, en el orden de la sección 4. Cada requerimiento es una unidad de trabajo con su propio commit/PR (`feat(RF-CAJA-01): ...`, `refactor(RNF-API-02): ...`).
4. **Cada cambio de esquema va en una migración reversible** (`up`/`down`) de Sequelize. Nunca uses `sync({ force: true })` ni `sync({ alter: true })` contra una BD real.
5. **Datos existentes:** toda migración que agregue estados debe asignar un valor por defecto que **preserve el comportamiento histórico** (ver reglas de migración en cada requerimiento).
6. **Todo endpoint nuevo** se publica bajo `/api/v1/`, usa el middleware centralizado de errores y valida permisos por rol (sección 2).
7. Si un requerimiento está marcado **🔒 BLOQUEADO**, sólo realiza el análisis indicado; no implementes cambios estructurales.
8. Si encuentras una ambigüedad no resuelta aquí, elige la opción que **no destruya datos y sea reversible**, y déjala anotada en `docs/DECISIONES.md`.
9. Al terminar cada requerimiento, verifica todos sus **criterios de aceptación** y actualiza su estado en la tabla de la sección 1.

---

## 1. Backlog consolidado

Esfuerzo en T-shirt sizing: **S = 1 pt · M = 2 pts · L = 3 pts · XL = 5 pts**. Total: **56 pts** (42 RF + 14 RNF).

| Código | Requerimiento | Módulo | Prioridad | Esf. | Tipo | Sprint | Depende de | Estado |
|---|---|---|---|---|---|---|---|---|
| RF-CAJA-01 | Traspaso automático de saldo entre meses | Caja | 🔴 Alta | M | Mejora | 1 | — | Sin empezar |
| RF-CAJA-02 | Estado de pago en liquidaciones de sueldo | Caja | 🔴 Alta | M | Feature nueva | 1 | — | Sin empezar |
| RF-BOD-01 | Solicitud de insumos/EPP por supervisor | Bodega | 🔴 Alta | L | Feature nueva | 2 | — | Sin empezar |
| RF-BOD-02 | Cruce automático solicitud vs stock | Bodega | 🔴 Alta | M | Feature nueva | 2 | BOD-01 | Sin empezar |
| RF-BOD-03 | Envío automático de orden de compra al proveedor | Bodega | 🔴 Alta | M | Feature nueva | 2 | BOD-02 | Sin empezar |
| RF-BOD-04 | Recepción y actualización automática de bodega | Bodega | 🔴 Alta | M | Feature nueva | 3 | BOD-03 | Sin empezar |
| RF-BOD-05 | Dashboard/Home de bodega (solicitudes, lista de compra, stock) | Bodega | 🟠 Media-Alta | M | Feature nueva | 3 | BOD-01..04 | Sin empezar |
| RF-FAC-01 | Estado de pago en facturas (ingresos y egresos) | Facturación | 🟡 Media | S | Mejora | 3 | — | Sin empezar |
| RF-WEB-01 | Catálogo de productos publicable a la web | Web | 🟡 Media | L | Feature nueva | 4 | — | Sin empezar |
| RF-WEB-02 | Portal de PDFs descargables (políticas, reglamento) | Web | 🟡 Media | S | Feature nueva | 4 | — | Sin empezar |
| RF-WEB-03 | Publicaciones y anuncios desde el sistema | Web | 🟢 Baja | S | Feature nueva | 4 | — | Sin empezar |
| RF-PEV-01 | Asignación masiva de actividades PEV | PEV/Cronograma | 🟠 Media-Alta | L | Mejora | 5 | Reunión técnica | 🔒 Bloqueado |
| RF-PEV-02 | Escalabilidad de tareas PEV (1 tarea → N trabajadores) | PEV/Cronograma | 🟠 Media-Alta | XL | Refactor | 5 | Reunión técnica | 🔒 Bloqueado |
| RF-BI-01 | Dashboard financiero (utilidad, tendencias, proyección) | BI/Analytics | 🔴 Alta | L | Feature nueva | 6 | CAJA-01/02, FAC-01 | Sin empezar |
| RF-BI-02 | Rentabilidad por cliente / centro de costo | BI/Analytics | 🔴 Alta | L | Feature nueva | 6 | CAJA-02, FAC-01, BOD-04 | Sin empezar |
| RF-BI-03 | Análisis de consumo de bodega | BI/Analytics | 🟠 Media-Alta | M | Feature nueva | 6 | BOD-01..04 | Sin empezar |
| RF-BI-04 | Productividad de trabajadores/supervisores PEV | BI/Analytics | 🟡 Media | M | Feature nueva | 7 | PEV-01/02 | 🔒 Condicionado |
| RF-BI-05 | Predicción de demanda (app reservas) | BI/Analytics | 🟢 Baja | L | Feature nueva | 7 | — | Sin empezar |
| RNF-SEC-01 | Mover claves JWT a variables de entorno | Transversal | 🔴 Alta | S | Refactor | 7 | — | Sin empezar |
| RNF-ARQ-01 | Unificar estructura legacy `/routes/` con `/api/` | Transversal | 🟡 Media | L | Refactor | 7 | API-01, API-02 | Sin empezar |
| RNF-API-01 | Versionado de API (`/api/v1/`) | Transversal | 🟡 Media | M | Refactor | 7 | — | Sin empezar |
| RNF-API-02 | Manejo centralizado de errores en backend | Transversal | 🟠 Media-Alta | M | Refactor | 8 | — | Sin empezar |
| RNF-UX-01 | Usabilidad móvil en dashboard de bodega y BI | Transversal | 🟡 Media | M | Mejora | 8 | BOD-05, BI-01 | Sin empezar |
| RNF-BI-01 | Rendimiento de dashboards BI < 2 s de carga inicial | Transversal | 🟡 Media | M | Mejora | 8 | BI-01..03 | Sin empezar |
| RNF-SEC-02 | Trazabilidad/auditoría de cambios en caja y bodega | Transversal | 🟠 Media-Alta | M | Feature nueva | 8 | — | Sin empezar |

> El orden de **implementación técnica** recomendado (sección 4) adelanta una base mínima de RNF-API-01, RNF-API-02 y RNF-SEC-01, porque todos los endpoints nuevos dependen de ella. Esto no altera el cronograma académico de sprints; sólo evita tener que migrar dos veces el código nuevo.

---

## 2. Contexto técnico y reglas globales

### 2.1 Stack existente (no cambiar versiones mayores)

| Capa | Tecnología |
|---|---|
| Frontend | Angular 8 + TypeScript 3.4, Angular Material, Bootstrap 4, Material Dashboard (Creative Tim), RxJS, Moment.js, html2pdf, pdfmake, DataTables, SweetAlert2, FullCalendar |
| Backend | Node.js + Express 4.16, Sequelize v4 + MySQL, JWT + bcryptjs, Multer, Nodemailer + Handlebars, node-cron, EJS, Axios, Transbank SDK |
| Infraestructura | AWS EC2 (IaaS) + AWS RDS MySQL (DBaaS). Sin costo AWS adicional atribuible al proyecto. |

**Restricciones de compatibilidad:**
- Cualquier librería nueva debe ser compatible con Angular 8 / TypeScript 3.4 (p. ej. gráficos: `chart.js@2.9.x` + `ng2-charts@2.x`).
- Sequelize v4: usar `Sequelize.Op` para operadores; seguir el patrón de definición de modelos que ya use el repositorio.
- Express 4 no captura errores de funciones `async`: todo handler async va envuelto en `asyncHandler` (RNF-API-02).

### 2.2 Contextos de autenticación existentes

| Contexto | Tabla | Uso |
|---|---|---|
| Admin / staff | `usuarios` | Dueño, Gonzalo, Yocy, administración |
| Clientes (extranet) | `acceso_clientes` | Documentación y servicios propios del cliente |
| Trabajadores / supervisores (app laboral / extranet) | `acceso_trabajadores` | Supervisores solicitan insumos; trabajadores registran PEV |
| Usuarios app móvil | `usuario_apps` | Clientes finales de la app de reservas |

Header de autenticación: `x-access-token`. Contraseñas con bcryptjs (10 rounds).

### 2.3 Matriz de permisos para funcionalidades nuevas

| Funcionalidad | Admin/Dueño | Subjefe Operaciones (Gonzalo) | RRHH (Yocy) | Supervisor | Trabajador | Público |
|---|---|---|---|---|---|---|
| Caja: ver, cerrar/reabrir mes | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Liquidaciones: generar | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Liquidaciones: marcar/revertir pago | ✅ | ❌ | ✅ (marcar) / ❌ (revertir) | ❌ | ❌ | ❌ |
| Facturas: estado de pago | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bodega: crear solicitud | ✅ | ✅ | ❌ | ✅ (propias) | ❌ | ❌ |
| Bodega: órdenes de compra, recepción, entrega | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bodega: dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Web: gestionar catálogo/documentos/publicaciones | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Web: consumir catálogo/documentos/publicaciones | — | — | — | — | — | ✅ |
| PEV: asignación | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| BI/Analytics | ✅ | ✅ (sólo BI-03 y BI-04) | ❌ | ❌ | ❌ | ❌ |
| Auditoría: consultar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

Implementar como middleware reutilizable, p. ej. `requireRole('admin', 'operaciones')`, leyendo el rol desde el token. Si el sistema ya maneja roles/categorías (el administrador asigna "rol y categoría" a usuarios de extranet), **reutiliza ese mecanismo** en vez de crear uno paralelo.

### 2.4 Reglas globales de negocio

- **Regla de impacto en caja:** tras RF-CAJA-02 y RF-FAC-01, **sólo los movimientos en estado pagado impactan la caja**, y lo hacen en el mes de su `fecha_pago`, no en el mes de generación.
- **Moneda:** CLP, montos enteros. Almacenar como `DECIMAL(14,0)` o `BIGINT`; nunca `FLOAT`.
- **Fechas:** zona horaria `America/Santiago`. Un "mes" de caja es el período calendario `YYYY-MM`.
- **Borrado:** los registros financieros y de bodega no se eliminan físicamente; se anulan (estado `ANULADA`) y queda rastro en auditoría.

### 2.5 Continuidad operacional (obligatorio)

- Toda migración se prueba primero en ambiente de pruebas con copia de la BD.
- Respaldo de la BD antes de cada despliegue; despliegue en ventana posterior a las **18:30 hrs**.
- Cada requerimiento debe poder desplegarse de forma independiente y revertirse (migración `down` + revert del commit).
- El cron existente (emails diarios 18:00, vaciado de tablas temporales lunes 07:00) no debe modificarse salvo lo indicado aquí.

### 2.6 Formato estándar de respuesta de la API v1

```json
// éxito
{ "ok": true, "data": { ... }, "meta": { "page": 1, "total": 120 } }

// error
{ "ok": false, "error": { "code": "STOCK_INSUFICIENTE", "message": "Texto legible", "details": { ... } } }
```

---

## 3. Fase 0 — Reconocimiento del repositorio (obligatoria antes de codificar)

Genera `docs/RECONOCIMIENTO.md` con:

1. **Estructura del backend:** listado de rutas en `/routes/` (legacy) y en `/api/`, con método, path, controlador y tabla(s) que tocan.
2. **Modelos Sequelize reales** y su correspondencia con los nombres usados en este documento: `cajas`, `ingresos`, `egresos`, `liquidaciones`, `centros_costo`, `clientes`, `trabajadores`, productos de bodega (`bodega` / EPP / insumos SEO-BP), proveedores (si existen), `listas_pev`, sectores/áreas/tareas, `actividades`, `cronogramas`, `reservas`, `categorias`, archivos/documentos.
3. **Cómo se calcula hoy la caja mensual** (dónde se suman ingresos/egresos, cómo se crea un mes nuevo, si hay tabla de cierre).
4. **Cómo se genera hoy una liquidación** y en qué punto se crea el egreso asociado.
5. **Cómo se registran hoy los insumos/EPP en un centro de costo** (el consumo que el dueño hoy ingresa a mano).
6. **Mecanismo actual de roles/categorías** de usuarios y trabajadores.
7. **Ubicaciones de claves JWT hardcodeadas** (`grep -rn "sign(\|verify(" --include=*.js`).
8. Existencia (o no) de: migraciones Sequelize, framework de tests, `.env`, configuración de Nodemailer, sitio web público (repo o carpeta donde vive la página web de la empresa).
9. Versión de MySQL en RDS (para confirmar soporte de columnas `JSON`, requiere ≥ 5.7).

**Criterio de término:** el documento existe y cada nombre propuesto en este archivo tiene su equivalente real anotado, o la indicación "no existe — se creará".

---

## 4. Orden de implementación recomendado

| Paso | Contenido |
|---|---|
| 0 | Fase 0 (reconocimiento) |
| 1 | Base mínima transversal: RNF-SEC-01 (JWT a `.env`), RNF-API-01 (router `/api/v1`), RNF-API-02 (middleware de errores + `asyncHandler`), tabla `auditoria` de RNF-SEC-02 |
| 2 | Caja: RF-CAJA-02 → RF-CAJA-01 (el traspaso debe calcularse ya con la regla de "sólo pagado") |
| 3 | RF-FAC-01 |
| 4 | Bodega: RF-BOD-01 → 02 → 03 → 04 → 05 |
| 5 | Web: RF-WEB-02 → RF-WEB-01 → RF-WEB-03 |
| 6 | BI: RF-BI-01 → RF-BI-02 → RF-BI-03 → RF-BI-05 |
| 7 | PEV: sólo análisis (🔒) hasta que el equipo confirme la reunión técnica; luego RF-PEV-02 → RF-PEV-01 → RF-BI-04 |
| 8 | RNF restantes: RNF-SEC-02 (cobertura completa), RNF-BI-01, RNF-UX-01, RNF-ARQ-01 (incremental, durante todos los pasos anteriores) |

---

## 5. Módulo CAJA

### RF-CAJA-01 · Traspaso automático de saldo entre meses
**Prioridad:** 🔴 Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 1

**Historia de usuario:** Como dueño, quiero que cada mes de caja parta automáticamente desde el saldo final del mes anterior, para no tener que ingresar a mano el déficit o superávit y evitar errores.

**Problema actual (palabras del dueño):** la caja "no conversa" entre meses. Si un mes termina con −$2.000.000, el mes siguiente parte en $0 y el déficit debe ingresarse manualmente como un movimiento.

**Reglas de negocio:**
1. `saldo_final(mes) = saldo_inicial(mes) + Σ ingresos pagados(mes) − Σ egresos pagados(mes)`.
2. `saldo_inicial(mes N) = saldo_final(mes N−1)`. El primer mes registrado conserva el saldo inicial que tenga hoy (o 0).
3. Estados de caja: `ABIERTA` → `CERRADA`. Sólo puede existir una caja `ABIERTA` por período.
4. **Cierre:** al cerrar el mes N se congela `saldo_final` y se crea (o actualiza) la caja N+1 con `saldo_inicial = saldo_final(N)`.
5. **Apertura automática:** job `node-cron` el día 1 de cada mes a las 00:05 (America/Santiago) crea la caja del mes si no existe, con el saldo arrastrado del mes anterior (use el saldo calculado aunque el mes anterior siga `ABIERTO`, y márquelo como "provisional").
6. **Modificación retroactiva:** si se registra o modifica un movimiento con `fecha_pago` en un mes `CERRADO`, el sistema exige reabrir ese mes (sólo Admin) y, al volver a cerrarlo, **recalcula en cascada** el `saldo_inicial` y `saldo_final` de todos los meses posteriores. Todo dentro de una transacción.
7. El saldo arrastrado se muestra como una línea explícita "Saldo mes anterior" en la vista de caja, **no** como un ingreso/egreso manual.

**Modelo de datos (propuesta):**
```
cajas (existente) + columnas:
  periodo            CHAR(7)        -- 'YYYY-MM', UNIQUE
  saldo_inicial      DECIMAL(14,0)  DEFAULT 0
  saldo_final        DECIMAL(14,0)  NULL
  estado             ENUM('ABIERTA','CERRADA') DEFAULT 'ABIERTA'
  saldo_provisional  BOOLEAN DEFAULT FALSE
  fecha_cierre       DATETIME NULL
  cerrada_por        INT NULL (FK usuarios)
```
**Migración de datos:** calcular `saldo_final` de los meses históricos en orden cronológico y encadenar `saldo_inicial`. Si existen movimientos manuales del tipo "déficit mes anterior" ingresados por el dueño, **no eliminarlos**: listarlos en un reporte (`docs/migracion_caja.md`) para que el dueño decida si se anulan, porque de lo contrario el saldo se duplicaría.

**Endpoints:**
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/v1/cajas/:periodo/resumen` | Saldo inicial, ingresos, egresos, saldo final/actual, estado | Admin |
| POST | `/api/v1/cajas/:periodo/cerrar` | Cierra el mes y arrastra saldo | Admin |
| POST | `/api/v1/cajas/:periodo/reabrir` | Reabre (requiere motivo) | Admin |
| GET | `/api/v1/cajas/historial?desde=&hasta=` | Serie de saldos por mes | Admin |

**Frontend:** en la vista de Caja Mensual, cabecera con "Saldo mes anterior", "Ingresos", "Egresos", "Saldo actual" y badge de estado; botón "Cerrar mes" con confirmación SweetAlert2; indicador de saldo provisional.

**Criterios de aceptación:**
- [ ] Si el mes anterior terminó en −$2.000.000, el mes nuevo muestra saldo inicial −$2.000.000 sin intervención manual.
- [ ] El job del día 1 crea la caja del mes y es idempotente (ejecutarlo dos veces no duplica).
- [ ] Modificar un mes cerrado exige reabrirlo, y al cerrarlo se recalculan correctamente todos los meses posteriores.
- [ ] Cierre, reapertura y recálculo quedan en auditoría (RNF-SEC-02).
- [ ] Test automatizado de la cadena de saldos para al menos 3 meses consecutivos con saldos positivos y negativos.

---

### RF-CAJA-02 · Estado de pago en liquidaciones de sueldo
**Prioridad:** 🔴 Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 1

**Historia de usuario:** Como dueño, quiero generar las liquidaciones de sueldo sin que impacten la caja hasta que realmente las pague, para que la utilidad del mes refleje el flujo real.

**Problema actual:** al generar una liquidación se crea de inmediato un egreso, aunque los sueldos se pagan el día 5 del mes siguiente. La utilidad del período queda distorsionada.

**Reglas de negocio:**
1. Estados: `EN_ESPERA` (generada, visible, **no** impacta caja) → `PAGADA` (impacta caja con fecha real). Opcional: `ANULADA`.
2. Al generar una liquidación **no** se crea egreso.
3. Acción "✓ Marcar como pagada": solicita `fecha_pago` (por defecto hoy) y crea el egreso asociado en la caja del mes de `fecha_pago`, vinculado al centro de costo del trabajador.
4. **Pago masivo:** seleccionar varias liquidaciones (p. ej. todas las del período) y marcarlas pagadas con una sola fecha.
5. **Revertir pago** (sólo Admin, con motivo): elimina lógicamente el egreso asociado y vuelve a `EN_ESPERA`. Si el mes de pago está cerrado, aplica la regla 6 de RF-CAJA-01.
6. La caja muestra un bloque informativo "Liquidaciones pendientes de pago: N — $monto" que no suma al saldo.

**Modelo de datos (propuesta):**
```
liquidaciones (existente) + columnas:
  estado_pago  ENUM('EN_ESPERA','PAGADA','ANULADA') DEFAULT 'EN_ESPERA'
  fecha_pago   DATE NULL
  egreso_id    INT NULL (FK egresos)
  pagada_por   INT NULL (FK usuarios)
```
**Migración de datos:** todas las liquidaciones existentes quedan `PAGADA`, con `fecha_pago` = fecha del egreso que ya generaron y `egreso_id` enlazado. Así el histórico de caja no cambia.

**Endpoints:**
| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/v1/liquidaciones?periodo=&estado_pago=` | Listado filtrable | Admin, RRHH |
| PATCH | `/api/v1/liquidaciones/:id/pagar` | Body `{ fecha_pago }` | Admin, RRHH |
| POST | `/api/v1/liquidaciones/pagar-lote` | Body `{ ids: [], fecha_pago }` | Admin, RRHH |
| PATCH | `/api/v1/liquidaciones/:id/revertir-pago` | Body `{ motivo }` | Admin |

**Frontend:** columna "Estado de pago" con badge (🕐 En espera / ✅ Pagada), botón "Marcar como pagada", checkbox de selección múltiple y acción de pago en lote.

**Criterios de aceptación:**
- [ ] Generar una liquidación no altera el saldo ni la utilidad de caja.
- [ ] Marcarla pagada el día 5 del mes siguiente genera el egreso en ese mes.
- [ ] El pago en lote es atómico (todas o ninguna).
- [ ] Las liquidaciones históricas conservan su efecto en caja tras la migración.
- [ ] Pago y reversión quedan en auditoría.

---

## 6. Módulo FACTURACIÓN

### RF-FAC-01 · Estado de pago en facturas (ingresos y egresos)
**Prioridad:** 🟡 Media · **Esfuerzo:** S (1 pt) · **Sprint:** 3

**Historia de usuario:** Como dueño, quiero registrar una factura como pendiente de pago y marcarla como pagada cuando efectivamente llegue el dinero, para no tener que compensarla con un egreso ficticio.

**Problema actual:** hoy un ingreso/egreso sólo tiene valor, comentario y opción de eliminar. Si registra una factura no pagada, debe crear un egreso para equipararla y luego borrarlo.

**Reglas de negocio:**
1. Aplica a ingresos **y** egresos que correspondan a facturas.
2. Estados: `PENDIENTE` (no impacta caja) → `PAGADA` (impacta caja en el mes de `fecha_pago`) · `ANULADA` (no impacta, queda registro).
3. Campos: tipo de documento, número de factura, `fecha_emision`, `fecha_vencimiento` (opcional), `fecha_pago`.
4. Marcar pagada solicita `fecha_pago` real. Revertir a pendiente sólo Admin con motivo.
5. Resaltar visualmente las facturas `PENDIENTE` con `fecha_vencimiento` vencida.
6. Resumen: "Por cobrar" (ingresos pendientes) y "Por pagar" (egresos pendientes), informativos, fuera del saldo.
7. Fuera de alcance: facturación electrónica automática (SII) e integración bancaria.

**Modelo de datos (propuesta):**
```
ingresos / egresos (existentes) + columnas:
  tipo_documento     ENUM('FACTURA','BOLETA','OTRO') NULL
  numero_documento   VARCHAR(30) NULL
  fecha_emision      DATE NULL
  fecha_vencimiento  DATE NULL
  estado_pago        ENUM('PENDIENTE','PAGADA','ANULADA') DEFAULT 'PAGADA'
  fecha_pago         DATE NULL
```
**Migración de datos:** todos los registros existentes quedan `PAGADA` con `fecha_pago` = su fecha actual (no cambia el histórico). En el formulario nuevo, si el tipo es `FACTURA`, el estado por defecto es `PENDIENTE`.

**Endpoints:**
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/ingresos?estado_pago=&periodo=` · `/api/v1/egresos?...` | Listado filtrable |
| PATCH | `/api/v1/ingresos/:id/pagar` · `/api/v1/egresos/:id/pagar` | Body `{ fecha_pago }` |
| PATCH | `/api/v1/ingresos/:id/anular` · `/api/v1/egresos/:id/anular` | Body `{ motivo }` |
| GET | `/api/v1/facturas/resumen?periodo=` | Totales por cobrar / por pagar |

**Criterios de aceptación:**
- [ ] Una factura de ingreso pendiente no aparece en el saldo de caja hasta marcarse pagada.
- [ ] Ya no se necesita crear un egreso compensatorio.
- [ ] Anular reemplaza a eliminar para facturas; el registro permanece consultable.
- [ ] La caja recalcula correctamente según RF-CAJA-01 al pagar en un mes distinto al de emisión.

---

## 7. Módulo BODEGA

### Flujo objetivo (TO-BE)

```
Supervisor ──(solicitud desde su cuenta)──▶ Sistema
Sistema ──(cruce con stock)──▶ descuenta lo disponible + genera faltante
Faltantes de todas las solicitudes ──▶ Lista de compra consolidada (por proveedor)
Admin ──(📧 Enviar al proveedor)──▶ Orden de compra por correo
Proveedor entrega ──▶ Admin confirma recepción
Sistema ──▶ suma stock, asigna a solicitudes pendientes, las marca "lista para entrega"
Admin ──(Entregar / imprimir formato)──▶ consumo registrado en el centro de costo automáticamente
```

**Ejemplo de referencia (entregado por el dueño) — usar como caso de prueba:**

| Producto | Stock | Pedido | Se descuenta | A comprar |
|---|---|---|---|---|
| A | 10 | 12 | 10 | 2 |
| B | 8 | 5 | 5 | 0 |
| C | 3 | 4 | 3 | 1 |
| D | 0 | 20 | 0 | 20 |

### Modelo de datos del módulo (propuesta)

```
productos_bodega (existente) + columnas:
  categoria       ENUM('EPP','INSUMO') -- insumos de producto SEO/BP; adaptar a lo existente
  stock_minimo    INT DEFAULT 0
  proveedor_id    INT NULL (FK proveedores)
  costo_unitario  DECIMAL(14,0) NULL   -- último precio de compra

proveedores (nueva si no existe): id, nombre, rut, email, telefono, contacto, activo

solicitudes_bodega: id, supervisor_id (FK acceso_trabajadores), centro_costo_id,
  estado ENUM('PENDIENTE','PARCIAL','LISTA_ENTREGA','ENTREGADA','ANULADA'),
  observacion, created_at, entregada_at

solicitud_items: id, solicitud_id, producto_id,
  cantidad_pedida, cantidad_asignada DEFAULT 0, cantidad_faltante

ordenes_compra: id, proveedor_id,
  estado ENUM('BORRADOR','ENVIADA','RECIBIDA_PARCIAL','RECIBIDA','ANULADA'),
  enviada_at, enviada_a_email, created_by

orden_compra_items: id, orden_id, producto_id, cantidad, cantidad_recibida DEFAULT 0, costo_unitario

movimientos_bodega: id, producto_id,
  tipo ENUM('ENTRADA_COMPRA','SALIDA_SOLICITUD','AJUSTE','REVERSA'),
  cantidad, referencia_tipo, referencia_id, usuario_id, created_at
```
Toda modificación de stock **debe** crear un registro en `movimientos_bodega` (cubre el "historial de entradas y salidas" del alcance).

---

### RF-BOD-01 · Solicitud de insumos/EPP por supervisor
**Prioridad:** 🔴 Alta · **Esfuerzo:** L (3 pts) · **Sprint:** 2

**Historia de usuario:** Como supervisor, quiero ingresar desde mi cuenta la lista de EPP e insumos que necesito para mi centro de costo, para no enviarla por WhatsApp o papel.

**Reglas de negocio:**
1. El supervisor inicia sesión con su usuario de trabajador (`acceso_trabajadores`, rol supervisor) desde la extranet/web; la vista debe funcionar en celular (RNF-UX-01).
2. Puede pedir **EPP e insumos de producto (SEO/BP)** del catálogo de bodega; selecciona producto (con buscador) y cantidad (> 0, entero).
3. Cada solicitud se asocia a un centro de costo (el cliente/servicio al que corresponde). Si el supervisor tiene un único centro asignado, se preselecciona.
4. Un producto no puede repetirse dentro de la misma solicitud (se suman las cantidades).
5. El supervisor ve el historial y estado de sus propias solicitudes; puede anular la suya sólo mientras esté `PENDIENTE` y no se haya enviado ninguna orden de compra que la incluya.
6. El supervisor **no** ve stock ni costos.
7. Al crearse, se ejecuta de inmediato el cruce (RF-BOD-02).

**Endpoints:**
| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/v1/bodega/productos/solicitables` | Supervisor |
| POST | `/api/v1/bodega/solicitudes` — body `{ centro_costo_id, items: [{producto_id, cantidad}], observacion }` | Supervisor, Admin, Operaciones |
| GET | `/api/v1/bodega/solicitudes/mias` | Supervisor |
| GET | `/api/v1/bodega/solicitudes?estado=&centro_costo_id=` | Admin, Operaciones |
| GET | `/api/v1/bodega/solicitudes/:id` | Dueño de la solicitud, Admin, Operaciones |
| PATCH | `/api/v1/bodega/solicitudes/:id/anular` | Supervisor (propia), Admin |

**Criterios de aceptación:**
- [ ] Un supervisor crea una solicitud con varios productos desde un celular.
- [ ] La solicitud queda visible para el administrador sin pasos manuales.
- [ ] Un supervisor no puede ver solicitudes de otros supervisores.
- [ ] Validaciones: cantidades positivas, producto existente, centro de costo permitido.

---

### RF-BOD-02 · Cruce automático solicitud vs stock
**Prioridad:** 🔴 Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 2

**Historia de usuario:** Como administrador, quiero que el sistema compare automáticamente lo pedido con el stock y me muestre sólo lo que hay que comprar, para no hacer el cruce en Excel.

**Reglas de negocio:**
1. Por cada ítem: `asignado = min(stock_actual, pedido)`, `faltante = pedido − asignado`.
2. Lo asignado **se descuenta del stock** en ese momento (movimiento `SALIDA_SOLICITUD`), tal como se acordó en la reunión: "a la solicitud se le resta el stock y después se crea la diferencia".
3. Estado resultante: todos los ítems sin faltante → `LISTA_ENTREGA`; alguno con faltante → `PARCIAL`.
4. El cruce se ejecuta en **una transacción con bloqueo de filas** (`SELECT ... FOR UPDATE` / `transaction.LOCK.UPDATE` en Sequelize) para que dos solicitudes simultáneas no consuman el mismo stock.
5. **Lista de compra consolidada:** suma de `cantidad_faltante` pendientes de todas las solicitudes, agrupada por producto y proveedor, descontando lo ya incluido en órdenes `ENVIADA` no recibidas.
6. Anular una solicitud devuelve lo asignado al stock (movimiento `REVERSA`) y quita sus faltantes de la lista de compra.
7. El detalle de cada solicitud muestra las **tres tablas** discutidas en la reunión: *lo que se pidió*, *lo que se descontó de bodega* y *lo que falta comprar*.

**Endpoints:**
| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/v1/bodega/solicitudes/:id/cruce` | Admin, Operaciones |
| GET | `/api/v1/bodega/lista-compra?agrupar=proveedor` | Admin, Operaciones |

Implementar la lógica en un servicio (`services/bodega/cruceStock.js`) con tests unitarios.

**Criterios de aceptación:**
- [ ] El ejemplo de referencia (A, B, C, D) produce exactamente la columna "A comprar" esperada: 2, 0, 1, 20.
- [ ] El stock queda en A=0, B=3, C=0, D=0 tras el cruce.
- [ ] Dos solicitudes concurrentes por el mismo producto no dejan stock negativo.
- [ ] La lista de compra sólo muestra productos con faltante > 0.

---

### RF-BOD-03 · Envío automático de orden de compra al proveedor
**Prioridad:** 🔴 Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 2

**Historia de usuario:** Como administrador, quiero presionar un botón "📧 Enviar al proveedor" y que el sistema le mande la orden de compra por correo, para no armar un Excel aparte.

**Reglas de negocio:**
1. Desde la lista de compra se genera una orden `BORRADOR` por proveedor.
2. El administrador puede ajustar cantidades antes de enviar (comprar más que el faltante) y quitar ítems.
3. Si un producto no tiene proveedor asignado, no puede enviarse hasta asignarlo (se muestra advertencia).
4. "Enviar" usa Nodemailer + plantilla Handlebars: datos de la empresa, número de orden, fecha, tabla de productos y cantidades; adjunta PDF de la orden si es factible en backend (opcional, prioridad baja). Estado → `ENVIADA`, guarda `enviada_at` y email destino.
5. Si el envío falla, la orden queda `BORRADOR` y se muestra el error; nunca se marca enviada sin confirmación del transporte SMTP.
6. Permitir reenviar una orden `ENVIADA`.
7. CRUD básico de proveedores (nombre, RUT, email, teléfono, contacto) y asignación proveedor ↔ producto.
8. Credenciales SMTP en variables de entorno.

**Endpoints:**
| Método | Ruta |
|---|---|
| POST | `/api/v1/bodega/ordenes-compra/desde-lista` (genera borradores por proveedor) |
| GET / PATCH | `/api/v1/bodega/ordenes-compra/:id` |
| POST | `/api/v1/bodega/ordenes-compra/:id/enviar` |
| CRUD | `/api/v1/bodega/proveedores` |

**Criterios de aceptación:**
- [ ] Con un clic se envía el correo al proveedor con el detalle correcto.
- [ ] La orden queda registrada con estado, fecha y destinatario.
- [ ] Un fallo SMTP no deja la orden en estado inconsistente.

---

### RF-BOD-04 · Recepción y actualización automática de bodega
**Prioridad:** 🔴 Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 3

**Historia de usuario:** Como administrador, quiero confirmar en el sistema que llegó la mercadería y que el stock y los centros de costo se actualicen solos, para no ingresar nada a mano.

**Reglas de negocio:**
1. Sobre una orden `ENVIADA`, el administrador confirma la recepción por línea (`cantidad_recibida`, por defecto = cantidad pedida). Se permite recepción parcial → `RECIBIDA_PARCIAL`; completa → `RECIBIDA`.
2. Al confirmar: stock += recibido (movimiento `ENTRADA_COMPRA`) y se actualiza `costo_unitario` del producto.
3. **Asignación automática:** lo recibido se asigna a los faltantes de solicitudes pendientes en orden FIFO (la más antigua primero), descontando del stock; las solicitudes que quedan completas pasan a `LISTA_ENTREGA`. El excedente queda como stock libre.
4. **Entrega:** en una solicitud `LISTA_ENTREGA`, el botón "Entregar" genera el **formato de entrega imprimible** (pdfmake/html2pdf) y pasa a `ENTREGADA`.
5. **Centro de costo automático:** al marcar `ENTREGADA`, el sistema registra el consumo de cada ítem en el centro de costo de la solicitud (cantidad × `costo_unitario`), usando el mismo mecanismo con que hoy se cargan insumos al centro de costo (ver Fase 0, punto 5). No se ingresa nada manualmente.
6. Todas las operaciones de una recepción ocurren en una sola transacción.

**Endpoints:**
| Método | Ruta |
|---|---|
| POST | `/api/v1/bodega/ordenes-compra/:id/recepcion` — body `{ items: [{item_id, cantidad_recibida}] }` |
| POST | `/api/v1/bodega/solicitudes/:id/entregar` |
| GET | `/api/v1/bodega/solicitudes/:id/formato-entrega` |
| GET | `/api/v1/bodega/movimientos?producto_id=&desde=&hasta=` |

**Criterios de aceptación:**
- [ ] Confirmar recepción actualiza el stock sin carga manual.
- [ ] Las solicitudes pendientes reciben lo llegado en orden de antigüedad.
- [ ] Al entregar, el centro de costo refleja el consumo con su costo.
- [ ] Se puede imprimir el formato de entrega.
- [ ] Cada entrada/salida queda en `movimientos_bodega`.

---

### RF-BOD-05 · Dashboard / Home de bodega
**Prioridad:** 🟠 Media-Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 3

**Historia de usuario:** Como administrador (y Gonzalo, subjefe de operaciones), quiero entrar a bodega y ver de inmediato las solicitudes, lo que hay que comprar y el stock, en vez de un listado largo de productos.

**Contenido:**
| Bloque | Contenido | Acción |
|---|---|---|
| 📋 Solicitudes activas | Cantidad por estado (`PENDIENTE`, `PARCIAL`, `LISTA_ENTREGA`) | Ver listado / detalle con las 3 tablas |
| 🛒 Lista de compra | Sólo productos faltantes, con cantidad y proveedor | Generar/enviar órdenes |
| 📦 Stock actual | Inventario por producto; **alerta** en productos bajo `stock_minimo` | Ver movimientos |
| 🚚 Órdenes en tránsito | Órdenes `ENVIADA` / `RECIBIDA_PARCIAL` | Confirmar recepción |

**Reglas:** el home de bodega es la página de entrada del módulo (al seleccionar Bodega en el menú). El listado completo de productos sigue accesible en una pestaña secundaria.

**Endpoint:** `GET /api/v1/bodega/dashboard` (una sola llamada con los cuatro bloques resumidos).

**Criterios de aceptación:**
- [ ] Al entrar a Bodega se muestra el dashboard, no el listado completo.
- [ ] Los contadores coinciden con los datos reales.
- [ ] Los productos bajo stock mínimo se destacan visualmente.
- [ ] Usable en pantalla de celular (RNF-UX-01) y carga < 2 s.

---

## 8. Módulo WEB

> **Fase 0:** confirmar dónde vive la página web pública (el dueño indicó que hoy no está operativa). Este requerimiento entrega **endpoints públicos + administración en el ERP**; la maquetación del sitio público se hace donde viva el sitio (si no existe, crear páginas públicas simples servidas por Express/EJS o por una ruta pública de Angular, lo que resulte menos invasivo).

### RF-WEB-01 · Catálogo de productos publicable a la web
**Prioridad:** 🟡 Media · **Esfuerzo:** L (3 pts) · **Sprint:** 4

**Historia de usuario:** Como dueño, quiero subir y editar productos/servicios del catálogo desde el sistema y que se publiquen solos en la web, sin depender de un desarrollador.

**Reglas:**
1. Ítem de catálogo: nombre, descripción, categoría, imagen (Multer; jpg/png/webp, máx. 5 MB, redimensionar si es posible), precio opcional, `publicado`, `orden`.
2. Sólo los ítems `publicado = true` aparecen en el endpoint público.
3. Reordenar y despublicar sin borrar.
4. Independiente del inventario de bodega (el catálogo es comercial, la bodega es interna). Si Fase 0 muestra que el catálogo debe basarse en productos de bodega, agregar un vínculo opcional, nunca exponer stock ni costos.

**Endpoints:** `CRUD /api/v1/web/catalogo` (Admin) · `GET /api/v1/public/catalogo` (sin autenticación, cacheable).

**Criterios:** [ ] Un ítem creado y publicado aparece en la web sin tocar código. [ ] Despublicar lo oculta de inmediato. [ ] El endpoint público no expone campos internos.

### RF-WEB-02 · Portal de PDFs descargables
**Prioridad:** 🟡 Media · **Esfuerzo:** S (1 pt) · **Sprint:** 4

**Historia de usuario:** Como dueño, quiero subir PDFs (política de privacidad, reglamento interno, certificaciones legales) para que cualquiera pueda descargarlos desde la web.

**Reglas:**
1. **Reutilizar el módulo existente "Archivo" (documentos y categorías)** agregando la marca `publico`.
2. Sólo PDF (validar MIME y extensión), máx. 10 MB. Título, categoría, fecha de publicación.
3. Endpoint público lista y descarga sólo documentos `publico = true`; nombres de archivo saneados, sin rutas internas expuestas.

**Endpoints:** `PATCH /api/v1/archivos/:id/publicar` · `GET /api/v1/public/documentos` · `GET /api/v1/public/documentos/:id/descargar`.

**Criterios:** [ ] Al menos 3 documentos publicables (meta del indicador). [ ] Un documento no público no es descargable aunque se conozca su id.

### RF-WEB-03 · Publicaciones y anuncios desde el sistema
**Prioridad:** 🟢 Baja · **Esfuerzo:** S (1 pt) · **Sprint:** 4

**Historia de usuario:** Como dueño, quiero publicar anuncios (p. ej. saludo del Día de la Madre, novedades) desde el sistema para que aparezcan en la web.

**Reglas:** título, cuerpo (texto enriquecido simple, sanitizado contra XSS), imagen opcional, `fecha_publicacion`, `fecha_expiracion` opcional, `publicado`. El endpoint público devuelve sólo los vigentes, ordenados por fecha.

**Endpoints:** `CRUD /api/v1/web/publicaciones` · `GET /api/v1/public/publicaciones`.

**Criterios:** [ ] Un anuncio aparece al llegar su fecha y desaparece al expirar. [ ] HTML malicioso en el cuerpo se sanitiza.

**Complementario del alcance (sin código de backlog):** exponer en el portal los datos de contacto de la empresa gestionables desde el sistema. Implementar sólo si no agrega más de 1 pt; si no, registrar en `docs/DECISIONES.md`.

---

## 9. Módulo PEV / CRONOGRAMA — 🔒 BLOQUEADO

> El alcance definitivo depende de la **reunión técnica pendiente con el desarrollador original**. La lógica actual es compleja y no está documentada. **No modificar el esquema ni la lógica PEV hasta que el equipo lo autorice explícitamente.**

### Lo que sí se sabe (reunión de kickoff)
- Un **supervisor** tiene trabajadores asignados; a cada **trabajador** se le asigna un **área**; cada área tiene varias **actividades**, y cada actividad tiene **tres pasos de limpieza**.
- El trabajador marca en la app laboral que realizó los tres pasos del área; el supervisor puede **chequear cada actividad** (hasta tres veces) en el horario correspondiente y registrar **observaciones**.
- Estructura de control de calidad: **Sectores → Áreas → Tareas** (Listas PEV), más módulo **Cronograma** (programación de servicios).
- El administrador crea usuarios de trabajador, les asigna rol y categoría, y los habilita en la extranet.
- **Problemas:** asignación uno a uno, lenta en proyectos grandes (estadio, puerto); si 10 trabajadores barren 10 áreas distintas hay que crear "barrido" 10 veces; si luego son 9 o 11, hay que rehacer la estructura.
- La vista de supervisor en la extranet está en migración de servidor.

### Tarea permitida ahora: análisis
Generar `docs/PEV_ANALISIS.md` con: diagrama entidad-relación actual de las tablas PEV/cronograma, flujo real de creación y asignación de tareas en el código, y la propuesta técnica de RF-PEV-02 (abajo), incluyendo el plan de migración de datos. Ese documento servirá de insumo para la reunión técnica.

### RF-PEV-02 · Escalabilidad de tareas (1 tarea → N trabajadores)
**Prioridad:** 🟠 Media-Alta · **Esfuerzo:** XL (5 pts) · **Sprint:** 5
**Historia:** Como supervisor, quiero crear una actividad una sola vez y asignarla a varios trabajadores/áreas, para que cambiar la dotación no obligue a rehacer la estructura.
**Propuesta técnica (validar en reunión):** separar la **definición** de la actividad (plantilla con sus 3 pasos) de su **asignación** mediante una tabla intermedia `actividad_asignaciones (actividad_id, trabajador_id, area_id, fecha/turno)`. Los registros de cumplimiento y verificación se asocian a la asignación, no a la definición. Migrar las actividades duplicadas existentes a una definición + N asignaciones sin perder el historial de chequeos.
**Criterios:** [ ] Pasar de 10 a 9 trabajadores sólo elimina una asignación. [ ] El historial de cumplimiento previo se conserva.

### RF-PEV-01 · Asignación masiva de actividades
**Prioridad:** 🟠 Media-Alta · **Esfuerzo:** L (3 pts) · **Sprint:** 5 · **Depende de:** RF-PEV-02
**Historia:** Como supervisor/administrador, quiero asignar una misma actividad a muchos trabajadores con checkboxes o botones rápidos, en una sola acción.
**Reglas propuestas:** selección múltiple de trabajadores (con filtro por supervisor/centro de costo y "seleccionar todos"), selección de actividad(es) y área(s), vista previa, confirmación única; operación transaccional.
**Criterios:** [ ] Asignar una tarea a 10 trabajadores toma una sola acción. [ ] No se duplican asignaciones idénticas.

### Complementarios del alcance (sujetos a la misma reunión)
Visualización de calendario de servicios (FullCalendar ya disponible), priorización de servicios urgentes, observaciones por actividad, consulta de servicios pendientes/en proceso/finalizados.

---

## 10. Módulo BI / ANALYTICS

### Enfoque técnico común
- Endpoints bajo `/api/v1/analytics/*`, sólo lectura, rol Admin (Operaciones sólo BI-03 y BI-04).
- Agregaciones en MySQL (`GROUP BY`, `SUM`, `AVG`) mediante **vistas SQL** creadas por migración; nada de agregar en memoria miles de filas en Node.
- Frontend: nuevo `AnalyticsModule` de Angular con carga diferida (lazy loading), gráficos con `chart.js@2.9` + `ng2-charts@2.x`.
- Todos los cálculos financieros usan la **regla de impacto en caja** (sólo pagados, por `fecha_pago`).
- Filtros comunes: rango de períodos (`desde`, `hasta` en `YYYY-MM`), centro de costo, cliente.

### RF-BI-01 · Dashboard financiero
**Prioridad:** 🔴 Alta · **Esfuerzo:** L (3 pts) · **Sprint:** 6

**Historia:** Como dueño, quiero ver la utilidad real del mes, la tendencia y una proyección del próximo mes, para anticipar déficits sin calcular a mano.

| KPI | Cálculo | Fuente |
|---|---|---|
| Utilidad real del mes | Σ ingresos pagados − Σ egresos pagados del período | cajas, ingresos, egresos |
| Saldo acumulado | Saldo final encadenado (RF-CAJA-01) | cajas |
| Tendencia ingresos vs egresos | Serie mensual últimos 12 meses | ingresos, egresos |
| Proyección mes siguiente | Promedio móvil de los últimos 3 meses de ingresos y egresos (mostrar también regresión lineal sobre 6 meses si hay datos suficientes); etiquetar como estimación | histórico |
| Alerta de utilidad baja | Utilidad proyectada o real < umbral configurable | configuración |
| Liquidaciones pendientes | N° y monto en `EN_ESPERA` | liquidaciones |
| Por cobrar / por pagar | Facturas `PENDIENTE` | ingresos, egresos |

Umbral configurable: tabla `configuracion (clave, valor)` o la que exista.
**Endpoints:** `GET /api/v1/analytics/financiero/resumen?periodo=` · `GET /api/v1/analytics/financiero/tendencia?desde=&hasta=` · `GET /api/v1/analytics/financiero/proyeccion`.
**Criterios:** [ ] ≥ 5 KPIs visibles (meta del indicador). [ ] La utilidad calculada coincide con la caja del mes. [ ] Con menos de 3 meses de historia, la proyección muestra "datos insuficientes" en vez de un número.

### RF-BI-02 · Rentabilidad por cliente / centro de costo
**Prioridad:** 🔴 Alta · **Esfuerzo:** L (3 pts) · **Sprint:** 6

**Historia:** Como dueño, quiero saber qué clientes (TPA, CFT Estatal, otros) dejan ganancia y cuáles operan en pérdida, para priorizar renovaciones.

| Métrica | Cálculo |
|---|---|
| Ingresos por cliente | Facturas de ingreso pagadas asociadas al cliente/centro (fallback: valor de contrato, indicado como tal) |
| Costo de atención | Egresos del centro de costo: sueldos (liquidaciones pagadas), EPP e insumos (consumos de RF-BOD-04), otros egresos |
| Margen | Ingresos − Costos; margen % = margen / ingresos |
| Ranking | Clientes ordenados por margen del período |

**Endpoints:** `GET /api/v1/analytics/rentabilidad?desde=&hasta=` · `GET /api/v1/analytics/rentabilidad/:centroCostoId/detalle`.
**Criterios:** [ ] Suma de márgenes por centro = utilidad total menos egresos no asignados (mostrar ese remanente como "Gastos generales"). [ ] Clientes en pérdida destacados.

### RF-BI-03 · Análisis de consumo de bodega
**Prioridad:** 🟠 Media-Alta · **Esfuerzo:** M (2 pts) · **Sprint:** 6

| Métrica | Fuente |
|---|---|
| Productos más solicitados | solicitud_items |
| Frecuencia de compra por producto | ordenes_compra |
| Consumo por supervisor / cliente | solicitudes + centros de costo |
| Stock crítico (actual vs mínimo) | productos_bodega |

**Endpoints:** `GET /api/v1/analytics/bodega/top-productos` · `/frecuencia-compra` · `/consumo?agrupar=supervisor|centro_costo` · `/stock-critico`.
**Criterios:** [ ] Datos desde el primer día de uso del flujo nuevo. [ ] Stock crítico coincide con las alertas del dashboard de bodega.

### RF-BI-04 · Productividad de trabajadores/supervisores PEV — 🔒 condicionado a PEV
**Prioridad:** 🟡 Media · **Esfuerzo:** M (2 pts) · **Sprint:** 7
Métricas previstas: tasa de cumplimiento de actividades PEV, sectores con más observaciones, supervisores con mejor seguimiento (verificaciones registradas). Implementar sólo después de RF-PEV-02.

### RF-BI-05 · Predicción de demanda (app de reservas)
**Prioridad:** 🟢 Baja · **Esfuerzo:** L (3 pts) · **Sprint:** 7
| Métrica | Fuente |
|---|---|
| Días / horarios con más reservas | reservas |
| Servicios más populares por temporada | reservas + categorias |
| Proyección de dotación necesaria | reservas futuras vs trabajadores disponibles |

Primero verificar en Fase 0 cuántos datos históricos tiene `reservas`; si son insuficientes, entregar sólo las métricas descriptivas y dejar la proyección desactivada con mensaje explicativo. Es el primer candidato a postergar si falta capacidad.

---

## 11. Requerimientos NO FUNCIONALES

### RNF-SEC-01 · Claves JWT en variables de entorno
**Prioridad:** 🔴 Alta · **Esfuerzo:** S (1 pt)
1. Eliminar todas las claves JWT hardcodeadas (inventario de Fase 0); usar `process.env.JWT_SECRET` (y claves separadas por contexto si hoy son distintas: `JWT_SECRET_ADMIN`, `JWT_SECRET_TRABAJADOR`, etc.).
2. `dotenv` al inicio de la app; crear `.env.example` sin valores reales; `.env` en `.gitignore`.
3. Módulo único `config/auth.js` que exporte secretos y expiración; **el servidor no arranca** si falta un secreto obligatorio.
4. Expiración de tokens: 8 horas (`JWT_EXPIRES_IN=8h`).
5. Mover también credenciales SMTP, BD y Transbank si están hardcodeadas.
6. Advertencia de despliegue: cambiar el secreto invalida sesiones activas → desplegar en ventana de mantenimiento.
**Criterios:** [ ] `grep` no encuentra secretos en el código. [ ] Login y verificación funcionan en todos los contextos. [ ] Token expira a las 8 h.

> Observación de seguridad fuera del backlog: las contraseñas viajan en Base64 antes del servidor. No modificar sin aprobación; documentar en `docs/DECISIONES.md` la recomendación de HTTPS obligatorio.

### RNF-API-01 · Versionado de API
**Prioridad:** 🟡 Media · **Esfuerzo:** M (2 pts)
1. Router `routes/v1/index.js` montado en `/api/v1`.
2. Todos los endpoints nuevos viven ahí. Los endpoints `/api/` existentes siguen funcionando (alias hacia v1 cuando se migren) hasta completar RNF-ARQ-01.
3. Endpoints públicos sin autenticación bajo `/api/v1/public/*`, con rate limiting básico.
4. Documentar endpoints en `docs/API_V1.md` (o OpenAPI si resulta simple).
**Criterios:** [ ] Frontend consume los módulos nuevos desde `/api/v1`. [ ] Ningún consumidor existente se rompe.

### RNF-API-02 · Manejo centralizado de errores
**Prioridad:** 🟠 Media-Alta · **Esfuerzo:** M (2 pts)
1. Clase `AppError(code, message, httpStatus, details)`.
2. `asyncHandler(fn)` para todos los handlers async.
3. Middleware final de errores: mapea `AppError`, errores de validación Sequelize (400), `SequelizeUniqueConstraintError` (409), JWT inválido/expirado (401), no encontrado (404), resto 500.
4. Respuesta en el formato de la sección 2.6; **sin stack trace en producción**; log del error con timestamp, ruta, usuario.
5. Middleware 404 para rutas `/api/v1` inexistentes.
6. Frontend: interceptor HTTP de Angular que muestre `error.message` con SweetAlert2 y redirija a login en 401.
**Criterios:** [ ] Una excepción en un handler async devuelve JSON de error, no cuelga la petición. [ ] Todas las respuestas de error v1 tienen el mismo formato.

### RNF-ARQ-01 · Unificar `/routes/` legacy con `/api/`
**Prioridad:** 🟡 Media · **Esfuerzo:** L (3 pts)
1. Partir del inventario de Fase 0.
2. Migración **incremental, endpoint por endpoint**, priorizando los de los módulos tocados en este proyecto (Caja, Bodega, Facturación, Archivo).
3. Por cada endpoint migrado: test de regresión que compare la respuesta legacy y la nueva para los mismos casos; mantener la ruta legacy al menos 1 semana en producción; documentar rollback.
4. Registrar el avance en `docs/MIGRACION_RUTAS.md` (endpoint, estado, fecha de retiro del legacy).
**Criterios:** [ ] Los endpoints de los módulos del proyecto quedan servidos por `/api/v1`. [ ] Ninguna ruta legacy se elimina sin test de regresión y período de observación.

### RNF-SEC-02 · Trazabilidad / auditoría
**Prioridad:** 🟠 Media-Alta · **Esfuerzo:** M (2 pts)
1. Tabla `auditoria`: `id, usuario_id, contexto_usuario, entidad, entidad_id, accion, valores_antes JSON, valores_despues JSON, motivo, ip, created_at`. (Si MySQL < 5.7, usar `TEXT` con JSON serializado.)
2. Servicio `auditar({...})` invocado dentro de la misma transacción de la operación.
3. Cobertura obligatoria: cajas (cierre/reapertura/recálculo), ingresos/egresos (crear, pagar, anular, editar), liquidaciones (generar, pagar, revertir), bodega (solicitudes, cruce, órdenes, recepción, entrega, ajustes de stock), inicios de sesión (exitosos y fallidos).
4. Endpoint de consulta sólo Admin: `GET /api/v1/auditoria?entidad=&entidad_id=&usuario_id=&desde=&hasta=` paginado.
5. La auditoría no se puede editar ni borrar desde la aplicación.
**Criterios:** [ ] Es posible responder "quién cambió qué y cuándo" para cualquier movimiento de caja o bodega. [ ] Un fallo de auditoría hace rollback de la operación.

### RNF-BI-01 · Rendimiento de dashboards < 2 s
**Prioridad:** 🟡 Media · **Esfuerzo:** M (2 pts)
1. Índices en columnas de filtro: `fecha_pago`, `periodo`, `centro_costo_id`, `estado_pago`, `producto_id`, `created_at`.
2. Vistas SQL para agregaciones; si una consulta supera 500 ms con datos reales, crear tabla de resumen mensual actualizada por `node-cron` (fuera del horario 18:00 de emails).
3. Caché en memoria con TTL de 5 min para endpoints de analytics, invalidada al cerrar caja o pagar movimientos.
4. Frontend: lazy loading del módulo, un endpoint de resumen para la carga inicial y gráficos secundarios cargados después.
5. Medir y registrar tiempos (antes/después) en `docs/RENDIMIENTO.md`.
**Criterios:** [ ] Carga inicial del dashboard financiero y del de bodega < 2 s con el volumen real de datos de producción (copia en ambiente de pruebas).

### RNF-UX-01 · Usabilidad móvil en bodega y BI
**Prioridad:** 🟡 Media · **Esfuerzo:** M (2 pts)
1. Vistas objetivo: home de bodega, formulario de solicitud del supervisor, detalle de solicitud, dashboards BI.
2. Funcionales desde 360 px de ancho; sin scroll horizontal de página (tablas dentro de contenedor con scroll propio o convertidas a tarjetas en móvil).
3. Áreas táctiles ≥ 44 px; formularios con inputs numéricos (`inputmode="numeric"`) y buscador de productos usable con una mano.
4. Gráficos responsivos (`maintainAspectRatio: false` dentro de contenedores con altura definida).
5. Usar el grid de Bootstrap 4 / breakpoints de Angular Material ya presentes; no agregar otro framework CSS.
**Criterios:** [ ] Un supervisor completa una solicitud desde un celular sin zoom. [ ] Los dashboards se leen correctamente en 360 px y 768 px.

---

## 12. Fuera de alcance (no implementar)

- Aplicación móvil nativa nueva (la app existente se mantiene como está).
- Facturación electrónica automática (SII).
- Integración directa con bancos.
- GPS o geolocalización.
- Sistema de remuneraciones (cálculo de sueldos); sólo se agrega el estado de pago a las liquidaciones existentes.
- Cambio de stack o upgrade de versiones mayores (Angular, Sequelize, Express).

---

## 13. Definition of Done (por requerimiento)

Un requerimiento se considera terminado cuando:
1. El código está integrado en la rama principal y pasa las pruebas de regresión.
2. Se cumplen todos sus criterios de aceptación, verificados por el otro integrante del equipo (revisión cruzada).
3. No introduce errores nuevos en módulos ya entregados.
4. Las migraciones tienen `up` y `down` probados en el ambiente de pruebas.
5. Los endpoints nuevos tienen al menos tests de integración para el caso feliz y los errores principales (sugerido: `jest` + `supertest` si el repositorio no tiene framework de tests).
6. Fue demostrado y aceptado por el dueño (Sponsor) en el Sprint Review.

---

## 14. Archivos de documentación que Claude Code debe mantener

| Archivo | Contenido |
|---|---|
| `docs/RECONOCIMIENTO.md` | Resultado de la Fase 0 y mapeo de nombres |
| `docs/DECISIONES.md` | Ambigüedades resueltas y supuestos tomados |
| `docs/API_V1.md` | Endpoints nuevos |
| `docs/MIGRACION_RUTAS.md` | Avance de RNF-ARQ-01 |
| `docs/migracion_caja.md` | Movimientos manuales de déficit detectados (RF-CAJA-01) |
| `docs/PEV_ANALISIS.md` | Análisis previo a la reunión técnica PEV |
| `docs/RENDIMIENTO.md` | Mediciones de RNF-BI-01 |
| `.env.example` | Variables requeridas, sin valores reales |
