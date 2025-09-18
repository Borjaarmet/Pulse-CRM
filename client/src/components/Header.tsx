// import ThemeToggle from "./ThemeToggle";

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
    <header className="relative z-50 border-b border-white/10 top-0 transition-all duration-300" style={{
      background: 'rgba(20, 118, 223, 0.1)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-sm">⚡</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white tracking-tight">Pulse CRMMMM</h1>
              <span className="text-xs text-white/70 -mt-1">Dashboard POC</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ModeBadge isDemo={isDemo} />

            {/* Solo permitir sembrar datos en modo Demo */}
            {isDemo && (
              <button
                onClick={onInjectDemo}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg transition-all duration-200 button-hover shadow-lg"
                aria-label="Inyectar datos de demostración"
              >
                ✨ Inyectar demo
              </button>
            )}

            <button
              onClick={onRefresh}
              className="px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 button-hover backdrop-blur-sm border border-white/20"
              aria-label="Refrescar datos"
            >
              🔄 Refrescar
            </button>

            {/* <ThemeToggle /> */}
          </div>
        </div>
      </div>
    </header>
  );
}
