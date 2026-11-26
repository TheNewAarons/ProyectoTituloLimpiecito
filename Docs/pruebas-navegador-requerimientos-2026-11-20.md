# Pruebas de requerimientos funcionales desde el navegador (2026-11-20)

Prueba manual de los 18 requerimientos de la pauta `Pauta_Acuerdo_Requerimientos_Funcionales_Limpiecito.xlsx`, ejecutada como usuario final desde el navegador sobre el entorno local. Cuando un criterio no tenía pantalla, se verificó contra la API `/api/v1` y/o la base de datos, y así se indica.

## Entorno

| Elemento | Valor |
|---|---|
| Frontend | Angular 8, `http://localhost:4200` (rutas con hash) |
| Backend | Express, `http://localhost:3000/web-limpiecito`, `TRANSBANK_ENV=integration`, sin SMTP configurado |
| Base de datos | MySQL local `aseolimp_minda_oficial09` |
| Usuario | `admin@limpiecito.com` (Administrador). RF-003 también con el usuario Supervisor de la intranet |
| Código probado | RF-001 a RF-011 sobre `feature/RF-BI-02-rentabilidad-cliente-aaron`; RF-012 a RF-018 sobre `fix/conflictos-main-develop-aaron` (el repositorio cambió de rama durante la prueba) |

Producción no se tocó. No se modificó código fuente.

## Resumen

| RF | Código | Resultado | Verificado en |
|---|---|---|---|
| RF-001 | CAJA-01 Saldo encadenado | ✓ Funciona | UI + BD |
| RF-002 | CAJA-02 Liquidaciones en mes de pago | ✓ Funciona | UI + BD |
| RF-003 | BOD-01 Solicitud de bodega | ⚠️ Parcial | UI |
| RF-004 | BOD-02 Cruce con stock | ✓ Funciona | UI + BD |
| RF-005 | BOD-03 Orden de compra | ✗ No funciona desde la UI | UI + API |
| RF-006 | BOD-04 Recepción y entrega | — No testeable | — |
| RF-007 | BOD-05 Dashboard de bodega | ✓ Funciona | UI |
| RF-008 | FAC-01 Facturas pendientes/vencidas | ✗ No funciona | UI + BD |
| RF-009 | WEB-01 Catálogo web | ✓ Funciona | UI + API pública |
| RF-010 | WEB-02 Documentos públicos | ✓ Funciona | UI + API pública |
| RF-011 | WEB-03 Anuncios | ✓ Funciona (solo API) | API |
| RF-012 | PEV-01 Asignación masiva | ✓ Funciona | UI + API + BD |
| RF-013 | PEV-02 Escalabilidad 1 tarea → N trabajadores | ✓ Funciona (solo API) | API + BD |
| RF-014 | BI-01 Dashboard financiero | ✓ Funciona | UI + BD |
| RF-015 | BI-02 Rentabilidad por cliente | ✓ Funciona | UI |
| RF-016 | BI-03 Consumo de bodega | ⚠️ Parcial | UI + API + BD |
| RF-017 | BI-04 Productividad PEV | — No implementado | — |
| RF-018 | BI-05 Predicción de demanda | — No implementado | — |

Totales: 11 funcionan, 2 parciales, 2 no funcionan, 1 no testeable, 2 no implementados.

---

## Detalle por requerimiento

### RF-001 · CAJA-01 Saldo encadenado — ✓

**Qué se probó**
1. En Caja Mensual se reabrió la caja de septiembre 2026. El sistema exigió un motivo antes de reabrir.
2. Se modificó un movimiento de septiembre y se volvió a cerrar.
3. Se revisó octubre.

**Resultado**
- El saldo final de septiembre pasó como saldo inicial de octubre.
- Tras reabrir, cambiar y volver a cerrar septiembre, el saldo de octubre se recalculó en cascada (saldo inicial de octubre: 42.454.150).
- Al cierre de la prueba, la caja de octubre (id 12) quedó con saldo final 46.782.942, que es el saldo inicial de noviembre (id 13).

**Observaciones**
- Los egresos devengados de septiembre difieren entre la foto guardada al cierre y la vista con la caja reabierta.
- La ruta legacy `/cajas/vista/:id` no recarga los datos cuando cambia el parámetro `id` (hay que refrescar la página).

### RF-002 · CAJA-02 Liquidaciones en el mes de pago — ✓

**Qué se probó**
Se marcaron 4 liquidaciones como pagadas con fecha de pago en octubre y se revisó la caja de octubre.

