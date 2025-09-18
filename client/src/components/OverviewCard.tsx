import Card from "@/components/Card";
import ScoringTooltip from "@/components/ScoringTooltip";
import { Button } from "@/components/ui/button";
import type { Deal, Task } from "@/lib/types";
import { calculateDealScore, calculateRiskLevel } from "@/lib/scoring";
import { useMemo, useState } from "react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface OverviewCardProps {
  deals: Deal[];
  tasks: Task[];
  contactsActivos: number;
  isDealsLoading: boolean;
  isTasksLoading: boolean;
}

export default function OverviewCard({
  deals,
  tasks,
  contactsActivos,
  isDealsLoading,
  isTasksLoading,
}: OverviewCardProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const insights = useMemo(() => {
    const enriched = deals.map((deal) => {
      const scoring = calculateDealScore(deal);
      const risk = calculateRiskLevel(deal);
      return { deal, scoring, risk };
    });

    const counts = {
      hot: enriched.filter(({ scoring }) => scoring.priority === "Hot").length,
      warm: enriched.filter(({ scoring }) => scoring.priority === "Warm").length,
      cold: enriched.filter(({ scoring }) => scoring.priority === "Cold").length,
    };

    const averageScore = enriched.length
      ? Math.round(enriched.reduce((sum, { scoring }) => sum + scoring.score, 0) / enriched.length)
      : 0;

    const critical = enriched.filter(({ scoring, risk, deal }) => {
      const inactivity = deal.inactivity_days ?? 0;
      return risk === "Alto" || (scoring.priority === "Hot" && inactivity >= 5) || scoring.score < 45;
    });

    const openPipeline = enriched.reduce((sum, { deal }) => {
      if (deal.status !== "Open") return sum;
      const amount = Number(deal.amount ?? 0);
      return sum + (isFinite(amount) ? amount : 0);
    }, 0);

    return { counts, critical, averageScore, openPipeline };
  }, [deals]);

  const hotGradient = "from-[#FF6B6B]/40 to-[#FF8E53]/40 text-white";
  const warmGradient = "from-[#FBD38D]/60 to-[#F6E05E]/60 text-slate-900";
  const coldGradient = "from-[#63B3ED]/40 to-[#7F9CF5]/40 text-white";

  const activeTasksCount = useMemo(
    () => tasks.filter((task) => task.state !== "Done").length,
    [tasks],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card className="relative z-10 bg-white/5">
      <div className="space-y-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/70">Buenos días 👋</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {`Tienes ${isDealsLoading ? "—" : insights.counts.hot} deals calientes y ${isTasksLoading ? "—" : activeTasksCount} tareas activas`}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              La IA recomienda priorizar los deals con mayor riesgo esta mañana.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-right">
            <p className="text-xs uppercase tracking-wide text-white/60">Pipeline activo</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(insights.openPipeline)}</p>
            <p className="text-xs text-white/40">Actualizado hace un momento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ScoringTooltip type="hot" count={insights.counts.hot}>
            <div className="min-h-[112px] rounded-2xl border border-red-500/30 bg-gradient-to-br from-rose-500/20 to-orange-500/20 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Deals Hot</span>
                <span className="text-2xl font-semibold text-white">
                  {isDealsLoading ? "—" : insights.counts.hot}
                </span>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-rose-500/40 px-3 py-1 text-xs font-semibold text-white">
                Prioridad Hot
              </span>
            </div>
          </ScoringTooltip>

          <ScoringTooltip type="warm" count={insights.counts.warm}>
            <div className="min-h-[112px] rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-200/60 via-amber-300/50 to-yellow-200/60 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-900">Deals Warm</span>
                <span className="text-2xl font-semibold text-slate-900">
                  {isDealsLoading ? "—" : insights.counts.warm}
                </span>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-900">
                Prioridad Warm
              </span>
            </div>
          </ScoringTooltip>

          <ScoringTooltip type="cold" count={insights.counts.cold}>
            <div className="min-h-[112px] rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-400/25 via-sky-500/25 to-indigo-500/25 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Deals Cold</span>
                <span className="text-2xl font-semibold text-white">
                  {isDealsLoading ? "—" : insights.counts.cold}
                </span>
              </div>
              <span className="mt-2 inline-flex items-center rounded-full bg-sky-500/50 px-3 py-1 text-xs font-semibold text-white">
                Prioridad Cold
              </span>
            </div>
          </ScoringTooltip>

          <TooltipProvider> 
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="min-h-[112px] cursor-help rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
                  <p className="text-sm text-white/70">Contactos activos</p>
                  <p className="text-2xl font-semibold text-white">{contactsActivos}</p>
                  <p className="mt-2 text-xs text-white/50">Interacción en los últimos 14 días</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="z-50 max-w-xs text-xs">
                Contactos con llamadas, emails o tareas vinculadas en los últimos 14 días. Ayuda a priorizar seguimiento.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/20 via-emerald-500/20 to-teal-400/20 px-4 py-4">
            <p className="text-sm text-white/80">Score promedio</p>
            <p className="text-2xl font-semibold text-white">{isDealsLoading ? "—" : insights.averageScore}</p>
            <p className="mt-2 text-xs text-white/60">Salud general del pipeline</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Acciones sugeridas por IA</h3>
              <p className="text-xs text-white/50">Haz clic para ver las recomendaciones priorizadas.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/40 bg-transparent text-sm text-white hover:bg-white/10"
              onClick={() => setShowSuggestions((prev) => !prev)}
            >
              {showSuggestions ? "Cerrar" : "Ver sugerencias"}
            </Button>
          </div>

          {showSuggestions ? (
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
              {insights.critical.length > 0 ? (
                insights.critical.slice(0, 3).map(({ deal, scoring, risk }) => {
                  const suggestion = risk === "Alto"
                    ? "Contacta hoy y actualiza el próximo paso."
                    : scoring.priority === "Hot"
                      ? "Prepara el cierre inmediato."
                      : "Revisa objeciones y reengancha.";
                  return (
                    <div key={deal.id} className="rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-sm font-semibold text-white">{deal.title}</p>
                      <p className="text-xs text-white/60">Riesgo {risk} · Score {scoring.score}</p>
                      <p className="mt-1 text-xs text-blue-200">IA sugiere: {suggestion}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/60">Sin deals críticos. Excelente trabajo.</p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/60">Pulsa "Ver sugerencias" para ver las acciones recomendadas.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
