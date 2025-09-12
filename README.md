# Pulse CRM Dashboard POC

Un dashboard CRM moderno construido con React, TypeScript, Tailwind CSS y Supabase.

## Características

- **Modo Demo**: Funciona sin configuración, usando almacenamiento local
- **Modo Real**: Conecta a Supabase para persistencia de datos
- **Tiempo Real**: Actualizaciones automáticas cuando está conectado a Supabase
- **Tema Claro/Oscuro**: Toggle persistente
- **Responsive**: Optimizado para móvil, tablet y desktop
- **Gestión de Tareas**: Crear, marcar como completadas, editar y eliminar
- **Gestión de Deals**: CRUD completo con métricas y scoring
- **Gestión de Contactos**: CRUD completo con búsqueda
- **Métricas**: Dashboard con KPIs en tiempo real

## Configuración Local

### Prerrequisitos

- Node.js 18+ 
- npm o yarn

### Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd Pulse-CRM
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno (opcional para modo Demo):
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

### Ejecución

#### Modo Demo (sin Supabase)
```bash
npm run dev
```
La aplicación funcionará con datos locales sin necesidad de configuración adicional.

#### Modo Real (con Supabase)
1. Configura las variables de entorno en `.env`
2. Ejecuta:
```bash
npm run dev
```

### Build para Producción

```bash
npm run build
```

Los archivos se generarán en `dist/public/`.

## Despliegue en Netlify

### Configuración de Variables de Entorno

En el dashboard de Netlify, ve a Site Settings > Environment Variables y añade:

- `VITE_SUPABASE_URL`: Tu URL de Supabase
- `VITE_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase

### Configuración de Redirecciones SPA

El archivo `netlify.toml` ya está configurado para redirecciones SPA:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Build Command

```bash
npm run build
```

### Publish Directory

```
dist/public
```

## Estructura del Proyecto

```
client/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/             # Componentes base (shadcn/ui)
│   │   ├── Card.tsx        # Componente de tarjeta
│   │   ├── Header.tsx      # Header con modo y controles
│   │   ├── TasksCard.tsx   # Gestión de tareas
│   │   ├── DealsList.tsx   # Lista de deals
│   │   ├── ContactsList.tsx # Lista de contactos
│   │   └── ...
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilidades y configuración
│   │   ├── db.ts          # Funciones de base de datos
│   │   ├── types.ts       # Tipos TypeScript
│   │   └── utils.ts       # Utilidades generales
│   └── pages/             # Páginas de la aplicación
├── index.html
└── ...
```

## Modos de Operación

### Modo Demo
- **Detección**: Sin variables de entorno de Supabase
- **Almacenamiento**: Local (memoria del navegador)
- **Persistencia**: Se pierde al recargar la página
- **Tiempo Real**: No disponible
- **Uso**: Ideal para pruebas y demostraciones

### Modo Real
- **Detección**: Con variables de entorno de Supabase configuradas
- **Almacenamiento**: Supabase (PostgreSQL)
- **Persistencia**: Permanente
- **Tiempo Real**: Disponible con suscripciones
- **Uso**: Producción y desarrollo con datos reales

## API y Base de Datos

### Esquema de Supabase

El proyecto espera las siguientes tablas en Supabase:

#### tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  state TEXT CHECK (state IN ('To Do', 'Done')) DEFAULT 'To Do',
  priority TEXT CHECK (priority IN ('Alta', 'Media', 'Baja')) DEFAULT 'Media',
  inserted_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### deals
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT,
  amount DECIMAL,
  stage TEXT DEFAULT 'Prospección',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  target_close_date TIMESTAMPTZ,
  next_step TEXT,
  status TEXT CHECK (status IN ('Open', 'Won', 'Lost')) DEFAULT 'Open',
  risk TEXT DEFAULT 'Bajo',
  contact_id UUID REFERENCES contacts(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### contacts
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  inserted_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Políticas RLS (Row Level Security)

Para el modo demo, se pueden usar políticas abiertas:

```sql
-- Habilitar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Políticas demo (solo para POC)
CREATE POLICY "tasks_demo_all" ON tasks FOR ALL USING (true);
CREATE POLICY "deals_demo_all" ON deals FOR ALL USING (true);
CREATE POLICY "contacts_demo_all" ON contacts FOR ALL USING (true);
```

## Desarrollo

### Scripts Disponibles

- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run start`: Servidor de producción
- `npm run check`: Verificación de tipos TypeScript

### Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Estado**: TanStack Query (React Query)
- **UI**: shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL)
- **Build**: Vite
- **Deploy**: Netlify

### Convenciones de Código

- **TypeScript estricto**: Sin `any` explícitos
- **Componentes funcionales**: Con hooks
- **Naming**: camelCase para variables, PascalCase para componentes
- **Data attributes**: `data-testid` para testing
- **Responsive**: Mobile-first con Tailwind

## Testing

El proyecto incluye `data-testid` attributes para facilitar testing automatizado:

- `data-testid="dashboard"`: Contenedor principal
- `data-testid="button-inject-demo"`: Botón inyectar demo
- `data-testid="button-refresh"`: Botón refrescar
- `data-testid="input-task-title"`: Input título tarea
- `data-testid="button-add-task"`: Botón añadir tarea
- Y muchos más...

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

MIT License - ver archivo LICENSE para más detalles.