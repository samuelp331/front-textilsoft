# Frontend TextilSoft

SPA React 19 + Vite que consume la API del backend TextilSoft.

## Desarrollo

```powershell
cd frontend
npm install
npm run dev
```

Opcional: crear `frontend/.env.development` con `VITE_API_BASE=/api` para usar el proxy de Vite hacia Django en `http://127.0.0.1:8000` (ver `vite.config.js`). Sin esa variable, el cliente usa por defecto `http://127.0.0.1:8000/api`.

Abrir normalmente `http://127.0.0.1:5173`.

## Scripts

| Comando | Uso |
|--------|-----|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Salida estática en `dist/` |
| `npm run preview` | Preview del build |
| `npm test` | Vitest |

## Despliegue en Render

Crear un servicio de tipo **Static Site** conectado al repositorio del frontend.

Si el repositorio contiene directamente este proyecto, usar:

```bash
Build Command: npm ci && npm run build
Publish Directory: dist
```

Si se despliega desde el repositorio monolito, configurar **Root Directory** como `frontend`.

Variable requerida:

```bash
VITE_API_BASE=https://tu-backend.onrender.com/api
```

El archivo `render.yaml` incluye una regla de rewrite a `index.html` para que las rutas de la SPA funcionen al recargar la pagina.

## Estructura resumida

- `src/main.jsx`, `src/App.jsx` — entrada y rutas protegidas
- `src/pages/` — vistas por pantalla (inventario, reportes, admin, etc.)
- `src/context/AuthContext.jsx` — sesión y permisos de navegación
- `src/lib/` — cliente API (`api.js`), datos auxiliares, utilidades

Instrucciones de proyecto (backend, variables y despliegue): ver el `README.md` en la raíz del repositorio.
