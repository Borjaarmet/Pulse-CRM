# Pulse CRM

Pulse CRM es un panel "AI-first" para equipos comerciales construido por MindLab. Combina un frontend React + Vite con un backend Express/TypeScript y puede operar tanto en modo demo (datos locales) como en modo Supabase (datos reales y actualizaciones en tiempo real).

## Capacidades clave
- **Home asistido por IA**: tarjetas de próximas acciones, alertas de deals críticos, recomendaciones y digest diario generados a partir de heurísticas de riesgo/SLA.
- **Pipeline colaborativo**: kanban con drag & drop, panel lateral con explicaciones de score y riesgo, y navegación directa desde las alertas.
- **Métricas ejecutivas**: paneles para reps y managers (conversiones, ciclo de ventas, ranking por owner, valor en riesgo, forecast ponderado).
- **Timeline y actividad reciente**: registro automático de eventos, incluyendo la resolución de alertas para auditar decisiones.
- **Integraciones listas**: payloads estructurados para Slack/Teams y digest textual; basta conectar el webhook cuando toque.
- **Dual-mode data store**: si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se usa Supabase (con realtime); de lo contrario se carga una demo store en memoria.

## Stack técnico
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, React Query, Wouter.
- **Backend**: Express (server/index.ts), Drizzle ORM, soporte para Postgres (Supabase/Neon) y sesiones en memoria.
- **Infraestructura**: Supabase para persistencia y realtime (ver `SUPABASE_SETUP.md`), Drizzle Kit para migraciones.
- **Utilidades IA**: heurísticas propias (`client/src/lib/pipelineInsights.ts`, `client/src/lib/scoring.ts`) para scores, riesgo, digest y payloads de alertas.

## Estructura del repositorio
```
client/                 # App React (componentes, hooks, lib)
  src/components/       # UI y cards del dashboard
  src/pages/            # Entradas principales (Dashboard, etc.)
  src/lib/              # Capa de datos, scoring, insights
server/                 # Express + endpoints (tsx para dev, build para prod)
shared/                 # Tipos y esquemas Drizzle/ORM
SUPABASE_SETUP.md       # Guía detallada de provisioning en Supabase
README.md               # Este archivo
```

## Arranque rápido (modo demo)
1. Requisitos: Node.js 20+, npm 10+.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Inicia en modo desarrollo (usa demo store local):
   ```bash
   npm run dev
   ```
   - El comando ejecuta Express + Vite (`http://localhost:8080`).
   - Desde el dashboard se puede cargar data ejemplo con **“Inyectar demo”**.

## Conexión a Supabase
1. Duplicá `.env.example` → `.env` y reemplaza `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` por los de tu proyecto.
2. En Supabase ejecuta el script de `SUPABASE_SETUP.md` para crear tablas, views, RLS y realtime.
3. (Opcional) Si quieres desplegar el schema con Drizzle:
   ```bash
   npm run db:push
   ```
4. Ejecuta `npm run dev`. El dashboard detecta Supabase y:
   - Lee/escribe tasks, deals, contacts, timeline.
   - Se suscribe a cambios en tiempo real (`subscribeToChanges`).
   - Registra la resolución de alertas en `timeline_entries` vía `logDealAlertResolution`.

> Si los env vars no están presentes, el sistema cae automáticamente al modo demo en memoria, por lo que es seguro desarrollar sin Supabase.

