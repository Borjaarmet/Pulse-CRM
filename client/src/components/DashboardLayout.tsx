import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users2,
  Building2,
  LineChart,
  ClipboardList,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: (active: string) => ReactNode;
  isDemo: boolean;
  onInjectDemo: () => void;
  onRefresh: () => void;
  initialSection?: string;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Pipeline", icon: Briefcase },
  { label: "Contactos", icon: Users2 },
  { label: "Empresas", icon: Building2 },
  { label: "Tareas", icon: ClipboardList },
  { label: "Métricas", icon: LineChart },
  { label: "Equipo", icon: ShieldCheck, disabled: true },
];

function DashboardSidebar({
  active,
  onSelect,
  items,
  isMobile = false,
  onClose,
}: {
  active: string;
  items: NavItem[];
  onSelect: (item: NavItem) => void;
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = isMobile ? true : isExpanded;

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 bg-[#1c418c] border-r border-white/5 text-sm overflow-hidden transition-[width] duration-200 ease-in-out",
        expanded ? "w-64" : "w-16",
        isMobile ? "h-full" : "hidden lg:flex lg:h-screen lg:fixed z-50 lg:top-0",
      )}
      onMouseEnter={() => !isMobile && setIsExpanded(true)}
      onMouseLeave={() => !isMobile && setIsExpanded(false)}
    >
      <div
        className={cn(
          "flex items-center border-b border-white/10 px-3 py-6 gap-3",
          expanded ? "justify-start" : "justify-center",
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg font-semibold text-white">
          M
        </div>
        <div
          className={cn(
            "transition-all duration-200",
            expanded
              ? "ml-3 opacity-100 translate-x-0"
              : "ml-0 w-0 overflow-hidden pointer-events-none opacity-0 -translate-x-2",
          )}
        >
          <div className="font-semibold text-white text-lg">MindLab</div>
          <div className="text-xs text-white/50">Pulse CRM</div>
        </div>
        {isMobile && (
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/10 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={cn("flex-1 py-6 space-y-1", expanded ? "px-3" : "px-2")}
      >
        {items.map(({ label, icon: Icon, disabled }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              type="button"
              className={cn(
                "group w-full flex items-center rounded-lg py-2 transition-all",
                expanded ? "px-3 justify-start gap-3" : "px-0 justify-center",
                disabled
                  ? "cursor-not-allowed text-white/30"
                  : isActive
                    ? "bg-blue-500/10 text-white border border-blue-500/40"
                    : "text-white/60 hover:bg-white/5",
              )}
              onClick={() => {
                if (disabled) return;
                onSelect({ label, icon: Icon });
                onClose?.();
              }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 group-hover:bg-white/15">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                className={cn(
                  "font-medium whitespace-nowrap transition-all duration-200",
                  expanded
                    ? "opacity-100 translate-x-0 ml-2"
                    : "ml-0 w-0 overflow-hidden pointer-events-none opacity-0",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className={cn("px-3 py-6 transition-all", expanded ? "opacity-100" : "opacity-80")}
      >
        {expanded ? (
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            Coach IA
          </button>
        ) : (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );
}

function DashboardTopbar({
  isDemo,
  onInjectDemo,
  onRefresh,
  active,
  onToggleSidebar,
}: Pick<DashboardLayoutProps, "isDemo" | "onInjectDemo" | "onRefresh"> & {
  active: string;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/5 bg-transparent px-4 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white lg:hidden"
          onClick={onToggleSidebar}
          aria-label="Abrir navegación"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-xl font-semibold text-white">{active}</h1>
          <p className="text-xs text-white/60">AI Activo</p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          ⚡ IA Activa
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="hidden sm:inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Refrescar
        </button>
        {isDemo && (
          <button
            type="button"
            onClick={onInjectDemo}
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            Inyectar demo
          </button>
        )}
        <div className="hidden sm:flex flex-col items-end text-xs text-white/60">
          <span className="font-semibold text-white">Borja Armet</span>
          <span>Sales Rep</span>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
  isDemo,
  onInjectDemo,
  onRefresh,
  initialSection = "Dashboard",
  activeSection,
  onSectionChange,
}: DashboardLayoutProps) {
  const navItems = useMemo(() => DEFAULT_NAV_ITEMS, []);
  const [internalActive, setInternalActive] = useState(initialSection);
  const active = activeSection ?? internalActive;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setInternalActive(initialSection);
  }, [initialSection]);

  const handleSelect = useCallback(
    (item: NavItem) => {
      if (!activeSection) {
        setInternalActive(item.label);
      }
      onSectionChange?.(item.label);
    },
    [activeSection, onSectionChange],
  );

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4f74b4] via-[#1b2f5f] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(37,99,235,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_80%,rgba(14,116,144,0.15),transparent_65%)]" />
        <div className="absolute -top-24 left-[15%] h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <div className="absolute top-[40%] right-[10%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-12rem] left-[35%] h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px] animate-[pulse_11s_ease-in-out_infinite]" />
      </div>

      <div className="relative flex min-h-screen">
        <DashboardSidebar active={active} items={navItems} onSelect={handleSelect} />

        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileSidebarOpen(false)} />
            <div className="relative h-full w-64">
              <DashboardSidebar
                active={active}
                items={navItems}
                onSelect={handleSelect}
                isMobile
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <DashboardTopbar
            isDemo={isDemo}
            onInjectDemo={onInjectDemo}
            onRefresh={onRefresh}
            active={active}
            onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-6">
              {children(active)}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
