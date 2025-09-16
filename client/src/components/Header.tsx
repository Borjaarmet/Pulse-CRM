import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  isDemo: boolean;
  onInjectDemo: () => void;
  onRefresh: () => void;
}

function ModeBadge({ isDemo }: { isDemo: boolean }) {
  return (
    <div
      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200
        ${isDemo 
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
          : 'bg-muted text-muted-foreground border border-border'
        }`}
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full transition-all duration-200 ${
        isDemo ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
      }`} />
      <span className="text-xs font-medium">
        {isDemo ? 'Demo Mode' : 'Real Mode (Supabase)'}
      </span>
    </div>
  );
}

export default function Header({ isDemo, onInjectDemo, onRefresh }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground text-sm">⚡</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Pulse CRM</h1>
              <span className="text-xs text-muted-foreground -mt-1">Dashboard POC</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ModeBadge isDemo={isDemo} />

            {/* Solo permitir sembrar datos en modo Demo */}
            {isDemo && (
              <button
                onClick={onInjectDemo}
                className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-200 button-hover"
                aria-label="Inyectar datos de demostración"
              >
                Inyectar demo
              </button>
            )}

            <button
              onClick={onRefresh}
              className="px-3 py-1.5 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all duration-200 button-hover"
              aria-label="Refrescar datos"
            >
              Refrescar
            </button>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
