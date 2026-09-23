# Limpiecito ERP — Guía de Ramas y Versionado

> **Equipo:** Aaron Soto · Bastián Jofré
> **Aplica a:** todo el código del repositorio (backend Node/Express, frontend Angular, migraciones) y a cualquier agente que trabaje en él (Claude Code).
> **Principio base:** el sistema está en producción. Nada llega a producción sin revisión cruzada, paso por el ambiente de pruebas y aprobación del dueño en el Sprint Review.

---

## 1. Modelo de ramas

```
main ───────●───────────────●────────────●──────────▶  PRODUCCIÓN (AWS)
            │ v1.0.0        ▲ v1.1.0     ▲ v1.1.1
            │               │            │
            │               │        hotfix/caja-saldo-negativo
            ▼               │
develop ────●──●──●──●──────●──●──●──────●──────────▶  AMBIENTE DE PRUEBAS
               ▲  ▲  ▲         ▲  ▲
               │  │  │         │  │
      feature/RF-CAJA-01       feature/RF-BOD-01 ...
         feature/RF-CAJA-02
            refactor/RNF-API-02
```

| Rama | Propósito | Nace de | Se integra en | Duración |
|---|---|---|---|---|
| `main` | Código en producción. Cada commit es una versión desplegada. | — | — | Permanente |
| `develop` | Integración del sprint; se despliega al ambiente de pruebas. | `main` (una sola vez) | `main` (al cerrar sprint) | Permanente |
| `feature/<código>-<desc>` | Un requerimiento funcional (RF) | `develop` | `develop` | 1–4 días |
| `refactor/<código>-<desc>` | Un requerimiento no funcional (RNF) o deuda técnica | `develop` | `develop` | 1–4 días |
| `fix/<desc>` | Error detectado en pruebas (aún no en producción) | `develop` | `develop` | Horas |
| `hotfix/<desc>` | Error urgente **en producción** | `main` | `main` **y** `develop` | Horas |
| `docs/<desc>` | Sólo documentación | `develop` | `develop` | Horas |

### Convención de nombres

- Minúsculas, palabras separadas por guion, sin tildes ni ñ.
- Siempre incluir el código del backlog cuando exista.

```
feature/RF-CAJA-01-traspaso-saldo
feature/RF-BOD-02-cruce-stock
refactor/RNF-SEC-01-jwt-env
fix/bodega-stock-negativo-concurrencia
hotfix/liquidaciones-pago-lote
docs/analisis-pev
```

### Requerimientos grandes (L / XL)

Si un requerimiento tomará más de 4 días, se divide en ramas incrementales que dejan el sistema funcionando en cada merge:

```
feature/RF-PEV-02a-tabla-asignaciones      (esquema + migración)
feature/RF-PEV-02b-migracion-datos         (traspaso de datos existentes)
feature/RF-PEV-02c-uso-en-app-laboral      (lógica y vistas)
```

---

## 2. Flujo de trabajo diario

### 2.1 Empezar un requerimiento

```bash
git switch develop
git pull origin develop
git switch -c feature/RF-BOD-01-solicitud-supervisor
```

### 2.2 Durante el desarrollo

```bash
git add -p                                   # revisar qué se agrega
git commit -m "feat(RF-BOD-01): endpoint POST de solicitudes"
git push -u origin feature/RF-BOD-01-solicitud-supervisor
```

Al menos **una vez al día** se trae lo nuevo de `develop`, para que los conflictos aparezcan chicos:

```bash
git fetch origin
git rebase origin/develop
git push --force-with-lease                  # nunca --force a secas
```

> `rebase` y `--force-with-lease` sólo se usan en **ramas propias**. Nunca sobre `develop` ni `main`.

### 2.3 Terminar un requerimiento

1. Rebase final sobre `origin/develop` y verificar que todo corre (`npm test`, levantar front y back).
2. Abrir un Pull Request **hacia `develop`** usando la plantilla de la sección 6.
3. **El otro integrante revisa y aprueba.** Nadie aprueba su propio PR.
4. Hacer merge con **Squash and merge**: el requerimiento queda como un solo commit en `develop`, con el título del PR.
5. Borrar la rama (GitHub lo hace automáticamente si se activa la opción).
6. Actualizar el estado del requerimiento en Notion.

### 2.4 Qué hace cada uno durante la revisión

