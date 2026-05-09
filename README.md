# Frontend TextilSoft

Frontend replicado visual y navegacionalmente desde el proyecto de referencia `TextilSoft2`, adaptado a la estructura modular actual.

## Estructura

- `index.html`: contenedor SPA con todas las vistas/pantallas.
- `src/styles/styles.css`: estilos base y componentes (mismo look & feel de referencia).
- `src/core`: navegacion y utilidades globales (modales, flujo de paginas).
- `src/modules`: logica por dominio (`auth`, `inventory`, `reports`, `alerts`, `suppliers`, `profile`).

## Integracion con backend

- Login conectado a `POST http://127.0.0.1:8000/api/login`.
- Se mantiene fallback local de autenticacion del proyecto original para compatibilidad.

## Ejecutar localmente

```powershell
cd frontend
python -m http.server 5173
```

Abrir: `http://127.0.0.1:5173`
