## Documentación — Estado actual de la aplicación

Última revisión: 2025-11-05

Esta documentación describe qué hace la aplicación web "RentaAutos" en su estado actual, cómo está organizada, cómo ejecutar el proyecto localmente y notas importantes sobre limitaciones y siguientes pasos recomendados.

## Resumen funcional

- Tipo de proyecto: sitio web estático con comportamiento cliente (JavaScript) que simula autenticación y reservas sin backend real.
- Propósito principal: mostrar la flota de vehículos, planes/tarifas y permitir a usuarios autenticarse (simulado) y crear reservas que se guardan localmente.
- Experiencia de usuario: navegación por secciones (inicio, flota, sucursales, tarifas, servicios), modal de login, formulario rápido de reserva en el hero, páginas informativas (registro, renta por día/viaje, servicio corporativo, leyes).

## Flujo principal (qué ocurre al usarla)

1. El sitio se sirve como archivos estáticos (HTML/CSS/JS). No hay API remota por defecto.
2. El script principal es `js/script.js` (módulo). Este archivo:
   - Maneja la navegación, animaciones e interacciones UI.

## Archivos clave y su propósito

- `index.html` — Página principal del sitio; contiene la UI completa (hero, flota, tarifas, servicios, footer, modales de login y reservas). Carga `js/script.js` como módulo.
- `pages/*.html` — Páginas secundarias (registro, renta-por-dia, renta-por-viaje, servicio-corporativo, acerca-de, leyes). Contienen versiones de contenido ampliado y reutilizan el `js/script.js` en la mayoría.
- `css/styles-modern.css` — Estilos modernos, variables CSS y reglas para la apariencia del sitio.
- `js/script.js` — Lógica cliente: navegación, animaciones, manejo de modales, envío del formulario de reserva y llamadas a la API (stub).
- `js/firebase.js` — Stub local que emula la API de autenticación y reservas. Implementa persistencia en `localStorage` y `sessionStorage` para desarrollo sin backend.
- `scripts/server.js` — Servidor estático mínimo en Node.js incluido para desarrollo. Se usa por `npm start`.
- `package.json` — Define el script `start` que ejecuta `node scripts/server.js --dir . --port 8000`. No hay dependencias NPM adicionales.

## Cómo ejecutar localmente

Requisitos:

- Node.js >= 18 (según `package.json` en `engines`).

Instrucciones rápidas (PowerShell en Windows):

```powershell
# desde la raíz del proyecto
npm install    # no es obligatorio (no hay deps), pero seguro ejecutarlo
npm start
```

Esto ejecuta `node scripts/server.js --dir . --port 8000` y sirve el contenido en http://localhost:8000.

Alternativa usando Node directamente:

```powershell
node scripts/server.js --dir . --port 8000
```

Abrir `http://localhost:8000` en el navegador.

## Dependencias y recursos externos

- Dependencias Node: no hay paquetes externos listados en `package.json`.
- Recursos cargados por CDN: Bootstrap CSS/JS, Font Awesome, Google Fonts.