| Autor | Revisor |
|---|---|
| Describe qué cambió y cómo probarlo | Baja la rama y la prueba localmente |
| Marca los criterios de aceptación cumplidos | Verifica los criterios de aceptación |
| Indica si hay migraciones | Corre `db:migrate` y `db:migrate:undo` |
| Responde comentarios con commits nuevos | Aprueba o solicita cambios en ≤ 24 h hábiles |

---

## 3. Mensajes de commit (Conventional Commits)

```
<tipo>(<código o alcance>): <descripción en imperativo, minúscula, sin punto final>
```

| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | Funcionalidad nueva | `feat(RF-CAJA-02): marcar liquidación como pagada` |
| `fix` | Corrección de error | `fix(RF-BOD-02): evitar stock negativo en solicitudes simultáneas` |
| `refactor` | Cambio interno sin alterar comportamiento | `refactor(RNF-API-02): middleware centralizado de errores` |
| `perf` | Mejora de rendimiento | `perf(RNF-BI-01): índices en fecha_pago y periodo` |
| `test` | Tests | `test(RF-BOD-02): caso de referencia A/B/C/D` |
| `docs` | Documentación | `docs: guía de ramas y versiones` |
| `chore` | Configuración, dependencias, scripts | `chore: agregar dotenv y .env.example` |
| `db` | Sólo migraciones o seeds | `db(RF-FAC-01): columnas de estado de pago` |

Si un cambio rompe compatibilidad con consumidores existentes (por ejemplo, se retira una ruta legacy), se agrega al pie del mensaje:

```
BREAKING CHANGE: se retira GET /routes/caja/resumen; usar GET /api/v1/cajas/:periodo/resumen
```

---

## 4. Versionado (Semantic Versioning)

Formato **`vMAYOR.MENOR.PARCHE`**.

| Parte | Cuándo sube | Ejemplo |
|---|---|---|
| **MAYOR** | Cambio incompatible: se retiran rutas legacy, cambia el contrato de la API para consumidores existentes (app móvil, extranet) | `v1.8.0` → `v2.0.0` |
| **MENOR** | Cierre de sprint con funcionalidades nuevas aprobadas | `v1.1.0` → `v1.2.0` |
| **PARCHE** | Hotfix en producción | `v1.2.0` → `v1.2.1` |

### Plan de versiones del proyecto

| Versión | Contenido | Sprint |
|---|---|---|
| `v1.0.0` | **Línea base:** sistema legacy tal como está hoy en producción, antes de cualquier cambio | Sprint 0 |
| `v1.1.0` | Caja: traspaso de saldo y estado de pago en liquidaciones (+ base RNF: JWT, `/api/v1`, errores) | Sprint 1 |
| `v1.2.0` | Bodega parte 1: solicitudes, cruce de stock, órdenes de compra | Sprint 2 |
| `v1.3.0` | Bodega parte 2 + Facturación | Sprint 3 |
| `v1.4.0` | Web: catálogo, documentos, publicaciones | Sprint 4 |
| `v1.5.0` | PEV/Cronograma (sujeto a reunión técnica) | Sprint 5 |
| `v1.6.0` | BI parte 1 | Sprint 6 |
| `v1.7.0` | BI parte 2 + RNF seguridad/arquitectura | Sprint 7 |
| `v1.8.0` | RNF restantes + integración final | Sprint 8 |
| `v2.0.0` | Entrega final: retiro de rutas legacy migradas (si RNF-ARQ-01 se completa) | Cierre (dic-2026) |

Si un sprint no alcanza a aprobarse en el Sprint Review, **no se crea versión**: el contenido se libera en la versión del sprint siguiente. Los números no se saltan.

### Versiones candidatas (opcional)

Para marcar lo que se muestra en el Sprint Review desde el ambiente de pruebas:

```
v1.2.0-rc.1   → primera candidata en pruebas
v1.2.0-rc.2   → tras correcciones de la revisión
v1.2.0        → aprobada y desplegada en producción
```

### Dónde vive el número de versión

- `package.json` del backend y del frontend (`"version": "1.2.0"`), ambos con el mismo número.
- Tag anotado de Git en `main`.
- `CHANGELOG.md` en la raíz.
- Opcional: endpoint `GET /api/v1/version` que devuelve la versión desplegada, útil para confirmar qué hay en cada ambiente.

---

