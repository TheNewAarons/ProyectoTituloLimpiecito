# Inicio del proyecto en local

Pasos para levantar backend + frontend en un entorno local (macOS).

## Requisitos previos

- Node.js instalado (backend probado con Node v24; frontend requiere el flag `--openssl-legacy-provider`, ver más abajo)
- MySQL instalado (probado con MySQL 9.7 vía Homebrew)
- npm

## 1. Base de datos (MySQL)

Levantar el servicio si no está corriendo:

```bash
brew services start mysql
```

Verificar que la base de datos exista (nombre definido en `limpi_back/.env`):

```bash
mysql -u root -e "SHOW DATABASES;"
```

Debe aparecer `aseolimp_minda_oficial09` con sus tablas (`usuarios`, `roles`, `clientes`, etc). Si no existe, hay que crearla e importar el esquema (no hay dump `.sql` en el repo, solo modelos `.mwb` de MySQL Workbench en `limpi_back/`).

## 2. Backend (`limpi_back`)

```bash
cd limpi_back
cp .env.example .env   # solo si no existe ya un .env local
npm install
npm run dev             # levanta con nodemon en el puerto definido en .env (por defecto 3000)
```

Probar que responde:

```bash
curl http://localhost:3000/web-limpiecito/prueba
```

## 3. Frontend (`Lim_front`)

Angular 8 + Node moderno requiere el flag de OpenSSL legacy:

```bash
cd Lim_front
npm install --legacy-peer-deps
NODE_OPTIONS=--openssl-legacy-provider npx ng serve
```

Abrir en el navegador:

```
http://localhost:4200
```

El frontend apunta a `http://localhost:3000/web-limpiecito` (`Lim_front/src/environments/environment.ts`), coincide con el backend local por defecto.

## 4. Usuario de prueba (acceso admin)

- correo: `admin@limpiecito.com`
- password: `admin123`

(rol Administrador, `roleId: 1`, acceso completo al sistema)

## Notas

- `.env` del backend no se sube al repo (contiene credenciales de BD). Usar `limpi_back/.env.example` como referencia.
- Si `npm install` en el frontend falla por conflictos de peer dependencies, usar siempre `--legacy-peer-deps`.
- Si `ng serve` falla con error de `ERR_OSSL_EVP_UNSUPPORTED`, falta el flag `NODE_OPTIONS=--openssl-legacy-provider`.
