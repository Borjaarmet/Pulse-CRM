import { useMemo } from "react";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import type { Deal } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateDealScore } from "@/lib/scoring";
import { computeDealAttention } from "@/lib/pipelineInsights";

interface PipelineSummaryCardProps {
  deals: Deal[];
  isLoading?: boolean;
}

const STAGE_ORDER = [
  "Prospección",
  "Calificación",
  "Propuesta",
  "Negociación",
  "Cierre",
] as const;

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function PipelineSummaryCard({ deals, isLoading }: PipelineSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: STAGE_ORDER.length }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const openDeals = deals.filter((deal) => deal.status === "Open");
  const wonDeals = deals.filter((deal) => deal.status === "Won");
  const lostDeals = deals.filter((deal) => deal.status === "Lost");

  const openValue = openDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
  const wonValue = wonDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
  const lostValue = lostDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
  const totalPipelineValue = openValue + wonValue;

  const stageStats = STAGE_ORDER.map((stage) => {
    const stageDeals = openDeals.filter((deal) => deal.stage === stage);
    const value = stageDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
    return {
      stage,
      count: stageDeals.length,
      value,
    };
  });

  const maxStageValue = Math.max(...stageStats.map((stat) => stat.value), 0);
  const maxStageCount = Math.max(...stageStats.map((stat) => stat.count), 0);

  const hotInsights = useMemo(
    () =>
      openDeals
        .filter((deal) => deal.priority === "Hot")
        .map((deal) => ({ deal, scoring: calculateDealScore(deal) }))
        .sort((a, b) => b.scoring.score - a.scoring.score),
    [openDeals],
  );

  const attentionDeals = useMemo(() => computeDealAttention(openDeals), [openDeals]);
  const highRiskDeals = useMemo(
    () => attentionDeals.filter((item) => item.risk === "Alto"),
    [attentionDeals],
  );

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Pipeline este mes</h2>
          <p className="text-xs text-muted-foreground">
            Estado actual de tus oportunidades.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-blue-200/80">Abiertos</p>
          <p className="mt-1 text-lg font-semibold text-white">{openDeals.length}</p>
          <p className="text-xs text-blue-200/70">{CURRENCY_FORMATTER.format(openValue)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200/80">Ganados</p>
          <p className="mt-1 text-lg font-semibold text-white">{wonDeals.length}</p>
          <p className="text-xs text-emerald-200/70">{CURRENCY_FORMATTER.format(wonValue)}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-rose-200/80">Perdidos</p>
          <p className="mt-1 text-lg font-semibold text-white">{lostDeals.length}</p>
          <p className="text-xs text-rose-200/70">{CURRENCY_FORMATTER.format(lostValue)}</p>
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-purple-200/80">Valor total</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {CURRENCY_FORMATTER.format(totalPipelineValue)}
          </p>
          <p className="text-xs text-purple-200/70">Open + Ganados</p>
        </div>
      </div>

      {(hotInsights.length > 0 || highRiskDeals.length > 0) && (
        <TooltipProvider>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {hotInsights.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 font-medium text-red-100"
                  >
                    🔥 Why Hot ({hotInsights.length})
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-slate-900 text-xs text-white">
                  <p className="text-[11px] font-semibold text-white">Top deals calientes</p>
                  <ul className="mt-2 space-y-2">
                    {hotInsights.slice(0, 3).map(({ deal, scoring }) => (
                      <li key={deal.id}>
                        <p className="font-semibold text-white">{deal.title}</p>
                        <p className="text-[11px] text-white/70">
                          Score {scoring.score} · {(scoring.reasoning[0] ?? "Alta probabilidad y actividad reciente")}
                        </p>
                      </li>
                    ))}
                    {hotInsights.length > 3 && (
                      <li className="text-[11px] text-white/60">
                        … y {hotInsights.length - 3} deals adicionales en Hot.
                      </li>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
            {highRiskDeals.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 font-medium text-amber-100"
                  >
                    ⚠ Why Risk ({highRiskDeals.length})
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-slate-900 text-xs text-white">
                  <p className="text-[11px] font-semibold text-white">Motivos de riesgo alto</p>
                  <ul className="mt-2 space-y-2">
                    {highRiskDeals.slice(0, 3).map(({ deal, reasons }) => (
                      <li key={deal.id}>
                        <p className="font-semibold text-white">{deal.title}</p>
                        <p className="text-[11px] text-white/70">{reasons.join(" · ")}</p>
                      </li>
                    ))}
                    {highRiskDeals.length > 3 && (
                      <li className="text-[11px] text-white/60">
                        … y {highRiskDeals.length - 3} deals adicionales en riesgo.
                      </li>
                    )}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}

      <div className="mt-6 space-y-3">
        {stageStats.map(({ stage, count, value }) => {
          const ratio = openValue > 0 ? value / openValue : maxStageCount > 0 ? count / maxStageCount : 0;
          const widthPercent = ratio > 0 ? Math.min(Math.max(ratio * 100, 8), 100) : 0;
          return (
            <div key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stage}</span>
                <span>
                  {count} deal{count === 1 ? "" : "s"} · {CURRENCY_FORMATTER.format(value)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
