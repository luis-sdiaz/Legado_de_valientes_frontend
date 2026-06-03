# ⚔️ Legado de Valientes — Frontend

Interfaz de usuario del sistema **Legado de Valientes**, un juego RPG por turnos donde los jugadores crían, entrenan y hacen combatir mascotas fantásticas. Este repositorio gestiona toda la capa de presentación: vistas, interacción de usuario y consumo de la API REST del backend desplegado en Render.

---

## 🛠️ Tecnologías

| Tecnología | Versión | Rol en el proyecto |
|---|---|---|
| [React](https://react.dev/) | 19 | Librería principal de UI basada en componentes |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Tipado estático para mayor robustez y mantenibilidad |
| [Vite](https://vitejs.dev/) | 8 | Bundler y servidor de desarrollo ultrarrápido |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Estilos utilitarios con diseño responsivo |
| [React Router DOM](https://reactrouter.com/) | 7 | Enrutamiento SPA del lado del cliente |
| [Axios](https://axios-http.com/) | 1.x | Cliente HTTP para consumo de la API REST |
| [TanStack React Query](https://tanstack.com/query) | 5 | Gestión de estado servidor: caché, sincronización y revalidación de datos |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Animaciones declarativas entre vistas y componentes |
| [Phaser](https://phaser.io/) | 3.60 | Motor de juego 2D para las escenas de combate |
| [Vercel](https://vercel.com/) | — | Plataforma de despliegue con integración continua |

---

## 🏗️ Arquitectura

El frontend sigue una arquitectura orientada a **componentes reutilizables** con separación clara de responsabilidades:

```
Páginas (Pages)
    └── componen → Componentes UI (Components)
                       └── consumen → Hooks personalizados (api/hooks.ts)
                                          └── invocan → Capa de servicios (services/api.ts)
                                                            └── HTTP via → Axios Client (api/apiClient.ts)
                                                                              └── REST API → Backend (Render)
```

El estado global del juego (jugador activo, mascotas, combate en curso) se centraliza mediante un **Context de React** (`GameContext`) que expone acciones directas al árbol de componentes. Las consultas al servidor se gestionan con **TanStack React Query**, que aporta caché automático, revalidación y estados de carga/error sin boilerplate adicional.

---

## 📁 Estructura del Proyecto

```
src/
├── api/
│   ├── apiClient.ts        # Instancia de Axios con baseURL configurable por entorno
│   ├── hooks.ts            # Hooks de React Query: usePlayer, useRegisterPlayer, usePets
│   ├── petApi.ts           # Llamadas específicas al recurso /mascotas
│   └── types.ts            # Tipos compartidos del dominio API
│
├── services/
│   └── api.ts              # Todas las funciones de acceso a la API REST (jugadores, mascotas, combates, logros)
│
├── context/
│   └── GameContext.tsx     # Estado global del juego y lógica de negocio frontend (combate, entrenamiento, evolución)
│
├── components/
│   ├── GameCanvas.tsx      # Contenedor del motor Phaser 3
│   ├── HudOverlay.tsx      # Interfaz superpuesta al canvas de juego
│   ├── MainMenu.tsx        # Pantalla de inicio de sesión / registro
│   ├── Modal.tsx           # Componente modal reutilizable
│   ├── RPGButton.tsx       # Botón con estética RPG reutilizable
│   ├── SettingsPanel.tsx   # Panel de configuración
│   └── StonePanel.tsx      # Panel decorativo reutilizable
│
├── pages/
│   ├── HomePage.tsx        # Pantalla de bienvenida y acceso
│   ├── MenuPage.tsx        # Hub de navegación principal
│   ├── PerfilPage.tsx      # Estadísticas y progreso del jugador
│   ├── MascotasPage.tsx    # Colección, invocación y entrenamiento de mascotas
│   ├── CombatePage.tsx     # Flujo de combate por turnos
│   ├── HistorialPage.tsx   # Registro de combates anteriores
│   └── LogrosPage.tsx      # Sistema de logros desbloqueables
│
├── game/
│   ├── scenes/
│   │   ├── BootScene.ts    # Escena de carga de assets
│   │   └── BattleScene.ts  # Escena principal del combate en Phaser
│   ├── audio/
│   │   └── AudioManager.ts # Gestión de efectos de sonido y música
│   ├── assets.ts           # Registro de assets del motor Phaser
│   ├── config.ts           # Configuración de la instancia de Phaser
│   ├── EventBus.ts         # Bus de eventos para comunicación Phaser ↔ React
│   └── Game.ts             # Inicialización y ciclo de vida del juego
│
├── App.tsx                 # Enrutador raíz y layout global
└── main.tsx                # Punto de entrada de la aplicación
```

---

## 🔌 Comunicación con el Backend

Toda la comunicación con el servidor se realiza mediante **peticiones HTTP asíncronas en formato JSON** a través de Axios. El cliente HTTP centraliza la configuración (URL base, cabeceras) a partir de una variable de entorno:

```ts
// src/services/api.ts
const BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});
```

### Flujo de una petición típica

```
Componente React
    → llama a una función de services/api.ts  (ej. obtenerMascotas)
        → axios.get("/api/mascotas/jugador/{id}")
            → Backend REST en Render responde con JSON
                → TanStack Query cachea la respuesta
                    → React re-renderiza con los datos actualizados
```

### Endpoints principales consumidos

| Recurso | Método | Endpoint |
|---|---|---|
| Crear jugador | `POST` | `/api/jugadores` |
| Obtener perfil | `GET` | `/api/jugadores/{id}` |
| Listar mascotas | `GET` | `/api/mascotas/jugador/{id}` |
| Entrenar mascota | `POST` | `/api/mascotas/{id}/entrenar` |
| Generar rival | `POST` | `/api/combates/rival` |
| Ejecutar turno | `POST` | `/api/combates/{id}/turno` |
| Obtener logros | `GET` | `/api/logros?jugadorId={id}` |

---

## 🚀 Despliegue en Producción

El proyecto está configurado para despliegue automático en **Vercel**. Cada `push` a la rama `main` dispara un nuevo build sin intervención manual, lo que garantiza integración continua.

### Configuración de entorno

La URL del backend se inyecta como variable de entorno en tiempo de build, manteniendo el código desacoplado del entorno:

```
# En el dashboard de Vercel → Settings → Environment Variables
VITE_API_URL = https://<tu-servicio>.onrender.com
```

### Ruteo SPA

El archivo `vercel.json` redirige todas las rutas al `index.html`, permitiendo que React Router maneje la navegación en el cliente sin producir errores 404 al refrescar o acceder directamente a una URL:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## ⚙️ Instalación y Desarrollo Local

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Legado_frontend

# 2. Instalar dependencias
npm install

# 3. Configurar entorno local
# Crear el archivo .env.local con la URL del backend
echo "VITE_API_URL=http://localhost:8080" > .env.local

# 4. Iniciar el servidor de desarrollo
npm run dev
```

> **Nota:** El archivo `.env.local` está en `.gitignore` y nunca se sube al repositorio.

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compilación TypeScript + bundle de producción |
| `npm run preview` | Preview del build de producción en local |
| `npm run lint` | Análisis estático con ESLint |

---

## 👤 Autor

**Luis Sebastián Díaz** — Estudiante de Ingeniería de Software
