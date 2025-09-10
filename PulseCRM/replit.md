# Overview

This is a static React web application called "Pulse CRM — Dashboard POC" built with Vite, React, and Tailwind CSS. The application serves as a minimal CRM dashboard that displays task management, deal tracking, and quick metrics. It operates in two modes: a demo mode with mock data for development/testing, and a Supabase mode for real data persistence when environment variables are configured.

The application features a responsive dashboard interface with task management capabilities, deal pipeline visualization, stalled deal alerts, and quick action shortcuts. It's designed as a proof-of-concept for a customer relationship management system with a focus on task prioritization and deal monitoring.

**Status: Complete and fully functional** - The dashboard includes all requested features: task management with quick add/complete functionality, hot deal calculation, stalled deals detection, quick metrics, dual-mode data handling, and modern responsive design with dark/light theme support.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, modern UI components
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Component Structure**: Modular component architecture with reusable UI components organized in `/components` and `/components/ui` directories

## Backend Architecture
- **Server**: Express.js server with TypeScript support for development and production modes
- **Development**: Integrated Vite development server with HMR (Hot Module Replacement)
- **Database ORM**: Drizzle ORM configured for PostgreSQL with schema definitions in shared directory
- **Data Layer**: Abstracted database layer (`/lib/db.js`) that switches between Supabase client and local mock data based on environment variables

## Dual-Mode Data Strategy
The application implements a flexible data strategy that automatically detects available services:
- **Supabase Mode**: When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, uses Supabase client for real-time data operations
- **Demo Mode**: Falls back to local state management with mock data when Supabase credentials are unavailable
- **Real-time Updates**: Supports live data synchronization in Supabase mode with automatic query invalidation

## Component Design Patterns
- **Card-based Layout**: Dashboard uses a card-based grid system for modular content sections
- **Loading States**: Skeleton loaders provide smooth loading experiences across all components
- **Theme Support**: Dark/light mode toggle with system preference detection and localStorage persistence
- **Responsive Design**: Mobile-first approach with responsive grid layouts and adaptive UI elements

## Data Models
The application manages four core entities:
- **Tasks**: With title, due dates, priority levels, and completion states
- **Deals**: Including company info, amounts, probability scores, and pipeline stages
- **Contacts**: Basic contact information with company associations
- **Timeline**: Activity tracking for audit trails and recent activity feeds

# External Dependencies

## Core Framework Dependencies
- **@vitejs/plugin-react**: React plugin for Vite build system
- **wouter**: Lightweight routing library for single-page application navigation
- **@tanstack/react-query**: Server state management and caching solution

## UI and Styling
- **tailwindcss**: Utility-first CSS framework for styling
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **class-variance-authority**: Type-safe variant API for component styling
- **clsx**: Utility for constructing className strings conditionally

## Database and Backend
- **@supabase/supabase-js**: JavaScript client for Supabase backend-as-a-service
- **drizzle-orm**: TypeScript ORM with PostgreSQL support
- **@neondatabase/serverless**: Serverless PostgreSQL database driver
- **express**: Web application framework for Node.js server

## Development Tools
- **tsx**: TypeScript execution engine for development
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay for Replit environment
- **@replit/vite-plugin-cartographer**: Development tooling for Replit integration

## Utility Libraries
- **date-fns**: Date manipulation and formatting library
- **nanoid**: URL-safe unique string ID generator
- **zod**: TypeScript-first schema validation library