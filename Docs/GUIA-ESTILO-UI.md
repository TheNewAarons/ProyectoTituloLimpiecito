# Guía de Estilo UI — Limpiecito ERP (Frontend)

> Fuente: escaneo de `Lim_front/` (Angular 8.0 + Material Dashboard PRO Angular v2.3.0 + Bootstrap 4.3.1 + bootstrap-material-design 4.1.2 + Angular Material 8).
> Regla: **toda pantalla nueva reutiliza estas clases y patrones**. No crear colores, fuentes ni botones paralelos. Cifras de uso = conteo real en `src/app/**/*.html`.

## 1. Stack visual y dónde vive

| Pieza | Ubicación |
|---|---|
| Estilos globales | `src/assets/scss/material-dashboard.scss` (importa `core/`, `dashboard/`) |
| Variables (colores, tipografía, paddings) | `src/assets/scss/core/variables/` (`_colors`, `_brand`, `_type`, `_buttons`, `_card`, `_forms`) |
| CSS extra | `src/assets/css/demo.css`; CSS por componente `*.component.css` |
| Tema Angular Material | `indigo-pink` prebuilt (solo `mat-form-field`, `mat-select`, `mat-checkbox`, `mat-spinner`, `matTooltip`) |
| Íconos | **Material Icons** (`<i class="material-icons">nombre</i>`); FontAwesome solo legado |
| Alertas modal | SweetAlert2 vía `AlertasService` (`src/app/services/alertas/`) |
| Toast | bootstrap-notify vía `AlertasService.showNotification()` |
| Paginación | `ngb-pagination` + `slice` pipe |

Prohibido: nuevas libs de UI, Tailwind, otro tema Material, `!important` nuevo, estilos inline nuevos (ya hay deuda: `style="text-align:center"`, `display:inline-block !important` — usar `text-center` / clases utilitarias).

## 2. Color

Paleta Material (variables SCSS). Colores de marca en uso:

| Rol | Variable | Hex | Uso real |
|---|---|---|---|
| Primario / acento de pantalla | `$brand-rose` | `#e91e63` | **Header de TODA card** (`card-header-rose`, 95 usos) |
| Acción principal / crear / editar | `$brand-warning` | `#ff9800` | Botón `btn-warning btn-sm` (114 usos): Crear, Editar |
| Ver / info | `$brand-info` | `#00bcd4` | Botón ver detalle `btn-info btn-round` (76) |
| Éxito / confirmar | `$brand-success` | `#4caf50` | Guardar, Activar, Ok |
| Peligro / cancelar / eliminar | `$brand-danger` | `#f44336` | Cerrar, Eliminar, Desactivar |
| Primario genérico | `$brand-primary` | `#9c27b0` | Poco uso; no usar como acento de pantalla |
| Texto de error | `.text-danger` | `#f44336` | Validaciones (88 usos) |
| Fondo body | `$body-bg` | `#fafafa` | Global |
| Sidebar | `data-color="azure"` + `data-background-color="black"` | — | `admin-layout.component.html` |
| Gris neutro | `$gray-color` | `#999` | `btn-default`, deshabilitado |

Reglas:
- Header de card: **siempre `card-header-rose`**. `warning/success/info` solo en cards estadísticas (`card-stats`) o KPIs.
- Semántica fija de botón por color (ver §4). No usar `btn-primary` ni `btn-rose` para acciones nuevas salvo el patrón de §4 que ya lo usa.
- Colores de estado (ej. estados de caja, `ANULADA`): usar `.text-danger/.text-success/.text-warning/.text-info` o `badge`. Nunca hex nuevo.
- No agregar hex literales en CSS de componente. Si falta un token, definirlo en `core/variables/`.

## 3. Tipografía

