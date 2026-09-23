# Requerimientos del Proyecto — Limpiecito ERP

> **Proyecto:** Limpiecito ERP  
> **Curso:** Gestión de Proyecto — INACAP  
> **Estado general:** Todos los requerimientos se encuentran en estado **Sin empezar**

---

## Requerimientos Funcionales (RF)

### Módulo: PEV / Cronograma

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RF-PEV-01 | Asignación masiva de actividades PEV | Mejora | 🟠 Media-Alta | L |
| RF-PEV-02 | Escalabilidad de tareas PEV (1 tarea → N trabajadores) | Refactor | 🟠 Media-Alta | XL |

---

### Módulo: BI / Analytics

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RF-BI-01 | Dashboard financiero (utilidad, tendencias, proyección) | Feature nueva | 🔴 Alta | L |
| RF-BI-02 | Rentabilidad por cliente / centro de costo | Feature nueva | 🔴 Alta | L |
| RF-BI-03 | Análisis de consumo de bodega | Feature nueva | 🟠 Media-Alta | M |
| RF-BI-04 | Productividad de trabajadores/supervisores PEV | Feature nueva | 🟡 Media | M |
| RF-BI-05 | Predicción de demanda (app reservas) | Feature nueva | 🟢 Baja | L |

---

### Módulo: Bodega

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RF-BOD-01 | Solicitud de insumos/EPP por supervisor | Feature nueva | 🔴 Alta | L |
| RF-BOD-02 | Cruce automático solicitud vs stock | Feature nueva | 🔴 Alta | M |
| RF-BOD-03 | Envío automático de orden de compra al proveedor | Feature nueva | 🔴 Alta | M |
| RF-BOD-04 | Recepción y actualización automática de bodega | Feature nueva | 🔴 Alta | M |
| RF-BOD-05 | Dashboard/Home de bodega (solicitudes, lista compra, stock) | Feature nueva | 🟠 Media-Alta | M |

---

### Módulo: Facturación

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RF-FAC-01 | Estado de pago en facturas (ingresos y egresos) | Mejora | 🟡 Media | S |

---

### Módulo: Caja

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RF-CAJA-01 | Traspaso automático de saldo entre meses | Mejora | 🔴 Alta | M |
| RF-CAJA-02 | Estado de pago en liquidaciones de sueldo | Feature nueva | 🔴 Alta | M |

---

### Módulo: Web

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RF-WEB-01 | Catálogo de productos publicable a la web | Feature nueva | 🟡 Media | L |
| RF-WEB-02 | Portal de PDFs descargables (políticas, reglamento) | Feature nueva | 🟡 Media | S |
| RF-WEB-03 | Publicaciones y anuncios desde el sistema | Feature nueva | 🟢 Baja | S |

---

## Requerimientos No Funcionales (RNF)

### API / Backend

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RNF-API-01 | Versionado de API (`/api/v1/`) | Refactor | 🟡 Media | M |
| RNF-API-02 | Manejo centralizado de errores en backend | Refactor | 🟠 Media-Alta | M |

---

### Arquitectura

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RNF-ARQ-01 | Unificar estructura legacy `/routes/` con nueva `/api/` | Refactor | 🟡 Media | L |

---

### Rendimiento

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RNF-BI-01 | Rendimiento dashboards BI < 2s carga inicial | Mejora | 🟡 Media | M |

---

### Seguridad

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RNF-SEC-01 | Seguridad: mover claves JWT a variables de entorno | Refactor | 🔴 Alta | S |
| RNF-SEC-02 | Trazabilidad/auditoría de cambios en caja y bodega | Feature nueva | 🟠 Media-Alta | M |

---

### UX / Usabilidad

| Código | Requerimiento | Tipo | Prioridad | Esfuerzo |
|--------|---------------|------|-----------|----------|
| RNF-UX-01 | Usabilidad móvil en dashboard bodega y BI | Mejora | 🟡 Media | M |

---

## Resumen

| Categoría | Total |
|-----------|-------|
| Requerimientos Funcionales (RF) | 18 |
| Requerimientos No Funcionales (RNF) | 7 |
| **Total** | **25** |

### Distribución por prioridad

| Prioridad | Cantidad |
|-----------|----------|
| 🔴 Alta | 10 |
| 🟠 Media-Alta | 7 |
| 🟡 Media | 6 |
| 🟢 Baja | 2 |

### Distribución por esfuerzo estimado

| Esfuerzo | Descripción aprox. | Cantidad |
|----------|--------------------|----------|
| S (Small) | Días | 4 |
| M (Medium) | 1–2 semanas | 13 |
| L (Large) | 2–4 semanas | 7 |
| XL (Extra Large) | > 1 mes | 1 |
