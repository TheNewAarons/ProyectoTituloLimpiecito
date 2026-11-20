# Catálogo publicable a la web (RF-WEB-01)

Fecha: 2026-11-19 · Autor: Bastián Jofré · Revisión: Aarón Soto · Rama: `feature/RF-WEB-01-catalogo-web-bastian`

El dueño administra desde el ERP (*Página Web → Catálogo*) los productos y servicios que se muestran en la web. Solo lo
publicado aparece en el endpoint público, en el orden que él define. Despublicar no borra nada.

## Modelo

Tabla nueva `catalogo_items` (migración `20261119020439-RF-WEB-01-catalogo-items`), modelo `modelos/sistema_web/Catalogo_item.js`.

| Columna | Tipo | Notas |
|---|---|---|
| `nombre` | `VARCHAR(150)` | Obligatorio. Texto plano (se quita todo HTML) |
| `descripcion` | `TEXT` | Opcional, máx. 2000 caracteres, texto plano |
| `categoria` | `VARCHAR(80)` | Opcional, texto libre (el formulario sugiere las ya usadas) |
| `imagen` | `VARCHAR(255)` | Nombre de archivo (uuid); nunca se expone tal cual |
| `precio` | `DECIMAL(14,0)` | Opcional, CLP entero ≥ 0 |
| `publicado` | `BOOLEAN` | Default `false` (borrador) |
| `orden` | `INT` | Default 0; un ítem nuevo va al final |
| `created_at`, `updated_at` | `DATETIME` | |

**Textos:** se guardan como texto plano real: se quitan las etiquetas y los símbolos `<`, `>`, `"` quedan como tales
(`Descuento > 10%`, no `&gt;`). Si un texto trae una etiqueta escrita como entidades (p. ej. `&lt;script&gt;`), se rechaza con
`400`. Quien consuma el endpoint público debe mostrar los textos escapados (como hace Angular).

Índice `(publicado, orden)` para el listado público. **Independiente** de `productos` (bodega) y de `servicios` (app de reservas):
nunca expone stock, costos ni datos de la app.

## Endpoints

### Administración — `/web-limpiecito/api/v1/web/catalogo` (sesión + rol Administrador)

| Método y ruta | Qué hace |
|---|---|
| `GET /` | Lista todos (también borradores), por `orden` |
| `GET /:id` | Un ítem |
| `POST /` | Crea (multipart si trae `imagen`; JSON si no). Nace en borrador salvo `publicado=true` |
| `PUT /:id` | Edición parcial. `imagen` reemplaza la anterior; `quitar_imagen=true` la quita |
| `DELETE /:id` | **Despublica** (no borra) |
| `PATCH /orden` | `{ "ids": [3, 1, 2] }`: la posición define el orden, en una transacción. Todos los ids deben existir |

Respuesta `{ ok, data, meta }`; errores `{ ok:false, error:{ code, message, details } }`: `400 VALIDATION_ERROR`,
`401` sin sesión, `403` sin rol, `404 NOT_FOUND`, `422 IMAGEN_INVALIDA` / `IMAGEN_DEMASIADO_GRANDE`.

### Público — `GET /web-limpiecito/api/v1/public/catalogo` (sin sesión)

Solo `publicado = true`, ordenado por `orden`. Cada ítem: `id`, `nombre`, `descripcion`, `categoria`, `precio` (número o `null`),
`imagen_url` (ruta servida, o `null`) y `orden`. Cabecera `Cache-Control: public, max-age=60` (despublicar se nota en a lo más
un minuto en clientes con caché). Comparte el rate limit por IP de `/api/v1/public` (RF-WEB-02).

## Imágenes

Se reutiliza `libs/multer_publicaciones.js` de RF-WEB-03 sin modificarlo: jpg/png/webp, máx. 5 MB, extensión según el MIME y
verificación de magic bytes. Se guardan en `uploads_limpiecitoweb/publicaciones/` (misma carpeta que las publicaciones) y se
sirven con `X-Content-Type-Options: nosniff`. No se redimensionan (requeriría la dependencia `sharp`; la spec lo pide "si es posible").

## Frontend