- Familia: **Roboto** (300/400/500/700) vía Google Fonts en `index.html`. Serif (`Roboto Slab`) no se usa.
- Base `1rem`; párrafo `14px`; small `12px`; `h4` card-title `1.125rem`; headings peso 400.
- Pesos: light 300, normal 400, medium 500 (`$font-weight-bold`), 700 (`extra-bold`).
- Títulos de card: `<h4 class="card-title">`. Subtítulo: `.card-category`.
- Textos en español, mayúscula inicial por palabra en títulos y botones (`Cajas Actuales`, `Crear`, `Vista Previa`).
- Alineación: `text-left | text-center | text-right` (Bootstrap). Fechas `dd/MM/yyyy HH:mm` con `date` pipe. Moneda CLP sin decimales (`currency:'CLP':'symbol':'1.0-0'`).

## 4. Botones

Todos llevan `mat-raised-button` (ripple) + clases Bootstrap. Tamaño: `btn-sm` en barras de card; `btn-round` + solo ícono en filas de tabla.

| Acción | Clases | Ícono (`material-icons`) |
|---|---|---|
| Crear / Agregar | `btn btn-warning btn-sm` + `.btn-label` | `add` |
| Editar | `btn btn-warning btn-round` (en fila) | `edit` |
| Ver / Vista previa | `btn btn-info btn-round` | `remove_red_eye` |
| Guardar / Confirmar / Activar | `btn btn-success btn-sm` o `btn-round` | `done`, `save` |
| Cerrar / Eliminar / Desactivar | `btn btn-danger btn-round` | `close`, `delete` |
| Volver | `btn btn-rose btn-sm` o `btn-link` | `arrow_back` |
| PDF / imprimir | `btn btn-danger btn-round` | `picture_as_pdf`, `print` |
| Subir archivo | `btn btn-rose btn-round btn-file` | — |
| Submit login / formulario ancho | `btn btn-success btn-lg btn-block` | — |
| Secundario / terciario | `btn btn-link btn-sm` | — |

Patrón con etiqueta + ícono (barra de card):
```html
<button mat-raised-button matTooltip="Crear Caja" class="btn btn-warning btn-sm" (click)="crear()">
  <span class="btn-label"><i class="material-icons">add</i></span>
  Crear
</button>
```
Patrón de fila (solo ícono, **siempre con `matTooltip`**):
```html
<td class="td-actions text-right">
  <button mat-raised-button type="button" matTooltip="Vista Previa" class="btn btn-info btn-round">
    <i class="material-icons">remove_red_eye</i>
  </button>
</td>
```
Reglas: `type="button"` fuera de forms; `[disabled]` mientras el request está en vuelo; acciones destructivas siempre pasan por confirmación SweetAlert (§8).

## 5. Cards y layout de pantalla

Estructura obligatoria de una vista de listado/ficha:
```html
<div class="main-content">
  <div class="container-fluid">
    <div class="row">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header card-header-rose card-header-icon">
            <div class="card-icon"><i class="material-icons">assignment</i></div>
            <h4 class="card-title">Título De La Pantalla</h4>
            <br />
            <!-- botones de acción (§4) -->
          </div>
          <div class="card-body">
            <div class="table-responsive"> … </div>
          </div>
          <div class="card-footer"> … </div>
        </div>
      </div>
    </div>
  </div>
</div>
```
- Ícono del header: `assignment` por defecto (85 usos); usar otro solo si identifica el módulo (`person`, `list_alt`, `engineering`…).
- Grilla Bootstrap: `col-md-12` listado, `col-md-6` / `col-md-8` formularios. Nada de `float: right` inline; usar `text-right` o `ml-auto`.
- KPIs/resúmenes: `card card-stats` con `card-header-{warning|success|info|rose} card-header-icon`.
- Sidebar: ítems nuevos se agregan en la config de rutas del sidebar (`app/sidebar`), con ícono Material y título en español.

## 6. Tablas

- `<table class="table">` (63 usos); `table-striped` solo si la tabla es larga. Siempre dentro de `.table-responsive`.
- `<th class="text-left">` primera columna, `text-right` columna **Acciones** (última, `td-actions`).
- Vacío: fila con `colspan` y texto `Sin registros`.
- Paginación cliente: `slice: (page-1)*pageSize : (page-1)*pageSize+pageSize` + 
```html
<ngb-pagination [(page)]="page" [pageSize]="pageSize" [collectionSize]="lista?.length" [maxSize]="5" [boundaryLinks]="true"></ngb-pagination>
```
- Montos alineados a la derecha, CLP entero con separador de miles.

