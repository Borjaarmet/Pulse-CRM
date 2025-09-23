import { useMemo } from "react";
import { AlertTriangle, Check, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DealAlert, AlertsChannelPayload } from "@/lib/pipelineInsights";
import { buildAlertsChannelPayload } from "@/lib/pipelineInsights";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DealAlertsBannerProps {
  alerts: DealAlert[];
  onResolve: (alert: DealAlert) => void | Promise<void>;
  onViewDeal: (dealId: string) => void;
  onShareAlerts?: (payload: AlertsChannelPayload) => void;
  isFilteredView?: boolean;
  titleAddon?: string;
}

export default function DealAlertsBanner({
  alerts,
  onResolve,
  onViewDeal,
  onShareAlerts,
  isFilteredView,
  titleAddon,
}: DealAlertsBannerProps) {
  const payload = useMemo(() => buildAlertsChannelPayload(alerts), [alerts]);

  if (alerts.length === 0) {
    return (
      <aside
        className={cn(
          "rounded-xl border p-4 text-sm",
          isFilteredView
            ? "border-sky-500/40 bg-sky-500/10 text-sky-50"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-50",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full",
              isFilteredView ? "bg-sky-500/20 text-sky-200" : "bg-emerald-500/20 text-emerald-200",
            )}
          >
            <Check className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">
              {isFilteredView ? "Sin alertas con la sensibilidad actual" : "Pipeline bajo control"}
            </p>
            <p className="text-xs text-white/80">
              {isFilteredView
                ? "Ajusta la sensibilidad para ver alertas menos críticas."
                : "Sin alertas críticas registradas por la IA."}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-50">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-200">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-50">
              Alertas de pipeline {titleAddon ? `· ${titleAddon}` : ""}
            </p>
            <p className="text-xs text-amber-200/80">
              Deals sin próximo paso o con fecha objetivo vencida.
            </p>
          </div>
        </div>
        {onShareAlerts && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-amber-200 hover:bg-amber-500/20"
                  onClick={() => onShareAlerts(payload)}
                  aria-label="Preparar envío a Slack o Teams"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-xs text-white">
                Preparar resumen para Slack o Teams
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li
            key={alert.deal.id}
            className={cn(
              "rounded-lg border p-3 text-xs",
              alert.severity === "critical"
                ? "border-red-500/40 bg-red-500/15 text-red-50"
                : "border-amber-500/40 bg-amber-500/15 text-amber-50",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="font-semibold">{alert.deal.title}</div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-[10px] uppercase tracking-wide text-white">
                  {alert.priority} · Riesgo {alert.risk}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-white/30 text-[11px]",
                    alert.severity === "critical" ? "text-red-50" : "text-amber-50",
                  )}
                >
                  Score {alert.score}
                </Badge>
              </div>
            </div>

            <p className="mt-1 text-[11px] text-white/70">{alert.reasons.join(" · ")}</p>
            <p className="mt-1 text-[11px] text-white/90">IA sugiere: {alert.recommendedAction}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 bg-white text-slate-900 hover:bg-slate-200"
                onClick={() => onViewDeal(alert.deal.id)}
              >
                Ir al deal
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-white/80 hover:text-white"
                onClick={() => onResolve(alert)}
              >
                <Check className="mr-2 h-3.5 w-3.5" />
                Marcar resuelto
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