Módulo diferido `Lim_front/src/app/component/catalogo-web/` (ruta `#/pagina_web/catalogo`, menú *Página Web → Catálogo*):
lista con miniatura, precio, interruptor "Web" (publicar/despublicar), flechas ↑/↓ para ordenar y formulario de creación/edición
con imagen. Usable a 360 px (flechas apiladas y precio bajo el nombre en pantallas chicas). Servicio
`services/catalogo-web/catalogo-web.service.ts` (envía `x-access-token`).

## Decisiones

1. Catálogo **nuevo** en vez de reutilizar `servicios` de la app de reservas (evita que editar la web cambie precios/cobros de la app).
2. Vínculo opcional `servicio_id` con la app: **diferido** hasta que el dueño confirme si la web debe mostrar los mismos servicios.
3. Sin redimensionar imágenes (no se agrega `sharp`).
4. Borrar = despublicar (regla 3 de la spec).
5. Categoría como texto libre con sugerencias.

## Pruebas

- `tests/services/web/catalogo.test.js` (validación y proyecciones), `tests/api/catalogo.v1.test.js` (401/403, CRUD, despublicar,
  reordenar, público sin campos internos y con caché), `tests/migraciones/catalogo-items.test.js` (`up` idempotente, reversión).
- Prueba real local: 12/12 por HTTP (incluye imagen real, archivo falso rechazado con 422 y despublicar que oculta al instante) y
  pantalla verificada en Chrome (crear desde el formulario, publicar, ordenar, despublicar; vista a 360 px).

## Despliegue

`db:migrate` antes de reiniciar el backend; backend y front juntos. Sin variables de entorno nuevas.

## RF-WEB-01b · Vínculo con la app de reservas (2026-11-20, AUT-007)

Respuestas del dueño: la web muestra servicios de la app **y** otros; quiere poder ir a reservar en la app; el precio debe
cambiar solo. Rama `feature/RF-WEB-01b-catalogo-app-bastian`.

- **Migración `20261120003306`:** `catalogo_items.servicio_id` opcional, FK a `servicios(id)` con `ON DELETE SET NULL`
  (borrar un servicio de la app solo desvincula el ítem). Ítems existentes quedan sin vínculo.
- **Precio en vivo (D-WEB-01-6):** un ítem vinculado a un servicio **activo** (`servicios.estado = 1`) muestra el precio
  actual de la app en el admin y en la web; si el servicio está inactivo, sin precio y no reservable (el admin ve un aviso).
  Al vincular se borra el precio propio, y un ítem vinculado no acepta precio propio (`400 PRECIO_DESDE_APP`).
  Nombre, descripción, categoría e imagen siguen siendo del catálogo.
- **Público:** solo los ítems vinculados agregan `reservable_en_app` y `reserva_url`; los propios de la web conservan la forma
  de RF-WEB-01. Nunca se exponen `servicio_id` ni el estado interno de la app. **Reservable solo si `APP_RESERVAS_URL` tiene
  un enlace** (D-WEB-01-7): la app móvil aún no está operativa, así que mientras la variable esté vacía nadie ve la opción de
  reservar; el precio en vivo sí se muestra (los servicios se administran en el ERP, *Adm Servicios*).
- **Administración (Admin):** `GET /servicios-app` (id, nombre, precio, activo), `PUT /:id/servicio-app`
  (`{ servicio_id }` o `null`) y `POST /importar-servicio` (`{ servicio_id }`: crea un borrador vinculado copiando nombre,
  descripción e imagen; la imagen se **copia** solo si está en `uploads/` y es una imagen real; la app no se modifica).
  El listado admin trae `servicio_id`, `servicio_app` y `aviso_app`.
- **Pantalla:** selector "Servicio de la app de reservas" en el formulario (precio en solo lectura si está vinculado),
  botón "Importar datos desde la app" al crear, distintivo "App" y aviso en la lista.
- **Variable nueva:** `APP_RESERVAS_URL` (opcional). Pendiente: conseguir el enlace de la app (tienda o página de descarga).
- **Despliegue:** `db:migrate` (requiere que la migración `RF-PEV-02b` aplique antes: si falla, se detiene la cadena).