**Resultado**
- Cada liquidación pagada impactó el mes de su fecha de pago, no el de su período.
- Los egresos de octubre aumentaron exactamente 1.636.026, igual a la suma de las liquidaciones pagadas.

### RF-003 · BOD-01 Solicitud de bodega — ⚠️ Parcial

**Qué funcionó**
- Como administrador se creó una solicitud con varios productos (solicitud 3: Abrillantador 5L y Balde 12L).
- La vista en ancho móvil (390 px) se ve correctamente.

**Qué no funcionó**
- Con el usuario Supervisor de la intranet (`usuarios`, roleId 6), la lista de solicitudes, los productos y los centros de costo responden **403**.
- Causa: `limpi_back/middleware/auth-bodega.js` solo reconoce como supervisor el token de `/acces_laboral/login` (tabla `trabajadores` + `accesos_laborales`, `tipo_acceso = 1`). Lim_front no tiene login de supervisor (confirmado en `Docs/bodega-solicitudes.md`), así que el supervisor no puede crear solicitudes desde el navegador.

**Observaciones**
- En el detalle de la solicitud, el modal muestra "Pendiente" mientras el badge de la lista dice "EN PROCESO".

### RF-004 · BOD-02 Cruce con stock — ✓

**Qué se probó**
Cruce de la solicitud 3 contra el stock disponible.

**Resultado**
- Abrillantador 5L: 666 descontados de stock y 4 a comprar.
- Balde 12L: 5 descontados y 0 a comprar.
- Se registraron los movimientos `movimientos_bodega` 6 y 7, tipo `SALIDA_SOLICITUD`.
- Al anular la solicitud 3 se generaron los movimientos 8 y 9, tipo `REVERSA`, y el stock volvió a su valor original (registro anulado, no borrado).

### RF-005 · BOD-03 Orden de compra — ✗

**Qué no funcionó**
- No existe pantalla para generar una orden de compra desde la lista de compra, ni para enviarla, ni para administrar proveedores. El frontend no llama a `/ordenes-compra/desde-lista`, `/:id/enviar` ni a los endpoints de proveedores.

**Qué se probó por API**
- La lista de compra se calcula correctamente, pero los productos salen como `sin_proveedor` (no hay proveedores cargados y no hay UI para cargarlos).
- Enviar la OC 1 respondió **503 `SMTP_NO_CONFIGURADO`** (esperable sin SMTP local) y la respuesta **incluye el stack trace** del servidor, lo que no debería exponerse.

### RF-006 · BOD-04 Recepción y entrega — No testeable

- Recepción necesita una OC en estado enviada; como no se puede enviar ninguna OC (RF-005), no hay qué recibir.
- Entrega necesita una solicitud en `LISTA_ENTREGA`; la única solicitud cruzada quedó en `PARCIAL` (faltaba stock) y luego fue anulada.

### RF-007 · BOD-05 Dashboard de bodega — ✓

- El panel muestra KPIs de bodega.
- Con `stock_minimo` del Abrillantador 5L fijado en 700 (stock 666), la fila del producto aparece en rojo como bajo mínimo.

### RF-008 · FAC-01 Facturas pendientes y vencidas — ✗

**Qué se probó**
Registrar en Gestión → Egresos una factura de proveedor vencida y pendiente de pago ("PRUEBA FAC-01 factura vencida", 123.457).

**Qué no funcionó**
- El formulario no permite elegir el estado `PENDIENTE`: el componente crea el egreso con `estado_pago = 'PAGADA'` fijo.
- El egreso guardado (id 414) quedó con `tipo_documento`, `numero_documento`, `fecha_emision` y `fecha_vencimiento` en NULL, aunque el formulario los pide.
- Se guardó en la caja de octubre (id 12) en vez de la de noviembre, porque usa la caja activa seleccionada.
- El KPI "Por pagar" siguió en 0 / $0.

**Observaciones**
- Los commits de corrección 374979e y 6937f68 no estaban en la rama probada (sí estaba d3601ad). Los squash de BOD-02/03 y FAC-01 tampoco. Conviene repetir esta prueba sobre `develop` actualizado.

### RF-009 · WEB-01 Catálogo web — ✓

- Se creó y publicó el ítem de catálogo 1; el endpoint público lo devolvió sin campos internos.
- Al despublicarlo, el servidor dejó de devolverlo de inmediato. El cliente puede mostrarlo hasta 60 s por caché.
- No se probó la subida de imagen.

### RF-010 · WEB-02 Documentos públicos — ✓

