# Changelog — Limpiecito ERP

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/). Cada entrada incluye el código del requerimiento (`Docs/guia-ramas-y-versionado.md` §6). La subida de versión y el tag ocurren solo tras el Sprint Review aprobado, a cargo del equipo.

## [Sin publicar]

### Agregado
- **RF-CAJA-02** — Estado de pago en liquidaciones de sueldo: liquidaciones generadas con `estado_pago = EN_ESPERA` (no impactan caja); acciones "marcar como pagada" (individual y en lote, atómico) y "revertir pago" (solo Admin, con motivo) que crean/anulan un egreso trazable en la caja del mes de `fecha_pago`. Endpoints `GET/PATCH/POST /api/v1/liquidaciones[...]` con auth por rol (`middleware/auth.js`); bloque informativo de liquidaciones pendientes en `vista-caja`.
- Middleware `autenticar`/`requerirRol` (`limpi_back/middleware/auth.js`), primer punto del backend que valida `x-access-token` y rol antes de ejecutar un handler.