## 5. Release: de `develop` a producción

### 5.1 Checklist antes del Sprint Review

- [ ] Todos los PR del sprint están integrados en `develop`.
- [ ] `develop` está desplegado en el ambiente de pruebas.
- [ ] Migraciones probadas en pruebas con copia de la BD de producción.
- [ ] Criterios de aceptación verificados.
- [ ] `CHANGELOG.md` actualizado en la sección `[Sin publicar]`.

### 5.2 Después de la aprobación del dueño

```bash
# 1. Subir versión en ambos package.json (sin crear tag todavía)
git switch develop && git pull
cd backend  && npm version 1.2.0 --no-git-tag-version && cd ..
cd frontend && npm version 1.2.0 --no-git-tag-version && cd ..

# 2. Mover [Sin publicar] del CHANGELOG a [1.2.0] - AAAA-MM-DD
git commit -am "chore(release): v1.2.0"
git push origin develop

# 3. PR develop → main en GitHub (merge commit, NO squash, para conservar el historial)

# 4. Etiquetar en main
git switch main && git pull
git tag -a v1.2.0 -m "Sprint 2: Bodega parte 1"
git push origin v1.2.0
```

### 5.3 Despliegue a producción

1. Respaldo de la BD de producción (RDS snapshot).
2. Despliegue **después de las 18:30 hrs**.
3. Ejecutar migraciones pendientes.
4. Verificación rápida: login en cada contexto, caja del mes, bodega y el endpoint `/api/v1/version`.
5. Crear el **GitHub Release** desde el tag, pegando la sección del CHANGELOG.

### 5.4 Rollback

```bash
# Volver al tag anterior
git switch main
git revert -m 1 <commit-del-merge-de-la-release>   # o redeploy del tag anterior
npx sequelize-cli db:migrate:undo                   # por cada migración de la versión, en orden inverso
```

Si la migración ya transformó datos, se restaura el snapshot de RDS tomado en el paso 5.3.1.

---

## 6. Hotfix (error en producción)

```bash
git switch main && git pull
git switch -c hotfix/liquidaciones-pago-lote
# ... corrección + test ...
git commit -m "fix(RF-CAJA-02): pago en lote no registraba fecha_pago"
git push -u origin hotfix/liquidaciones-pago-lote
```

1. PR hacia `main`, revisado por el otro integrante (puede ser revisión rápida, pero no se omite).
2. Merge, tag `v1.2.1` y despliegue.
3. **Inmediatamente** hacer PR de la misma rama (o de `main`) hacia `develop`, para que la corrección no se pierda en el siguiente release.
4. Registrar en el CHANGELOG bajo `[1.2.1]`.

---

## 7. Migraciones de base de datos

Es el principal foco de conflicto entre dos desarrolladores.

1. **Una migración por cambio lógico**, siempre con `up` y `down`.
2. Nombre con timestamp generado por `sequelize-cli migration:generate` y el código del requerimiento: `20260924120000-RF-CAJA-02-estado-pago-liquidaciones.js`.
3. **Antes del merge**, rebase sobre `develop` y verificar el orden completo:
   ```bash
   npx sequelize-cli db:migrate:undo:all   # sólo en BD local
   npx sequelize-cli db:migrate
   ```
4. Nunca editar una migración que ya está en `develop`; si hay que corregir, se crea una migración nueva.
5. Si ambos necesitan tocar la misma tabla en el mismo sprint, se avisan y uno espera el merge del otro.
6. Prohibido `sequelize.sync({ force: true })` o `sync({ alter: true })` fuera de un entorno local desechable.

---

## 8. Configuración de GitHub

### 8.1 Protección de ramas (Settings → Branches → Add rule)

| Regla | `main` | `develop` |
|---|---|---|
| Requerir Pull Request antes del merge | ✅ | ✅ |
| Aprobaciones requeridas | 1 | 1 |
| Descartar aprobaciones al subir nuevos commits | ✅ | ✅ |
| Requerir rama actualizada antes del merge | ✅ | ✅ |
| Requerir que pase CI (cuando exista) | ✅ | ✅ |
| Prohibir force push | ✅ | ✅ |
| Prohibir eliminación | ✅ | ✅ |

### 8.2 Opciones del repositorio (Settings → General)

