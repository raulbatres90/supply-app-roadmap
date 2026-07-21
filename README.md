# DFA Roadmap Interno

App standalone para que el equipo fundador de DFA planee y gestione el path-to-launch.
**Uso del equipo** — accesible directamente mediante su enlace, sin cuenta ni contraseña.

## Características

- 🚀 **Vista Gantt + Tabla** del roadmap completo (40 tareas precargadas)
- 👥 **Tab Equipo** para gestionar miembros (CRUD, colores de avatar)
- 💬 Comentarios por tarea con timestamp
- 🏷️ Tags, fases, prioridades, dependencias entre tareas
- 📊 Stats en tiempo real: hechas/en curso/bloqueadas/% progreso
- 💾 Auto-save (600ms debounce)
- 🎨 Drill-down por fase, today indicator, hover tooltips, milestones

## Stack

- React 18 + Vite (puerto 5174 local)
- TailwindCSS con tokens OKLCH (sin shadcn, componentes inline)
- React Query
- Axios

## Setup local

```bash
# 1. Backend DFA corriendo en localhost:3001 (repo supply-app-backend)
# 2. Instalar y correr esta app
npm install
npm run dev
# 3. Abrir http://localhost:5174
```

## Deploy en Vercel

### Pasos

1. **Importar el repo** en Vercel (auto-detecta Vite)
2. **Setear env var** `VITE_BACKEND_URL` → URL del backend producción
   - Ejemplo: `https://supply-app-backend-xxx.vercel.app` o tu Railway/Render
3. **Build settings**: `npm run build`, output `dist/`
4. **Deploy**

### Requisito del backend

El backend (`supply-app-backend`) tiene que estar deployado y accesible. Esta app
NO incluye backend — solo consume `/api/internal-roadmap/*` del backend de DFA.

Además, **agregá la URL de Vercel de esta app al CORS allowlist del backend**:

```js
// supply-app-backend/src/index.js
const allowedOrigins = [
  'http://localhost:5174',
  'https://tu-roadmap-vercel.vercel.app',  // ← agregá esto
  // ...
];
```

## Acceso

No requiere cuenta ni correo. Quien tenga el enlace puede consultar y modificar
el tablero, el plan, el equipo y los comentarios. Las demás APIs de Demand Flow
AI conservan su autenticación habitual.

## Seguridad

El enlace debe compartirse únicamente con el equipo autorizado. El Roadmap no
contiene una barrera adicional de autenticación y todas sus acciones están
disponibles para quien conozca la URL.