## Activar el Digest IA con modelos generativos
1. Añade a tu `.env` **server side** (o `.env.local`) las variables:
   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_API_MODEL=gpt-4o-mini    # Opcional, por defecto gpt-4o-mini
   OPENAI_API_MAX_TOKENS=700       # Opcional
   AI_DIGEST_CACHE_TTL_MS=300000   # Opcional, TTL en ms (5 min por defecto)
   ```
   También puedes sobreescribir `OPENAI_API_BASE` si usas un proxy compatible con OpenAI.
2. Reinicia `npm run dev`. El backend expone `POST /api/ai/digest` y usará la clave para generar resúmenes.
3. En el dashboard pulsa **“Generar”** en la tarjeta **Digest IA**. Si la clave no está configurada, se mostrará el digest heurístico original como fallback.
4. Las respuestas y errores de la IA se registran en consola (`[AI] generateDigest...`) para debugging rápido.

### Logs y observabilidad
- Para persistir llamadas IA, define `SUPABASE_SERVICE_ROLE_KEY` (service role key de tu proyecto).
- Crea la tabla `ai_logs` en Supabase (usa SQL editor):
  ```sql
  create table if not exists ai_logs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    job text not null,
    status text not null,
    provider text,
    elapsed_ms integer,
    prompt_tokens integer,
    completion_tokens integer,
    total_tokens integer,
    used_fallback boolean,
    payload_hash text,
    metadata jsonb,
    error_message text
  );

  alter table ai_logs enable row level security;
  -- opcional: políticas extra si deseas consultar con anon key
  ```
- Con la service key presente, cada invocación IA se inserta en `ai_logs` (incluye tokens, latencia, fallbacks y cache-hits).

### Endpoints IA disponibles
- `POST /api/ai/digest`: genera el resumen ejecutivo (usa caché en memoria con TTL configurable).
- `POST /api/ai/next-step`: propone el próximo paso de un deal. El Kanban muestra un botón “Próximo paso” dentro del panel lateral.
- `POST /api/ai/contact-summary`: resume la situación de un contacto; disponible desde la tabla de contactos mediante el botón “IA” (incluye opción para copiar el resumen).

## Scripts principales
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server (Express + Vite con HMR) |
| `npm run build` | Empaqueta cliente y server (`dist/`) |
| `npm start` | Ejecuta build en modo producción |
| `npm run check` | Comprobación de tipos con `tsc` |
| `npm run test` | Ejecuta la suite de pruebas (Node Test + esbuild) |
| `npm run qa` | Corre tipos y tests de una sola vez |
| `npm run db:push` | Sincroniza schema con la base (Drizzle Kit) |

No hay un script de lint/test definido actualmente.

## Flujo de datos y heurísticas IA
- **`client/src/lib/db.ts`** gestiona el data source (Supabase vs demo) y expone helpers (`seedDemo`, `subscribeToChanges`, CRUD).
- **`client/src/lib/scoring.ts`** calcula score, prioridad y riesgo basándose en actividad, probabilidad, etapa y valor.
- **`client/src/lib/pipelineInsights.ts`** deriva atención, alertas, payloads para canales y digest diario.
- **Componentes clave**:
  - `DealAlertsBanner` + `UpcomingActionsCard`: sugieren acciones, enlazan al pipeline, registran resoluciones.
  - `DealsKanban`: drag & drop, highlight al navegar desde alertas, tooltips “Why Hot/Risk”.
  - `PipelineSummaryCard` y `ManagerMetricsPanel`: explican hot/risk, conversiones, ciclo, ranking.
  - `Dashboard` arma el layout, controla secciones, digest modal y manera de enlazar todo.

## Flujo de colaboración & extensiones
- Los botones **“Preparar envío a Slack/Teams”** y **“Generar digest diario”** generan payloads listos para integrar con webhooks/bots.
- El digest se muestra en un modal y también se imprime en consola para facilitar la automatización.
- Las resoluciones de alertas quedan documentadas en el timeline para trazabilidad.

## Buenas prácticas de desarrollo
- Código en TypeScript con módulos por dominio.
- React Query centraliza estado remoto y cachea respuestas.
- Tailwind + shadcn/ui para estilos consistentes.
- Utiliza `Skeleton` y estados de carga en cada card para mantener UX fluida.
- Mantén el esquema Supabase alineado para que campos como `risk_level`, `inactivity_days`, `owner_id` estén presentes.

## Roadmap sugerido
- Conectar Slack/Teams usando el payload existente (`buildAlertsChannelPayload`).
- Añadir filtros de fecha y owners en la vista de métricas.
- Integrar IA generativa para redactar resúmenes y próximos pasos directamente en el Kanban/Timeline.
- Añadir tests E2E o contract tests para la capa de datos.

---
Para más detalles sobre la infraestructura de Supabase revisa `SUPABASE_SETUP.md`. Para el contexto histórico del proyecto original puedes consultar `replit.md`.