- Permitir **Squash merging** (para `feature/*` → `develop`) y **Merge commits** (para `develop` → `main`).
- Desactivar Rebase merging, para no mezclar estilos.
- Activar **Automatically delete head branches**.

### 8.3 Plantilla de Pull Request

Guardar como `.github/pull_request_template.md`:

```markdown
## Requerimiento
Código: RF-XXX-00 — <nombre>
Sprint: N

## Qué cambia
- 

## Cómo probar
1. 

## Criterios de aceptación
- [ ] 
- [ ] 

## Migraciones
- [ ] No incluye migraciones
- [ ] Incluye migraciones (probadas up/down en local)

## Checklist
- [ ] Rebase sobre develop actualizado
- [ ] Tests pasan
- [ ] Sin secretos ni `.env` en el diff
- [ ] Auditoría registrada si toca caja, bodega o liquidaciones
```

### 8.4 Archivos que nunca se versionan (`.gitignore`)

```
.env
.env.*
!.env.example
node_modules/
dist/
uploads/
*.log
*.sql
*.dump
```

---

## 9. Reglas para Claude Code

Agregar al inicio de `REQUERIMIENTOS_LIMPIECITO_ERP.md` (sección 0) o en `CLAUDE.md`:

1. Trabaja siempre en una rama `feature/<código>-<desc>` o `refactor/<código>-<desc>` creada desde `develop` actualizado.
2. **Nunca** hagas commit ni push a `main` o `develop`, ni crees tags.
3. Un requerimiento por rama; commits con formato Conventional Commits incluyendo el código.
4. Antes de terminar: rebase sobre `origin/develop`, tests pasando, migraciones verificadas con `undo` + `migrate`.
5. Termina abriendo el Pull Request con la plantilla; la revisión y el merge los hace el otro integrante del equipo.
6. No uses `git push --force`; si es necesario, sólo `--force-with-lease` y sólo en tu propia rama.

---

## 10. CHANGELOG.md

Formato basado en *Keep a Changelog*. Estructura inicial:

```markdown
# Changelog

## [Sin publicar]
### Agregado
### Cambiado
### Corregido
### Seguridad

## [1.0.0] - 2026-08-28
### Agregado
- Línea base: sistema en producción antes del Proyecto de Título.
```

Cada entrada lleva el código del requerimiento:

```markdown
## [1.1.0] - 2026-09-11
### Agregado
- RF-CAJA-01: traspaso automático de saldo entre meses.
- RF-CAJA-02: estado de pago en liquidaciones (En espera / Pagada), con pago en lote.
### Seguridad
- RNF-SEC-01: claves JWT movidas a variables de entorno; tokens expiran a las 8 h.
```

---

## 11. Puesta en marcha (una sola vez)

```bash
# 1. Etiquetar la línea base de producción ANTES de cualquier cambio
git switch main && git pull
git tag -a v1.0.0 -m "Línea base: sistema legacy en producción"
git push origin v1.0.0

# 2. Crear develop
git switch -c develop
git push -u origin develop

# 3. Agregar archivos de soporte en una rama docs
git switch -c docs/guia-ramas
#   - GUIA_RAMAS_Y_VERSIONES.md
#   - CHANGELOG.md
#   - .github/pull_request_template.md
#   - .gitignore actualizado
git commit -am "docs: guía de ramas, changelog y plantilla de PR"
git push -u origin docs/guia-ramas
# 4. PR hacia develop → revisión → merge

# 5. Configurar protección de ramas en GitHub (sección 8)
```

---

## 12. Referencia rápida

| Quiero… | Comando / acción |
|---|---|
| Empezar un requerimiento | `git switch develop && git pull && git switch -c feature/RF-XXX-desc` |
| Traer cambios de develop | `git fetch && git rebase origin/develop` |
| Subir tras rebase | `git push --force-with-lease` |
| Ver en qué rama estoy y qué cambió | `git status` · `git log --oneline --graph -15` |
| Guardar trabajo a medias | `git stash` / `git stash pop` |
| Deshacer el último commit (sin perder cambios) | `git reset --soft HEAD~1` |
| Ver qué versión está en producción | `git describe --tags origin/main` |
| Listar versiones | `git tag -l "v*" --sort=-v:refname` |
| Resolver un conflicto de rebase | editar archivos → `git add <archivo>` → `git rebase --continue` (o `--abort`) |
| Arreglar algo urgente en producción | Sección 6 (hotfix) |
