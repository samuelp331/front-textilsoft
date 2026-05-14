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

## Estructura resumida

- `src/main.jsx`, `src/App.jsx` — entrada y rutas protegidas
- `src/pages/` — vistas por pantalla (inventario, reportes, admin, etc.)
- `src/context/AuthContext.jsx` — sesión y permisos de navegación
- `src/lib/` — cliente API (`api.js`), datos auxiliares, utilidades

Instrucciones de proyecto (backend, variables y despliegue): ver el `README.md` en la raíz del repositorio.
