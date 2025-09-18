import { type ComponentType, type ReactNode, useCallback, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users2,
  Building2,
  LineChart,
  ClipboardList,
  Briefcase,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  isDemo: boolean;
  onInjectDemo: () => void;
  onRefresh: () => void;
  initialSection?: string;
}

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  targetId?: string;
  disabled?: boolean;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, targetId: "dashboard-overview" },
  { label: "Contactos", icon: Users2, targetId: "contacts-section" },
  { label: "Pipeline", icon: Briefcase, targetId: "pipeline-section" },
  { label: "Tareas", icon: ClipboardList, targetId: "tasks-section" },
  { label: "Empresas", icon: Building2, targetId: "companies-section" },
  { label: "Métricas", icon: LineChart, targetId: "metrics-section" },
  { label: "Equipo", icon: ShieldCheck, disabled: true },
];

function DashboardSidebar({
  active,
  onSelect,
  items,
}: {
  active: string;
  items: NavItem[];
  onSelect: (item: NavItem) => void;
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0F1624] border-r border-white/5 text-sm">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="font-semibold text-white text-lg">MindLab</div>
        <div className="text-xs text-white/50">Pulse CRM</div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {items.map(({ label, icon: Icon, targetId, disabled }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              type="button"
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                disabled
                  ? "cursor-not-allowed text-white/30"
                  : isActive
                    ? "bg-blue-500/10 text-white border border-blue-500/40"
                    : "text-white/60 hover:bg-white/5"
              )}
              onClick={() => {
                if (disabled) return;
                onSelect({ label, icon: Icon, targetId });
                if (!targetId) return;
                const section = document.getElementById(targetId);
                section?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-6 py-6">
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <Sparkles className="h-4 w-4" />
          Coach IA
        </button>
      </div>
    </aside>
  );
}

function DashboardTopbar({
  isDemo,
  onInjectDemo,
  onRefresh,
}: Pick<DashboardLayoutProps, "isDemo" | "onInjectDemo" | "onRefresh">) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/5 bg-[#0B0F1A]/80 px-4 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-white/50">AI Activo</p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          ⚡ IA Activa
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
        >
          + Deal
        </button>
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          + Tarea
        </button>
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
}: DashboardLayoutProps) {
  const navItems = useMemo(() => DEFAULT_NAV_ITEMS, []);
  const [active, setActive] = useState(initialSection);

  const handleSelect = useCallback(
    (item: NavItem) => {
      setActive(item.label);
    },
    [],
  );

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Background gradient layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1f3a] via-[#050912] to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(37,99,235,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_80%,rgba(14,116,144,0.15),transparent_65%)]" />

        {/* Floating orbs */}
        <div className="absolute -top-24 left-[15%] h-64 w-64 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
        <div className="absolute top-[40%] right-[10%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-12rem] left-[35%] h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px] animate-[pulse_11s_ease-in-out_infinite]" />
      </div>

      <div className="relative flex min-h-screen">
        <DashboardSidebar active={active} items={navItems} onSelect={handleSelect} />
        <div className="flex flex-1 flex-col">
          <DashboardTopbar
            isDemo={isDemo}
            onInjectDemo={onInjectDemo}
            onRefresh={onRefresh}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