- Se subió un PDF de prueba y se publicó como documento 56; se descargó como `Politica_de_privacidad_PRUEBA.pdf`.
- Un documento privado responde 404 en el endpoint público.

**Observaciones**
- Los documentos de la semilla no tienen archivo en disco (su descarga falla).
- En la lista de Archivo, varias filas aparecen sin nombre.
- **Riesgo de privacidad:** el interruptor "público" también se ofrece en documentos de trabajadores (por ejemplo, cédulas de identidad).

### RF-011 · WEB-03 Anuncios — ✓ (solo API, decisión D-099)

- Un anuncio con HTML malicioso (XSS) se guardó sanitizado.
- La publicación 1, al vencer, dejó de aparecer en el endpoint público.

**Observaciones**
- La página legacy de anuncios del panel tiene el layout roto.

### RF-012 · PEV-01 Asignación masiva — ✓

**Criterio:** asignar una tarea a N trabajadores toma una sola acción; no se duplican asignaciones idénticas.

**Qué se probó** (pantalla Asignación PEV, `/pev/asignacion-masiva`)
1. Cliente Clínica Santa Elena, turno mañana, actividad "Desinfección 1", desde 2026-11-20.
2. "Seleccionar todos" (24 trabajadores), área "Salas 1 / Área 1.1", "Aplicar a todos".
3. Vista previa: "24 se asignarán · 0 ya estaban asignadas · 0 con problemas".
4. Confirmar: mensaje "24 asignaciones creadas para Desinfección 1".
5. Se repitió exactamente la misma operación.
6. Se llamó directo a `POST /api/v1/pev/asignaciones-masivas` con dos trabajadores ya asignados y uno repetido en la misma solicitud.

**Resultado**
- BD: `actividad_asignaciones` pasó de 48 a 72 filas; ids 50–73, todas `ACTIVA`, 24 trabajadores distintos.
- En la repetición, la vista previa marcó los 24 como "Ya tiene esta asignación (se omite)" y desactivó "Confirmar asignación". Los trabajadores aparecen con el badge "AQUÍ".
- La API respondió `creadas: 0`, `ya_asignadas: 2`, `repetidas_en_la_seleccion: 1`: el backend también evita los duplicados, no solo la UI.

**Observaciones**
- El checkbox "Seleccionar todos" no reacciona al click por referencia de accesibilidad, solo al click por coordenadas. Revisar la accesibilidad del control.

### RF-013 · PEV-02 Escalabilidad (1 tarea → N trabajadores) — ✓ (solo API)

**Criterio:** pasar de 10 a 9 trabajadores solo elimina una asignación; se conserva el historial previo.

**Qué se probó**
No hay pantalla de administración para quitar un trabajador de una tarea (la fase 02 dejó API admin + app laboral). Se usó `PATCH /api/v1/pev/asignaciones/73/cerrar` con motivo "PRUEBA PEV-02: trabajador sale de la tarea".

**Resultado**
- La asignación 73 pasó a `CERRADA` con `fecha_hasta`, `motivo`, `cerrada_by` y `cerrada_at`.
- Las otras 23 asignaciones siguieron `ACTIVA`.
- El total de filas siguió en 72: la asignación no se borró, se conserva como historial.

### RF-014 · BI-01 Dashboard financiero — ✓

**Qué se vio** (Analytics → Dashboard financiero, período 2026-11)
- 6 KPIs: utilidad real del mes (−2.271.160, mes abierto/provisional), saldo acumulado (44.511.782), proyección de utilidad (2.411.541, rotulada "Estimación: promedio móvil de 3 meses"), liquidaciones pendientes (10.256.352, 23 liquidaciones), por cobrar ($0, informativo) y por pagar ($0).
- Gráfico de ingresos, egresos y utilidad de los últimos 12 meses (2025-12 a 2026-11).
- Alerta de utilidad baja visible.

**Cuadratura**
Saldo inicial de la caja de noviembre 46.782.942 − 2.271.160 = 44.511.782, igual al saldo acumulado mostrado.

**No verificado**
- El mensaje "datos insuficientes" de la proyección (hay 12 meses de historia).
- La regresión lineal de 6 meses que la spec pide mostrar "si hay datos suficientes" no aparece.

**Observaciones**
- El umbral de la alerta es CLP 0, así que se dispara con cualquier mes negativo.
- El eje Y del gráfico no tiene separador de miles.

### RF-015 · BI-02 Rentabilidad por cliente — ✓

