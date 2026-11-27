# Plan de pruebas de aceptación — Pauta de requerimientos funcionales

Paso a paso para demostrar cada ítem de la *Pauta de acuerdo de requerimientos funcionales* (RF-001 … RF-018, atomizados).
Según el Acta (condición 3), un requerimiento se considera cumplido cuando **existe evidencia verificable y se satisface su
criterio de aceptación**: cada ficha copia el criterio de la pauta, dice qué datos preparar, los pasos y qué evidencia guardar.

> Las pruebas T1–T9 del modelo de bodega (kardex, recepción, conteo, concurrencia) están en `Docs/evidencias-pruebas/` (QA-01,
> PR #73). Aquí se referencian cuando cubren un criterio de la pauta.

## 1. Preparación

**Código a probar:** `develop` actualizado (incluye kardex, recepciones con documento, conteo físico y BI-04):
`git switch develop && git pull`. Luego, **solo en la BD local**, aplicar las migraciones nuevas:
`cd limpi_back && npx sequelize-cli db:migrate` (kardex valorizado con saldo inicial, recepciones de compra y conteo físico).

**Entorno:** copia local de la BD (nunca producción), backend `limpi_back` (`node index.js`, puerto 3000) y front `Lim_front`
(`npx ng serve`, puerto 4200; con Node moderno: `NODE_OPTIONS=--openssl-legacy-provider`). Para que no se envíen correos reales,
dejar las variables `SMTP_*` vacías en el `.env` local (el envío falla de forma controlada) o usar un SMTP de pruebas.

**Datos de prueba** (`limpi_back/scripts/datos-prueba.js`, se niega a correr si la BD no es local). Desde `limpi_back/`:

```bash
export CLAVE_PRUEBA='elija-una-clave-local'          # no se guarda en el repo; mínimo 8 caracteres
export PERMITIR_DATOS_PRUEBA=1                       # confirmación explícita de que la BD es local y desechable
node scripts/datos-prueba.js base     # cuentas de prueba, supervisor, proveedor y productos del escenario de bodega
node scripts/datos-prueba.js bi       # datos de demostración para los dashboards BI-03 y BI-04
node scripts/datos-prueba.js limpiar  # al terminar: cuentas inactivas, bodega anulada, demo BI retirada
```

| Cuenta | Rol / uso | Correo |
|---|---|---|
| Administrador | ERP completo | `admin.prueba@local.test` |
| Operaciones | Bodega y BI-03/BI-04, sin datos financieros | `operaciones.prueba@local.test` |
| Supervisor | App laboral (acceso laboral tipo 1), 1 centro de costo asignado | `supervisor.prueba@local.test` |

`base` también crea el **Proveedor Prueba** (`proveedor.prueba@local.test`) y los productos **PRUEBA A/B/C/D** con stock
**10/8/3/0** (criterio de RF-004). Volver a correr `base` reinicia ese stock para repetir la prueba; como ese reinicio no pasa
por el kardex, el siguiente movimiento de esos productos deja un AJUSTE "Descuadre detectado" en su kardex (esperado, no es
error). Para una captura limpia del kardex, tomarla en la primera pasada.

**Pruebas por API.** Algunas funciones no tienen pantalla en el ERP (se indica en cada ficha). Con el backend corriendo:

```bash
API=http://localhost:3000/web-limpiecito/api/v1
TOKEN=$(node scripts/datos-prueba.js token admin)        # o: operaciones | supervisor
curl -s -H "x-access-token: $TOKEN" $API/bodega/dashboard
```

**Pruebas automatizadas:** `cd limpi_back && npx jest <archivo>`; la salida del comando sirve como evidencia.

**Evidencias:** capturas de pantalla o salida de terminal, nombradas `RF-XXX_N.png` / `RF-XXX_N.txt`. La BD local puede
contener datos reales: **no subir capturas con datos reales al repositorio** (es público); guardarlas en la carpeta compartida del equipo
y adjuntarlas a la pauta (columna K).

**Estados de una ficha:** ⬜ por ejecutar · ✅ cumple · ⚠️ cumple con observación · ❌ no cumple.

## 2. Resumen

| ID | Requerimiento | Tipo de prueba | Datos | Resp. | Estado |
|---|---|---|---|---|---|
| RF-001 | Caja: traspaso de saldo entre meses | Pantalla + tests | Clon | Aarón | ⬜ |
| RF-002 | Caja: estado de pago en liquidaciones | Pantalla + tests | Clon | Aarón | ⬜ |
| RF-003 | Bodega: solicitud del supervisor | API (supervisor) + pantalla (admin) | `base` | Bastián | ✅ API 2026-11-21 |
| RF-004 | Bodega: cruce solicitud vs stock | API + tests de concurrencia | `base` | Aarón | ✅ 2026-11-21 |
| RF-005.1–.4 | Bodega: proveedores (crear, listar, editar, desactivar) | API | `base` | Aarón | ⬜ |
| RF-005.5 | Bodega: orden de compra y envío | API + pantalla | `base` | Aarón | ⬜ |
| RF-006 | Bodega: recepción y stock | Pantalla | `base` | Bastián | ⬜ |
| RF-007 | Bodega: dashboard de inicio | Pantalla | `base` + `bi` | Bastián | ⬜ |
| RF-008 | Facturación: estado de pago | API + tests | Clon | Aarón | ⬜ |
| RF-009.1–.6 | Web: catálogo | Pantalla + API pública | — | Bastián | ⬜ |
| RF-010.1–.4 | Web: documentos PDF | Pantalla + API pública | 3 PDF | Aarón | ⬜ |
| RF-011.1–.4 | Web: anuncios | API (sin pantalla v1) + tests | — | Aarón | ⬜ |
| RF-012 | PEV: asignación masiva | Pantalla | Clon | Bastián | ⬜ |
| RF-013 | PEV: 1 actividad → N trabajadores | API + tests | Clon | Aarón | ⬜ |
| RF-014 | BI: dashboard financiero | Pantalla + tests | Clon | Aarón | ⬜ |
| RF-015 | BI: rentabilidad | Pantalla + tests | Clon | Aarón | ⬜ |
| RF-016 | BI: consumo de bodega | Pantalla | `bi` | Bastián | ⬜ |
| RF-017 | BI: productividad PEV | Pantalla | `bi` | Bastián | ⬜ |
| RF-018 | BI: predicción de demanda | — | — | Bastián | ❌ sin implementar (en espera) |

Responsable = quien implementó el requerimiento; cualquiera del equipo puede ejecutar la ficha.

## 3. Fichas

### RF-001 · Caja – Traspaso automático de saldo entre meses (RF-CAJA-01)
**Criterio:** si el mes anterior cerró en −$2.000.000, el mes nuevo muestra ese saldo inicial sin ingreso manual; al modificar
un mes cerrado y volver a cerrarlo, los meses posteriores se recalculan.
**Datos:** clon (cajas mensuales existentes). Cuenta Administrador.
1. *Caja Mensual* → abrir el último mes cerrado y anotar su saldo final (captura).
2. Abrir el mes siguiente: el saldo inicial es igual al saldo final del paso 1 y no hay ingreso manual que lo explique (captura).
3. Volver al mes cerrado → **Reabrir mes** (solo Admin), registrar un egreso de prueba y **Cerrar mes**.
4. Abrir el mes siguiente: su saldo inicial cambió en el monto del egreso (recálculo en cascada) (captura).
5. Con una cuenta que no sea Administrador, comprobar que no aparece *Reabrir mes* o que la API responde 403
   (`POST $API/cajas/<YYYY-MM>/reabrir`).
6. Automatizado: `npx jest tests/services/caja tests/api/cajas.v1.test.js` (incluye el caso de saldo negativo).
**Evidencia:** capturas 1–4 y salida de los tests. **Limpieza:** anular el egreso de prueba y volver a cerrar el mes.

### RF-002 · Caja – Estado de pago en liquidaciones de sueldo (RF-CAJA-02)
**Criterio:** generar una liquidación no altera el saldo ni la utilidad; marcarla pagada el día 5 del mes siguiente crea el
egreso en ese mes; el pago en lote se aplica a todas o a ninguna.
**Datos:** clon. Cuenta Administrador.
1. Anotar saldo y utilidad del mes en *Caja Mensual* (captura).
2. *Colaborador → Liquidaciones*: generar una liquidación; queda **En espera**. Volver a *Caja Mensual*: saldo y utilidad
   no cambiaron (captura).
3. *Colaborador → Liquidaciones* → **Marcar como pagada** con fecha día 5 del mes siguiente: el egreso aparece en ese mes, no en
   el de la liquidación (captura de ambos meses).
4. Seleccionar varias liquidaciones → **Pagar seleccionadas**: todas quedan pagadas. Repetir incluyendo una ya pagada o con
   un dato inválido: no se paga ninguna (captura del mensaje).
5. Automatizado: `npx jest tests/services/liquidaciones tests/api/liquidaciones.v1.test.js`.
**Limpieza:** **Revertir pago** en las liquidaciones de prueba.

### RF-003 · Bodega – Solicitud de insumos y EPP por supervisor (RF-BOD-01)
**Criterio:** un supervisor crea desde un celular una solicitud con varios productos, que queda visible para el administrador
sin pasos manuales; no puede ver solicitudes de otros supervisores.
**Datos:** `base`. Cuentas Supervisor y Administrador.
> El supervisor ingresa por la **app laboral**, que no está en este repositorio (pendiente en `Docs/bodega-solicitudes.md`).
> La API que usa esa app sí está aquí y es la que se prueba; el formulario equivalente del ERP se prueba en ancho de celular.
1. `TS=$(node scripts/datos-prueba.js token supervisor)`; `curl -s -H "x-access-token: $TS" $API/bodega/centros-costo/permitidos`
   → aparece solo su centro de costo.
2. `curl -s -H "x-access-token: $TS" $API/bodega/productos/solicitables` → catálogo sin stock ni costos.
3. Crear la solicitud con varios productos (`POST $API/bodega/solicitudes`, cuerpo
   `{"centro_costo_id":<id>,"items":[{"producto_id":<id>,"cantidad":2},{"producto_id":<id>,"cantidad":1}]}`) → **201**.
4. `GET $API/bodega/solicitudes/mias` con el token del supervisor → aparece la suya.
5. `GET $API/bodega/solicitudes` (listado de gestión) con el token del supervisor → **403**: no ve las de otros.
6. Iniciar sesión como Administrador → *Bodega → Solicitudes*: la solicitud aparece sin pasos manuales (captura).
7. Formulario del ERP en celular: *Bodega → Solicitudes → Nueva* con el navegador en modo dispositivo (360 px): se puede
   completar sin scroll horizontal (captura).
8. Automatizado: `npx jest tests/api/bodega.v1.test.js tests/services/bodega/solicitudes.test.js`.
**Resultado 2026-11-21 (local):** pasos 1–5 ✅ (201 al crear; 403 en el listado de gestión).

### RF-004 · Bodega – Cruce automático solicitud vs stock (RF-BOD-02)
**Criterio:** con stock A=10, B=8, C=3, D=0 y pedido 12, 5, 4, 20, el sistema indica comprar 2, 0, 1 y 20, y el stock queda
en A=0, B=3, C=0, D=0, sin negativos ante solicitudes simultáneas.
**Datos:** `base` (productos PRUEBA A–D con 10/8/3/0; correr `base` de nuevo antes de repetir).
1. Como supervisor crear la solicitud **PRUEBA A=12, B=5, C=4, D=20** (paso 3 de RF-003).
2. `GET $API/bodega/solicitudes/<id>` (Administrador): asignado/faltante = A 10/2, B 5/0, C 3/1, D 0/20; estado **PARCIAL**.
3. `GET $API/bodega/lista-compra`: comprar **A=2, C=1, D=20** (B no aparece porque no falta), agrupado por proveedor.
4. Stock final en *Bodega → Producto EPP* (o `GET $API/bodega/dashboard`): **A=0, B=3, C=0, D=0**.
5. Concurrencia: `npx jest tests/services/bodega/cruceStock.concurrencia.test.js tests/services/bodega/cruceStock.test.js`;
   en MySQL real, T1/T1b de QA-01 (`Docs/evidencias-pruebas/`): solicitudes simultáneas sin stock negativo.
**Resultado 2026-11-21 (local):** ✅ asignado A10 B5 C3 D0; faltantes 2/0/1/20; lista de compra A=2, C=1, D=20; stock final
A=0, B=3, C=0, D=0.

### RF-005.1 a RF-005.4 · Bodega – Proveedores (RF-BOD-03)
**Criterios:** (.1) un proveedor creado queda disponible para órdenes de compra; (.2) el listado muestra los activos y permite
ver su detalle; (.3) al editar el correo, las siguientes órdenes se envían al correo nuevo; (.4) un proveedor desactivado no
aparece para nuevas órdenes y sus órdenes anteriores se conservan.
> Sin pantalla de mantención en el ERP: se prueba por API (Administrador u Operaciones).
1. **.1** `POST $API/bodega/proveedores` `{"nombre":"Proveedor Ficha","email":"ficha@local.test"}` → 201 con `id`.
2. **.2** `GET $API/bodega/proveedores?activo=1` lo lista; `GET $API/bodega/proveedores/<id>` muestra el detalle.
3. **.3** `PATCH $API/bodega/proveedores/<id>` `{"email":"ficha2@local.test"}`; generar y enviar una orden de ese proveedor
   (RF-005.5): `enviada_a_email` es el correo nuevo.
4. **.4** Baja lógica con motivo y código (D-188): `POST $API/bodega/proveedores/<id>/estado/codigo` `{"activo":0,"motivo":"ya no vende"}`
   → llega el código al correo; `POST $API/bodega/proveedores/<id>/estado` `{"activo":0,"codigo":"<6 dígitos>"}` → ya no aparece con
   `activo=1`; las órdenes anteriores siguen en `GET $API/bodega/ordenes-compra/<id_orden>`. `DELETE $API/bodega/proveedores/<id>` → 410
   `RUTA_REEMPLAZADA`. En el ERP: Proveedores → botón desactivar/activar y botón Historial (Administrador).
5. Automatizado: `npx jest tests/services/bodega/proveedores.test.js tests/services/bodega/proveedorProducto.test.js`.

### RF-005.5 · Bodega – Generar y enviar orden de compra (RF-BOD-03)
**Criterio:** con un clic se envía el correo al proveedor con el detalle correcto; la orden queda registrada con estado, fecha
y destinatario; un fallo de envío no la marca como enviada.
**Datos:** `base` + lista de compra de RF-004.
1. `POST $API/bodega/ordenes-compra/desde-lista` → crea una orden por proveedor (Proveedor Prueba: A=2, C=1, D=20) en BORRADOR.
2. *Bodega → Órdenes de compra*: la orden aparece con su detalle (captura).
3. **Enviar** (`POST $API/bodega/ordenes-compra/<id>/enviar`) con SMTP de pruebas → estado **ENVIADA**, fecha y destinatario
   registrados (captura del correo recibido).
4. Con SMTP sin configurar, enviar otra orden → error y la orden **sigue en BORRADOR**.
5. Automatizado: `npx jest tests/services/bodega/ordenesCompra.test.js tests/services/bodega/correoOrdenCompra.test.js`.

### RF-006 · Bodega – Recepción y actualización automática de stock (RF-BOD-04)
**Criterio:** al confirmar la recepción el stock se actualiza sin carga manual; al entregar se imprime el formato de entrega y
el centro de costo refleja el consumo con su costo.
**Datos:** orden ENVIADA de RF-005.5 y la solicitud PARCIAL de RF-004.
1. *Bodega → Órdenes de compra* → abrir la orden → **recepción parcial** (ej. A=2, C=1, D=10) indicando **Documento**
   (factura/guía), **N° Documento** y el **costo real** de cada línea si difiere del de la OC (captura).
2. En *Recepciones De La Orden* queda la recepción con su documento, fecha y costo unitario (captura).
3. El stock sube sin carga manual y lo recibido se asigna a la solicitud pendiente más antigua; con todo cubierto pasa a
   **LISTA_ENTREGA** (captura de la solicitud).
4. Recibir el resto en una **segunda recepción con otro costo** → orden **RECIBIDA**; quedan dos recepciones listadas.
5. *Bodega → Solicitudes* → solicitud → **Entregar** → **Formato de entrega** imprimible (captura / PDF).
6. *Centro Costos* → centro de la solicitud: aparece el consumo con su costo (captura).
7. *Bodega → Movimientos* → filtrar un producto (ej. PRUEBA A) → botón del ojo **Ver Kardex Valorizado**: entradas de compra con
   su costo, salidas de la solicitud, y Stock / Saldo Valorizado por fila (captura).
8. Automatizado: `npx jest tests/api/bodega.recepcion.v1.test.js tests/services/bodega/recepcion.test.js tests/services/bodega/entrega.test.js tests/services/bodega/kardex.test.js`;
   costo real y reversas en MySQL: T2/T3 de QA-01.

### RF-007 · Bodega – Dashboard de inicio de bodega (RF-BOD-05)
**Criterio:** al entrar a Bodega se muestra el panel en lugar del listado de productos; los contadores coinciden con los datos
reales y los productos bajo stock mínimo se destacan.
**Datos:** `base` + `bi` (deja 4 productos bajo su mínimo).
1. Menú *Bodega*: abre *Inicio Bodega* con los 4 bloques (captura).
2. Comparar los contadores con la BD (o con los listados): solicitudes activas por estado, lista de compra, órdenes en tránsito.
3. Los productos bajo mínimo aparecen destacados; editar el mínimo de uno desde el panel y ver que sale/entra de la alerta.
4. Automatizado: `npx jest tests/api/bodega.dashboard.v1.test.js tests/services/bodega/dashboard.test.js`; tiempos: T9 de QA-01.

### RF-008 · Facturación – Estado de pago en facturas (RF-FAC-01)
**Criterio:** una factura pendiente no aparece en el saldo de caja hasta marcarse pagada; ya no se requiere un egreso
compensatorio y la anulación reemplaza a la eliminación.
> Pago / anulación sin pantalla propia: se prueba por API (Administrador).
1. Anotar el saldo del mes; `GET $API/ingresos` y elegir una factura **pendiente**: no está en el saldo (captura).
2. `PATCH $API/ingresos/<id>/pagar` con cuerpo `{"fecha_pago":"YYYY-MM-DD"}` (sin él usa la fecha de hoy) → el saldo del mes de pago sube en su monto.
3. `PATCH $API/ingresos/<id>/revertir` → vuelve a pendiente y sale del saldo.
4. `PATCH $API/egresos/<id>/anular` → queda ANULADA (no se borra) y no afecta la caja.
5. `GET $API/facturas/resumen` refleja los cambios.
6. Automatizado: `npx jest tests/api/facturas.v1.test.js tests/services/facturas/pago.test.js tests/services/caja/saldo.estado-pago.test.js`.

### RF-009.1 a RF-009.6 · Web – Catálogo de productos y servicios (RF-WEB-01)
**Criterios:** (.1) un ítem creado queda con su imagen; (.2) al editar uno publicado la web muestra los datos nuevos sin tocar
código; (.3) uno eliminado deja de aparecer en el ERP y en la web; (.4) al cambiar el orden la web lo refleja; (.5) publicado
aparece y al despublicar se oculta de inmediato; (.6) la web muestra los publicados y no expone stock ni costos.
**Datos:** una imagen JPG/PNG < 5 MB. Cuenta Administrador. "La web" = `GET $API/public/catalogo` (sin token), que consume el sitio.
1. **.1** *Página Web → Catálogo* → nuevo ítem con nombre, descripción e imagen (captura).
2. **.5/.6** Publicarlo → aparece en `curl -s $API/public/catalogo`; revisar que no trae stock, costos ni ids internos.
3. **.2** Editarlo → el JSON público muestra los datos nuevos.
4. **.4** Cambiar el orden de dos ítems → el JSON público respeta el orden nuevo.
5. **.5** Despublicarlo → desaparece del JSON público de inmediato (el servidor no lo entrega; un navegador puede tener caché de
   hasta 60 s, D-WEB-01-5).
6. **.3** Eliminarlo (baja = despublicar, D-WEB-01-4) → deja de aparecer en la lista del ERP y en la web.
7. Automatizado: `npx jest tests/api/catalogo.v1.test.js tests/services/web/catalogo.test.js`.

### RF-010.1 a RF-010.4 · Web – Documentos PDF (RF-WEB-02)
**Criterios:** (.1) se suben al menos 3 PDF y un no-PDF se rechaza; (.2) al reemplazar el archivo la descarga entrega la versión
nueva; (.3) uno eliminado deja de estar en el ERP y en la web; (.4) los públicos se descargan desde la web y uno no público no
se puede descargar aunque se conozca su id.
**Datos:** 3 PDF pequeños y un archivo `.txt` renombrado a `.pdf`.
1. **.1** *Archivo → Documentos*: subir los 3 PDF (captura); subir el falso PDF → rechazado (captura del error).
2. **.4** *Archivo → Documentos Públicos*: marcar 2 como públicos → `curl -s $API/public/documentos` lista solo esos;
   `curl -o x.pdf $API/public/documentos/<id_publico>/descargar` descarga; con el id del no público → error sin descarga.
3. **.2** Reemplazar el archivo de uno público → la descarga entrega el nuevo (comparar tamaño o contenido).
   ⚠️ Por confirmar: no se encontró en *Archivo* una acción explícita de "reemplazar archivo"; revisar si la edición del
   documento permite subir uno nuevo antes de ejecutar este paso.
4. **.3** Eliminar uno → desaparece del ERP y de `$API/public/documentos`.
5. Automatizado: `npx jest tests/api/documentos-publicos.v1.test.js` (el test de symlink de `tests/archivos` falla solo en Windows).

### RF-011.1 a RF-011.4 · Web – Anuncios (RF-WEB-03)
**Criterios:** (.1) un anuncio queda con fechas de publicación y expiración; (.2) al editar uno vigente la web muestra el nuevo
contenido; (.3) uno eliminado deja de mostrarse; (.4) aparece al llegar su fecha y desaparece al expirar; el HTML malicioso se
sanitiza.
> La pantalla *Página Web → Anuncios* administra las **publicaciones v1** (`/api/v1/web/publicaciones`, solo Administrador):
> se puede probar desde la pantalla (crear con fecha de expiración y ver el estado Vigente → Expirado) o por API. La web
> pública lee `GET /anuncios_web/obtener_anuncio/obtener/`, que ya entrega solo las vigentes. Campos: `titulo`, `cuerpo`, `fecha_publicacion`, `fecha_expiracion`
> (ISO 8601 con zona), `publicado` y la imagen opcional en `imagen` (multipart).
1. **.1** Crear con fecha de expiración en 5 minutos:
   `curl -s -X POST -H "x-access-token: $TOKEN" -F titulo='Anuncio prueba' -F cuerpo='Texto' -F publicado=true -F fecha_publicacion=<ahora con zona, ej. 2026-11-21T12:00:00-03:00> -F fecha_expiracion=<ahora+5min con zona> -F imagen=@anuncio.jpg $API/web/publicaciones`
   → 201 con sus fechas (captura).
2. **.4** `curl -s $API/public/publicaciones` (sin token) lo muestra; pasada la expiración ya no aparece. Crear otro con
   `fecha_publicacion` futura: no aparece hasta esa hora.
3. **.2** `PUT $API/web/publicaciones/<id>` con otro `cuerpo` → el JSON público trae el texto nuevo.
4. **.4** Crear uno con `<script>alert(1)</script>` y un `onclick` en el `cuerpo` → el JSON público lo trae sin esas partes.
5. **.3** `DELETE $API/web/publicaciones/<id>` (despublica) → deja de mostrarse.
6. Automatizado: `npx jest tests/api/publicaciones.v1.test.js tests/api/publicaciones-vigencia-xss.v1.test.js` (8 vectores XSS).

### RF-012 · PEV – Asignación masiva de actividades (RF-PEV-01)
**Criterio:** asignar una actividad a 10 trabajadores se realiza en una sola acción y no se generan asignaciones duplicadas.
**Datos:** clon (clientes, turnos, áreas y trabajadores PEV). Cuenta Administrador.
1. *Asignación PEV* → elegir cliente, actividad (o crear una nueva) y turno; marcar **10 trabajadores** y "Aplicar a todos" un área.
2. **Vista previa**: 10 filas *Crear* (captura) → **Confirmar** → "10 asignaciones creadas" (captura).
3. Repetir exactamente la misma selección → la vista previa marca las 10 como *Ya asignada* y al confirmar no crea ninguna.
4. Automatizado: `npx jest tests/services/pev/asignacion-masiva.test.js tests/api/pev-masiva.v1.test.js`.
**Limpieza:** anular las asignaciones de prueba (`PATCH $API/pev/asignaciones/<id>/anular`).

### RF-013 · PEV – 1 actividad para N trabajadores (RF-PEV-02)
**Criterio:** pasar de 10 a 9 trabajadores en una actividad solo elimina una asignación y el historial de cumplimiento previo se
conserva.
**Datos:** las 10 asignaciones de RF-012.
1. `GET $API/pev/asignaciones?actividad_id=<id>` → 10 asignaciones activas.
2. Cerrar una (`PATCH $API/pev/asignaciones/<id>/cerrar`) → quedan 9 activas; la actividad no se recreó (mismo `actividad_id`).
3. `GET $API/pev/asignaciones/<id_cerrada>/cumplimiento` → el historial previo sigue disponible.
4. Automatizado: `npx jest tests/services/pev tests/api/pev.v1.test.js tests/api/pev-laboral.v1.test.js tests/migraciones/pev-02a-esquema.test.js tests/migraciones/pev-02b-backfill.test.js`.

### RF-014 · BI – Dashboard financiero (RF-BI-01)
**Criterio:** se visualizan al menos 5 KPI; la utilidad calculada coincide con la caja del mes y, con menos de 3 meses de
historia, la proyección indica "datos insuficientes".
1. *Analytics → Dashboard financiero*: contar los KPI visibles (≥ 5) (captura).
2. Comparar la utilidad del mes con *Caja Mensual* del mismo mes (captura de ambos).
3. Datos insuficientes: `npx jest tests/services/analytics/financiero.test.js tests/api/analytics-financiero.v1.test.js` (caso
   con menos de 3 meses).

### RF-015 · BI – Rentabilidad por cliente / centro de costo (RF-BI-02)
**Criterio:** la suma de márgenes por centro más los gastos generales no asignados coincide con la utilidad total, y los
clientes en pérdida se destacan.
1. *Analytics → Rentabilidad por cliente* (últimos 3 meses): sin alerta de "no cuadra" (captura).
2. Comprobar Σ márgenes − gastos generales = utilidad total en los KPI; los clientes en pérdida aparecen en rojo.
3. Automatizado: `npx jest tests/services/analytics/rentabilidad.test.js`.

### RF-016 · BI – Análisis de consumo de bodega (RF-BI-03)
**Criterio:** los indicadores muestran datos desde el primer día de uso del nuevo flujo de bodega, y el stock crítico coincide
con las alertas del dashboard de bodega.
**Datos:** `bi`. Cuenta Administrador u Operaciones.
1. *Analytics → Consumo de bodega* (6 meses): KPI, consumo mensual, ranking, consumo por supervisor / centro de costo,
   frecuencia de compra (captura).
2. Ampliar el período desde el mes de la primera solicitud del flujo nuevo: aparecen desde ese mes.
3. Comparar *Stock crítico* con las alertas de *Inicio Bodega* (RF-007): mismos productos (captura de ambos).
4. Automatizado: `npx jest tests/services/analytics/bodega.test.js tests/api/analytics-bodega.v1.test.js`.

### RF-017 · BI – Productividad PEV (RF-BI-04)
**Criterio:** el panel muestra el porcentaje de cumplimiento por trabajador y supervisor para un período, coincidente con los
registros de chequeo PEV.
**Datos:** `bi`. Cuenta Administrador u Operaciones.
1. *Analytics → Productividad PEV* (3 meses): cumplimiento por trabajador, ranking de supervisores, sectores con observaciones (captura).
2. Coincidencia: para un trabajador, contar en *Cronograma → listas PEV* sus pasos marcados y dividir por (tareas × 3); debe
   coincidir con su %. Igual para un supervisor con las rondas verificadas.
3. Filtros de período, cliente y supervisor; exportar una tabla a CSV y abrirla en Excel (captura).
4. Automatizado: `npx jest tests/services/analytics/productividad.test.js tests/api/analytics-productividad.v1.test.js`
   (PR #76).

### RF-018 · BI – Predicción de demanda de la app de reservas (RF-BI-05)
**Criterio:** se muestran las métricas descriptivas de reservas; si el historial es insuficiente, la proyección se desactiva
con un mensaje explicativo.
**Estado:** ❌ sin implementar. Plan aprobado en espera; la app de reservas aún no está operativa (D-WEB-01-7). Al
implementarlo, la proyección debe desactivarse con un mensaje cuando el historial no alcance.

### Anexo · Bodega – Conteo físico (RF-BOD-07, fuera de la pauta)
Complementa RF-006/RF-007: corrige diferencias entre el stock del sistema y el físico, siempre vía kardex.
**Datos:** `base`. Cuentas Operaciones (captura) y Administrador (aprueba).
1. Operaciones: *Bodega → Conteos Físicos* → **nuevo conteo** (observación opcional) → abrir con **Ver / Contar**.
2. Ingresar *Contado* para PRUEBA A–D poniendo una diferencia (ej. B: teórico 3, contado 2) con su *Motivo* → **Guardar**
   (captura con la columna Diferencia). Operaciones no ve el botón de aprobar.
3. Administrador: abrir el conteo → **Aprobar** → estado aprobado y exactitud en el listado (captura).
4. Kardex de PRUEBA B (paso 7 de RF-006): aparece un **AJUSTE** de −1 y el stock queda en 2 (captura).
5. Otro conteo → **Anular**: no genera movimientos.
6. Automatizado: `npx jest tests/services/bodega/conteos.test.js tests/api/bodega.conteos.v1.test.js`; en MySQL: T5 de QA-01.

## 4. Brechas y observaciones para la pauta

- **RF-003:** la pantalla del supervisor vive en la app laboral (fuera de este repo); se prueba su API y el formulario del ERP en
  ancho de celular.
- **RF-005.1–.5 y RF-008:** sin pantallas de mantención en el ERP para proveedores, lista de compra y pago/anulación de facturas;
  la evidencia es por API. Si el docente exige pantalla, es trabajo adicional.
- **RF-011:** la pantalla de anuncios del ERP sigue en la ruta legacy; las publicaciones v1 (vigencia y sanitización) solo
  tienen API. Para demostrarlo en pantalla habría que conectar esa vista a `/api/v1/web/publicaciones` (cambio con AUT).
- **RF-018:** sin implementar.
- **Develop hoy:** `tests/api/analytics.v1.test.js` falla 1/25 hasta que se registre la autorización propuesta en el PR #65 para ajustar su línea 84.