## 7. Formularios

- Template-driven: `<form #f="ngForm" (submit)="guardar(f.valid)">` con `mat-form-field class="example-full-width"` + `matInput placeholder="Nombre"` (267 `mat-form-field`).
- Select: `mat-select` / `ngx-mat-select-search` para listas largas. Checkbox: `mat-checkbox`.
- Errores: `<mat-error *ngIf="campo.invalid && campo.touched">` o `<small class="text-danger">`; mensaje en español, concreto (`Ingrese un nombre`).
- Botón submit `btn btn-success`; botón cancelar `btn btn-danger`; ambos al pie, alineados a la derecha.
- Validar también en backend (spec §2.6); el front no es la única barrera.

## 8. Feedback al usuario (usar siempre `AlertasService`)

| Situación | Método |
|---|---|
| Éxito con modal | `alertaExitoMsj(titulo, texto?)` → `icon: success`, botón `btn btn-success`, `Ok` |
| Error con modal | método de error existente → `icon: error`, botón `btn btn-success`, `Ok` |
| Toast breve (login, guardado) | `showNotification(msg)` → top/center, 1 s, `alert-info` |
| Confirmar acción destructiva | `swal.fire({ title:'¿Estas seguro?', icon:'warning', showCancelButton:true, confirmButtonText:'Si, ¡Desactivar!', cancelButtonText:'Cancelar' })` |

Reglas SweetAlert: `buttonsStyling:false`, `customClass.confirmButton:'btn btn-success'`, `cancelButton:'btn btn-danger'`; `allowOutsideClick:false`, `allowEscapeKey:false`. **No** pasar clases a `confirmButtonColor` (bug existente en `afp.component.ts`: recibe `'btn btn-success'`, debe ir en `customClass`). Registros financieros/bodega: texto del botón `Anular`, nunca `Eliminar` (spec: no borrado físico).

Carga: `mat-spinner` o `<app-loading>`; nunca dejar la pantalla sin estado de carga.

## 9. Íconos frecuentes (reusar, no inventar)

`assignment` listado · `add` crear · `edit` editar · `remove_red_eye` ver · `close` cerrar/cancelar · `done` confirmar · `delete` eliminar · `arrow_back` volver · `picture_as_pdf` PDF · `print` imprimir · `person` usuario · `search` buscar · `save` guardar · `lock_outline` contraseña · `account_balance_wallet` caja · `more_time` horas · `list_alt` lista/insumos.

## 10. Checklist para pantalla nueva (Definition of Done UI)

- [ ] Estructura `main-content > container-fluid > card` con `card-header-rose card-header-icon`.
- [ ] Botones según tabla §4, con `matTooltip` en los de solo ícono.
- [ ] Sin hex, fuentes, `!important` ni estilos inline nuevos.
- [ ] Tabla con `.table-responsive`, acciones a la derecha, paginación `ngb-pagination`.
- [ ] Formulario con `mat-form-field` + mensajes de error en español.
- [ ] Confirmación SweetAlert en acciones destructivas; feedback vía `AlertasService`.
- [ ] Probado a 360 px (móvil), 768 px y ≥1200 px.
- [ ] `npx ng lint` y `npx ng build --prod` sin errores nuevos.

## 11. Deuda visual detectada (no replicar)

- Estilos inline repetidos (`text-align:center` ×113, `display:inline-block !important` ×120, `float:right` ×29) → reemplazar por utilidades Bootstrap al tocar el archivo.
- `<table border="1">` (5) y clase `margen`: no usar.
- `confirmButtonColor: 'btn …'` en SweetAlert (ver §8).
- Dos tablas de iconografía mezcladas (FontAwesome CDN `latest` + Material Icons): usar solo Material Icons.
- `data-color` del sidebar `azure` vs acento `rose` en cards: es la combinación vigente, no cambiar sin decisión registrada en `Docs/DECISIONES.md`.
