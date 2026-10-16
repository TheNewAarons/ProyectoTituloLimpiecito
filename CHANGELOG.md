# Changelog — Limpiecito ERP

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/). Cada entrada incluye el código del requerimiento (`Docs/guia-ramas-y-versionado.md` §6). La subida de versión y el tag ocurren solo tras el Sprint Review aprobado, a cargo del equipo.

## [Sin publicar]

### Agregado
- **RF-CAJA-01** — Traspaso automático de saldo entre meses (sin fecha de release ni tag; pendiente de verificación/PR): saldo encadenado en `cajas` (`periodo`, `saldo_inicial`, `saldo_final`, `saldo_provisional`, `cerrada_por`; migraciones `20261016041620` y `20261016060515`, ver `Docs/migracion_caja.md`); endpoints `GET /api/v1/cajas/:periodo/resumen`, `POST /cerrar`, `POST /reabrir` (motivo 5-500) y `GET /historial` (solo Admin); cierre/reapertura transaccional con recálculo en cascada y auditoría; cron de apertura el día 1 a las 00:05 (America/Santiago) tras el flag `CAJA_APERTURA_AUTOMATICA` (apagado por defecto); el cierre legacy `PUT /caja/cerrar/:idCaja` delega en el servicio y exige token + Admin (también bajo el alias `/api/v1/caja`); egresos legacy se anulan (no se borran) y los listados excluyen anulados; frontend con cierre de mes y cabecera desde el resumen.
- **RF-CAJA-02** — Estado de pago en liquidaciones de sueldo: liquidaciones generadas con `estado_pago = EN_ESPERA` (no impactan caja); acciones "marcar como pagada" (individual y en lote, atómico) y "revertir pago" (solo Admin, con motivo) que crean/anulan un egreso trazable en la caja del mes de `fecha_pago`. Endpoints `GET/PATCH/POST /api/v1/liquidaciones[...]` con auth por rol (`middleware/auth.js`); bloque informativo de liquidaciones pendientes en `vista-caja`.
- Middleware `autenticar`/`requerirRol` (`limpi_back/middleware/auth.js`), primer punto del backend que valida `x-access-token` y rol antes de ejecutar un handler.
