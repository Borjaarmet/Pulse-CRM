import Card from "@/components/Card";
import ScoringTooltip from "@/components/ScoringTooltip";
import { Button } from "@/components/ui/button";
import type { Deal, Task, Priority } from "@/lib/types";
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
    const openDeals = deals.filter((deal) => deal.status === "Open");
    const enriched = openDeals.map((deal) => {
      const scoring = calculateDealScore(deal);
      const risk = calculateRiskLevel(deal);
      return { deal, scoring, risk };
    });

    const withPriority = enriched.map(({ deal, scoring, risk }) => ({
      deal,
      scoring,
      risk,
      finalPriority: (deal.priority as Priority | undefined) ?? scoring.priority,
    }));

    const counts = {
      hot: withPriority.filter(({ finalPriority }) => finalPriority === "Hot").length,
      warm: withPriority.filter(({ finalPriority }) => finalPriority === "Warm").length,
      cold: withPriority.filter(({ finalPriority }) => finalPriority === "Cold").length,
    };

    const averageScore = enriched.length
      ? Math.round(enriched.reduce((sum, { scoring }) => sum + scoring.score, 0) / enriched.length)
      : 0;

    const critical = withPriority.filter(({ scoring, risk, deal, finalPriority }) => {
      const inactivity = deal.inactivity_days ?? 0;
      return risk === "Alto" || (finalPriority === "Hot" && inactivity >= 5) || scoring.score < 45;
    });

    const openPipeline = withPriority.reduce((sum, { deal }) => {
      const amount = Number(deal.amount ?? 0);
      return sum + (isFinite(amount) ? amount : 0);
    }, 0);

    return { counts, critical, averageScore, openPipeline };
  }, [deals]);

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

  const metricCards = [
    {
      id: "hot",
      tooltipType: "hot" as const,
      value: isDealsLoading ? "—" : insights.counts.hot,
      title: "Deals Hot",
      caption: "Prioridad Hot",
      gradient: "from-rose-500/25 via-orange-500/20 to-amber-500/25",
      border: "border-rose-400/40",
      text: "text-white",
    },
    {
      id: "warm",
      tooltipType: "warm" as const,
      value: isDealsLoading ? "—" : insights.counts.warm,
      title: "Deals Warm",
      caption: "Prioridad Warm",
      gradient: "from-amber-200/70 via-amber-300/60 to-yellow-200/70",
      border: "border-amber-400/40",
      text: "text-slate-900",
    },
    {
      id: "cold",
      tooltipType: "cold" as const,
      value: isDealsLoading ? "—" : insights.counts.cold,
      title: "Deals Cold",
      caption: "Prioridad Cold",
      gradient: "from-blue-500/25 via-sky-500/20 to-indigo-500/25",
      border: "border-blue-400/40",
      text: "text-white",
    },
  ];

  return (
    <Card className="bg-white/5 p-6 sm:p-8">
      <div className="space-y-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/40">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">⚡</span>
              Resumen ejecutivo
            </div>
            <h2 className="text-3xl font-semibold leading-tight text-white">
              {isDealsLoading
                ? "Analizando pipeline…"
                : `IA detecta ${insights.counts.hot} deals calientes y ${activeTasksCount} tareas vivas`}
            </h2>
            <p className="max-w-xl text-sm text-white/65">
              Prioriza lo crítico y deja al asistente IA guiar el resto.
            </p>
          </div>
          <aside className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/10 p-5 text-right">
            <p className="text-xs uppercase tracking-wide text-white/60">Pipeline activo</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(insights.openPipeline)}</p>
            <p className="text-xs text-white/40">Actualizado hace un momento</p>
          </aside>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {metricCards.map(({ id, tooltipType, value, title, caption, gradient, border, text }) => (
            <ScoringTooltip key={id} type={tooltipType} count={Number(value) || 0}>
              <div
                className={`flex h-full flex-col justify-between rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-4 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.65)] transition hover:border-white/30`}
              >
                <p className={`text-xs uppercase tracking-wide text-center ${text} opacity-80`}>{title}</p>
                <p className={`text-3xl font-semibold text-center ${text}`}>{value}</p>
                <span className={`self-start rounded-full text-center px-3 py-1 text-xs font-semibold ${text === "text-white" ? "bg-white/20 text-white" : "bg-white/70 text-slate-900"}`}>
                  {caption}
                </span>
              </div>
            </ScoringTooltip>
          ))}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-full flex-col justify-between rounded-2xl border border-blue-400/30 bg-gradient-to-br from-indigo-500/20 via-sky-500/15 to-blue-600/25 p-4 text-white shadow-[0_20px_45px_-30px_rgba(0,0,0,0.65)]">
                  <p className="text-xs uppercase tracking-wide text-white/70">Contactos activos</p>
                  <p className="text-3xl font-semibold text-white">{contactsActivos}</p>
                  <p className="text-xs text-white/55">Interacción en los últimos 14 días</p>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="z-50 max-w-sm rounded-xl border border-white/10 bg-[#0b172b] p-4 text-white shadow-2xl"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">¿Qué cuenta como contacto activo?</h4>
                    <p className="mt-1 text-xs text-white/70">
                      Personas con llamadas, emails o tareas vinculadas dentro de los últimos 14 días. Indican cuentas en movimiento.
                    </p>
                  </div>
                  <div>
                    <h5 className="mb-1 text-xs font-medium text-white/80">Señales que medimos:</h5>
                    <ul className="space-y-1 text-xs text-white/65">
                      <li>• Notas o tareas completadas asociadas recientemente.</li>
                      <li>• Eventos en timeline (reuniones, llamadas, emails).</li>
                      <li>• Cambios de etapa o deals vinculados actualizados.</li>
                    </ul>
                  </div>
                  <p className="text-[10px] italic text-white/50">Tip: Si baja este número, activa campañas de re-engagement.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-full flex-col justify-between rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/20 via-emerald-500/15 to-teal-400/25 p-4 text-white shadow-[0_20px_45px_-30px_rgba(0,0,0,0.65)]">
                  <p className="text-xs uppercase tracking-wide text-white/70">Score promedio</p>
                  <p className="text-3xl font-semibold text-white">{isDealsLoading ? "—" : insights.averageScore}</p>
                  <p className="text-xs text-white/55">Salud general del pipeline</p>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="z-50 max-w-sm rounded-xl border border-white/10 bg-[#0b172b] p-4 text-white shadow-2xl"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">¿Cómo calculamos el score promedio?</h4>
                    <p className="mt-1 text-xs text-white/70">
                      Promedio ponderado del score IA de todos los deals abiertos. Combina probabilidad, monto, actividad y etapa actual.
                    </p>
                  </div>
                  <div>
                    <h5 className="mb-1 text-xs font-medium text-white/80">Factores clave:</h5>
                    <ul className="space-y-1 text-xs text-white/65">
                      <li>• Probabilidad declarada vs. etapa alcanzada.</li>
                      <li>• Valor económico normalizado.</li>
                      <li>• Actividad reciente y tiempo sin interacción.</li>
                      <li>• Tiempo en etapa y momentum del pipeline.</li>
                    </ul>
                  </div>
                  <p className="text-[10px] italic text-white/50">Score &gt; 70 = pipeline sano. Si baja de 45, acciona coaching inmediato.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Acciones sugeridas por IA</h3>
              <p className="text-xs text-white/50">Resumen de movimientos prioritarios basados en riesgo y SLA.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start border-white/30 bg-transparent text-sm text-white hover:bg-white/10"
              onClick={() => setShowSuggestions((prev) => !prev)}
            >
              {showSuggestions ? "Cerrar" : "Ver recomendaciones IA"}
            </Button>
          </div>

          {showSuggestions ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {insights.critical.length > 0 ? (
                insights.critical.slice(0, 4).map(({ deal, scoring, risk }) => {
                  const suggestion = risk === "Alto"
                    ? "Contacta hoy y actualiza el próximo paso."
                    : scoring.priority === "Hot"
                      ? "Prepara el cierre inmediato."
                      : "Revisa objeciones y reengancha.";
                  return (
                    <div key={deal.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{deal.title}</span>
                        <span className="text-xs text-white/60">Riesgo {risk}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/60">Score {scoring.score} · Inactividad {deal.inactivity_days ?? 0} días</p>
                      <p className="mt-2 text-xs text-blue-200">IA recomienda: {suggestion}</p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
                  Sin deals críticos. Excelente trabajo: mantén la cadencia y alimenta el pipeline.
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/60">Pulsa "Ver recomendaciones IA" para consultar las próximas jugadas.</p>
          )}
        </section>
      </div>
    </Card>
  );
}