**Qué se vio** (período 2026-09 a 2026-11)
- KPIs: utilidad total 3.434.074; Σ márgenes 4.997.431; gastos generales 1.563.357; clientes en pérdida 2.
- Gráfico y tabla top 10 por margen. Hotel Costa Brava encabeza (margen 2.304.440, 30,3 %); Edificio Plaza Norte (−577.203, −12,9 %) y Gimnasio Fit Center (−1.341.898, −34 %) aparecen con el badge "EN PÉRDIDA".
- Desglose de gastos generales: egresos sin centro 3.144.057 − bodega cargada a centros 1.580.700 = 1.563.357.

**Cuadratura**
Σ márgenes − gastos generales = 4.997.431 − 1.563.357 = 3.434.074, igual a la utilidad total.

**Observaciones**
- La tabla muestra los montos en formato en-US ("CLP7,606,000") mientras los KPIs usan formato chileno ("$ 3.434.074").
- En el gráfico, las barras de clientes en pérdida tienen el mismo color que las de ganancia; el destacado solo está en la tabla.

### RF-016 · BI-03 Consumo de bodega — ⚠️ Parcial

**Qué funcionó**
- Stock crítico: "Abrillantador 5L — stock 666, mínimo 700, faltante 34", coincide con el dashboard de bodega (RF-007).
- La pantalla tiene KPIs (unidades entregadas, solicitudes entregadas, productos bajo mínimo), consumo mensual, más solicitados, consumo por supervisor/centro de costo y frecuencia de compra.

**Qué no se pudo verificar**
- "Productos más solicitados", "consumo" y "frecuencia de compra" salen vacíos. `GET /api/v1/analytics/bodega/top-productos` devuelve `[]` porque las 3 solicitudes existentes están `ANULADA` (excluirlas es correcto) y no hay OC enviadas ni entregas (ver RF-005 y RF-006).
- Por eso no se pudo confirmar el criterio "datos desde el primer día de uso del flujo nuevo".

### RF-017 · BI-04 Productividad PEV — No implementado

En el spec figura como 🔒 condicionado a PEV. No hay ruta en `api/v1/analytics` ni pantalla en Analytics.

### RF-018 · BI-05 Predicción de demanda — No implementado

En el spec figura como "Sin empezar". No hay ruta ni pantalla.

---

## Hallazgos transversales

| Severidad | Hallazgo |
|---|---|
| Alta (seguridad) | El usuario Supervisor ve el menú completo y los KPIs financieros del dashboard. |
| Alta (seguridad) | El 503 `SMTP_NO_CONFIGURADO` del envío de OC devuelve el stack trace al cliente. |
| Alta (privacidad) | Se puede publicar documentos de trabajadores (cédulas) en el sitio público. |
| Media | El supervisor de intranet no puede usar bodega (403); solo funciona con el token laboral y no hay login de supervisor en Lim_front. |
| Media | FAC-01: el egreso no guarda los datos de documento ni el estado pendiente. |
| Baja | Montos con formatos mezclados en Rentabilidad; eje Y del gráfico financiero sin separador de miles. |
| Baja | Estados inconsistentes en solicitudes ("Pendiente" vs "EN PROCESO"); filas sin nombre en Archivo; layout roto en la página legacy de anuncios; `/cajas/vista/:id` no recarga al cambiar el parámetro. |

## Datos locales modificados por la prueba

| Dato | Estado final |
|---|---|
| Caja septiembre 2026 | Reabierta y cerrada de nuevo (con motivo) |
| 4 liquidaciones | Marcadas como pagadas (octubre) |
| Solicitud de bodega 3 | Anulada, stock revertido (movimientos 6–9) |
| Egreso 414 | Creado ("PRUEBA FAC-01 factura vencida", 123.457, caja 12) |
| Ítem de catálogo 1 | Despublicado |
| Documento 56 | Publicado, con archivo PDF subido |
| Publicación 1 | Vencida |
| `actividad_asignaciones` 50–73 | Creadas; la 73 cerrada |
| `stock_minimo` Abrillantador 5L | Restaurado a 0 |
| Contraseña del usuario Supervisor | Restaurado el hash original |

## Pendiente para una segunda ronda

1. Repetir RF-008 sobre `develop` con los commits de corrección de FAC-01.
2. Cargar proveedores y configurar SMTP de prueba para recorrer RF-005 → RF-006 → RF-016 de punta a punta.
3. Probar RF-003 con un supervisor autenticado por la app laboral.
4. Probar la subida de imagen del catálogo (RF-009).
