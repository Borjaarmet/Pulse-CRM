import { useState, useEffect } from "react";

interface HeaderProps {
  isDemo: boolean;
  onInjectDemo: () => void;
  onRefresh: () => void;
}

function ModeBadge({ isDemo }: { isDemo: boolean }) {
  return (
    <div
      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg
        ${isDemo ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-500/10 text-zinc-300'}`}
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full ${isDemo ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
      <span className="text-xs font-medium">
        {isDemo ? 'Demo Mode' : 'Real Mode (Supabase)'}
      </span>
    </div>
  );
}

export default function Header({ isDemo, onInjectDemo, onRefresh }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ?? (prefersDark ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground text-sm">⚡</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Pulse CRM</h1>
            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
              Dashboard POC
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ModeBadge isDemo={isDemo} />

            {/* Solo permitir sembrar datos en modo Demo */}
            {isDemo && (
            <button
              onClick={onInjectDemo}
              className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition"
              aria-label="Inyectar datos de demostración"
              data-testid="button-inject-demo"
            >
              Inyectar demo
            </button>
            )}

            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition"
              aria-label="Refrescar datos"
              data-testid="button-refresh"
            >
              Refrescar
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition"
              aria-label={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
              data-testid="button-toggle-theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
