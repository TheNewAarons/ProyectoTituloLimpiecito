# Limpiecito ERP

Sistema de gestión para empresa de limpieza (reservas, cronograma/PEV, bodega, caja, documentos para clientes e intranet). Sistema en producción (AWS EC2 + RDS MySQL): se evoluciona, no se reescribe.

## Estructura

| Carpeta | Contenido |
|---|---|
| `limpi_back/` | API: Node.js, Express 4, Sequelize v4, MySQL. Prefijo `/web-limpiecito`, puerto 3000 |
| `Lim_front/` | Frontend: Angular 8, TypeScript 3.4, Angular Material, Bootstrap 4 |
| `Docs/` | Documentación (requerimientos, API, decisiones, guías) |

## Inicio rápido (local)

```bash
# Base de datos
brew services start mysql        # BD: aseolimp_minda_oficial09

# Backend
cd limpi_back
cp .env.example .env             # completar valores
npm install
npm run dev                      # http://localhost:3000/web-limpiecito/prueba

# Frontend
cd Lim_front
npm install --legacy-peer-deps
NODE_OPTIONS=--openssl-legacy-provider npx ng serve   # http://localhost:4200
```

Detalle completo y login admin local: [`Docs/inicio-proyecto-local.md`](Docs/inicio-proyecto-local.md).

## Documentación

- [Requerimientos (spec v2.0)](Docs/requerimientos-limpiecito.md)
- [Ramas y versionado](Docs/guia-ramas-y-versionado.md)
- [API v1](Docs/API_V1.md)
- [Variables de entorno](Docs/variables-de-entorno.md)
- [Guía de estilo UI](Docs/GUIA-ESTILO-UI.md)
- [Decisiones](Docs/DECISIONES.md) · [Changelog](CHANGELOG.md)

## Flujo de trabajo

- Ramas: `main` (producción) · `develop` (pruebas) · `feature/`, `fix/`, `refactor/`, `docs/`, `hotfix/`.
- Nada de commit/push directo a `main` o `develop`; PR siempre hacia `develop`.
- Commits con Conventional Commits y código de requerimiento: `feat(RF-CAJA-01): ...`.
- Esquema de BD solo mediante migraciones Sequelize reversibles.
- Secretos nunca en el repo: usar `.env` (ignorado).
