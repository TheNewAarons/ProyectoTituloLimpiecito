# Versionado de la API (RNF-API-01)

## Estado actual

El backend expone el mismo router `api` en dos prefijos (`PREFIJO` = `/web-limpiecito`):

| Prefijo | Ejemplo | Uso |
|---|---|---|
| `${PREFIJO}` | `/web-limpiecito/prueba` | Legacy. Lo usan hoy Angular y la app. **No cambia.** |
| `${PREFIJO}/api/v1` | `/web-limpiecito/api/v1/prueba` | Versión 1. Hoy es un **alias** del mismo router. |

Implementación: una línea en `limpi_back/index.js`, después de `app.use(process.env.PREFIJO, api)`:

```js
app.use(process.env.PREFIJO + '/api/v1', api);
```

No se duplican rutas: ambos prefijos apuntan a la misma instancia de `api`, por lo que cualquier ruta
(incluidas las que se agregan a `api` después de `listen`) responde en los dos.

## Reglas

- Las rutas legacy se montan primero y ganan siempre; `/api/v1` solo recibe lo que las legacy no resuelven.
- Los endpoints **nuevos** se piensan para `/api/v1` (formato de error: ver RNF-API-02).
- Los clientes Angular y la app **no se migran** en este cambio. Migrarlos o retirar las rutas legacy es
  RNF-ARQ-01 y requiere autorización y test de regresión.
- Cuando exista un cambio incompatible, se crea `/api/v2` en paralelo; `v1` no se modifica.

## Límite conocido

Al ser un alias, hoy cada ruta legacy también es accesible bajo `/api/v1` (superficie expuesta duplicada,
con la misma autenticación que ya tenía). Se resuelve al crear el router propio `api/v1/` y dejar de usar el alias.
