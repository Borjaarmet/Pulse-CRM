import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { useDealsQuery, useDealTimelineQuery } from "@/hooks/useCrmQueries";
import { updateDeal } from "@/lib/db";
import type { Deal, Priority, RiskLevel, DealStatus } from "@/lib/types";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeDealAttention } from "@/lib/pipelineInsights";
import { calculateDealScore } from "@/lib/scoring";

const STAGE_ORDER = [
  "Prospección",
  "Calificación",
  "Propuesta",
  "Negociación",
  "Cierre",
] as const;

type Stage = (typeof STAGE_ORDER)[number];

const STAGE_DETAILS: Record<Stage, {
  gradient: string;
  border: string;
  badge: string;
  indicator: string;
  description: string;
}> = {
  Prospección: {
    gradient: "from-sky-500/25 via-slate-900/70 to-slate-950/80",
    border: "border-sky-400/30",
    badge: "bg-sky-500/20 text-sky-100",
    indicator: "bg-sky-400/70",
    description: "Identifica y prioriza nuevas oportunidades.",
  },
  Calificación: {
    gradient: "from-blue-500/20 via-slate-900/70 to-slate-950/80",
    border: "border-blue-400/30",
    badge: "bg-blue-500/20 text-blue-100",
    indicator: "bg-blue-400/70",
    description: "Evalúa fit, presupuesto y decisión.",
  },
  Propuesta: {
    gradient: "from-indigo-500/20 via-slate-900/70 to-slate-950/80",
    border: "border-indigo-400/30",
    badge: "bg-indigo-500/20 text-indigo-100",
    indicator: "bg-indigo-400/70",
    description: "Define oferta y material clave.",
  },
  Negociación: {
    gradient: "from-purple-500/20 via-slate-900/70 to-slate-950/80",
    border: "border-purple-400/30",
    badge: "bg-purple-500/20 text-purple-100",
    indicator: "bg-purple-400/70",
    description: "Cierra condiciones y compromisos.",
  },
  Cierre: {
    gradient: "from-emerald-500/20 via-slate-900/70 to-slate-950/80",
    border: "border-emerald-400/30",
    badge: "bg-emerald-500/20 text-emerald-100",
    indicator: "bg-emerald-400/70",
    description: "Ultima firma y traspaso al equipo.",
  },
};

type ClosedStatus = Exclude<DealStatus, "Open">;

const CLOSED_STATUS_ORDER: ClosedStatus[] = ["Won", "Lost"];

const CLOSED_STATUS_DETAILS: Record<ClosedStatus, { label: string; badge: string; empty: string }>
  = {
    Won: {
      label: "Ganados",
      badge: "bg-emerald-500/15 text-emerald-200",
      empty: "Aún sin deals ganados.",
    },
    Lost: {
      label: "Perdidos",
      badge: "bg-rose-500/15 text-rose-200",
      empty: "Aún sin deals perdidos.",
    },
  };

const FALLBACK_STAGE_LABELS: Record<string, string> = {
  Prospección: "Prospección",
  Prospeccion: "Prospección",
  Calificación: "Calificación",
  Calificacion: "Calificación",
  Propuesta: "Propuesta",
  Negociación: "Negociación",
  Negociacion: "Negociación",
  Cierre: "Cierre",
};

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface DealsKanbanProps {
  focusDealId?: string | null;
  onResetFocus?: () => void;
}

function translateDealError(message: string) {
  switch (message) {
    case "NEXT_STEP_REQUIRED":
      return "Debes definir un próximo paso antes de guardar.";
    case "TARGET_CLOSE_REQUIRED":
      return "La fecha objetivo de cierre es obligatoria.";
    case "CLOSE_REASON_REQUIRED":
      return "Indica el motivo al cerrar el deal.";
    default:
      return message;
  }
}

function normalizeStage(value: string | undefined | null): Stage {
  if (!value) return "Prospección";
  const match = STAGE_ORDER.find((stage) => stage === value);
  if (match) return match;
  const fallback = FALLBACK_STAGE_LABELS[value];
  if (fallback && STAGE_ORDER.includes(fallback as Stage)) {
    return fallback as Stage;
  }
  return "Prospección";
}

export default function DealsKanban({ focusDealId, onResetFocus }: DealsKanbanProps = {}) {
  const { data: deals = [], isLoading } = useDealsQuery();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [highlightedDealId, setHighlightedDealId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [amountRange, setAmountRange] = useState<"all" | "lt10" | "bt10_50" | "gt50">("all");
  const [targetFilter, setTargetFilter] = useState<"all" | "overdue" | "thisMonth">("all");
  const [closingStatus, setClosingStatus] = useState<"Won" | "Lost" | null>(null);
  const [closingReason, setClosingReason] = useState("");

  const {
    data: dealTimeline = [],
    isLoading: timelineLoading,
  } = useDealTimelineQuery(selectedDeal?.id, undefined, 40);

  const attentionDeals = useMemo(() => computeDealAttention(deals), [deals]);
  const selectedDealScoring = useMemo(
    () => (selectedDeal ? calculateDealScore(selectedDeal) : null),
    [selectedDeal],
  );
  const selectedDealAttention = useMemo(
    () =>
      selectedDeal
        ? attentionDeals.find((item) => item.deal.id === selectedDeal.id) ?? null
        : null,
    [attentionDeals, selectedDeal],
  );

  type StageEvent = {
    id: string;
    from?: string;
    to: string;
    status?: string;
    closeReason?: string;
    date: string;
  };

  const stageHistory = useMemo<StageEvent[]>(() => {
    return dealTimeline
      .flatMap((entry) => {
        if (!entry.metadata) return [];
        let metadata: any = null;
        try {
          metadata = JSON.parse(entry.metadata);
        } catch (error) {
          metadata = null;
        }

        const changes = Array.isArray(metadata?.changes) ? (metadata.changes as string[]) : [];
        const stageChange = changes.find((change) => change.startsWith("Etapa:"));
        if (!stageChange) return [];

        const afterLabel = stageChange.split("Etapa:")[1]?.trim();
        if (!afterLabel) return [];
        const [fromRaw, toRaw] = afterLabel.split("→").map((part) => part?.trim() ?? "");

        const statusChange = changes
          .find((change) => change.startsWith("Estado:"))
          ?.split("→")
          .pop()
          ?.trim();

        return [
          {
            id: entry.id,
            from: fromRaw || undefined,
            to: (toRaw || fromRaw || "").trim(),
            status: (statusChange ?? metadata?.status) as string | undefined,
            closeReason: metadata?.closeReason ?? undefined,
            date: entry.created_at,
          },
        ];
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dealTimeline]);

  const formatTimelineDate = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const owners = useMemo(() => {
    const ids = new Map<string, string>();
    deals.forEach((deal) => {
      if (deal.owner_id) ids.set(deal.owner_id, deal.owner_id);
    });
    return Array.from(ids.keys());
  }, [deals]);

  const mutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Stage }) => updateDeal(id, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotDeal });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stalledDeals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quickMetrics });
    },
  });

  const closeDealMutation = useMutation({
    mutationFn: ({ status, close_reason }: { status: "Won" | "Lost"; close_reason: string }) => {
      if (!selectedDeal) throw new Error("No deal selected");
      return updateDeal(selectedDeal.id, { status, close_reason });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotDeal });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stalledDeals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quickMetrics });
      const finalStatus = (data?.status ?? closingStatus) as "Won" | "Lost" | null;
      toast({
        title: "Deal cerrado",
        description:
          finalStatus === "Won"
            ? "¡Excelente! El deal se marcó como ganado."
            : finalStatus === "Lost"
              ? "Deal marcado como perdido."
              : "Los cambios se guardaron correctamente.",
      });
      setClosingStatus(null);
      setClosingReason("");
      setSelectedDeal(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo cerrar el deal";
      toast({
        title: "Error",
        description: translateDealError(message),
        variant: "destructive",
      });
    },
  });

  const filteredDeals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return deals.filter((deal) => {
      if (deal.status && deal.status !== "Open") {
        return false;
      }
      const priority = (deal.priority as Priority | undefined) ?? "Cold";
      const risk = (deal.risk_level as RiskLevel | undefined) ?? "Bajo";
      const matchesPriority = priorityFilter === "all" || priority === priorityFilter;
      const matchesRisk = riskFilter === "all" || risk === riskFilter;
      const matchesOwner = ownerFilter === "all" || deal.owner_id === ownerFilter;
      const amountValue = Number(deal.amount ?? 0);
      const matchesAmount =
        amountRange === "all" ||
        (amountRange === "lt10" && amountValue < 10000) ||
        (amountRange === "bt10_50" && amountValue >= 10000 && amountValue <= 50000) ||
        (amountRange === "gt50" && amountValue > 50000);
      const matchesTarget = (() => {
        if (targetFilter === "all") return true;
        if (!deal.target_close_date) return false;
        const targetDate = new Date(deal.target_close_date);
        if (Number.isNaN(targetDate.getTime())) return false;
        const now = new Date();
        if (targetFilter === "overdue") {
          return targetDate.getTime() < now.getTime();
        }
        if (targetFilter === "thisMonth") {
          return (
            targetDate.getFullYear() === now.getFullYear() &&
            targetDate.getMonth() === now.getMonth()
          );
        }
        return true;
      })();
      const matchesSearch =
        !term ||
        (deal.title ?? "").toLowerCase().includes(term) ||
        (deal.company ?? "").toLowerCase().includes(term);
      const needsAttention =
        !deal.next_step ||
        !deal.next_step.trim() ||
        risk === "Alto" ||
        (deal.target_close_date
          ? new Date(deal.target_close_date).getTime() < Date.now()
          : false);
      const matchesAttention = !onlyAttention || needsAttention;
      return (
        matchesPriority &&
        matchesRisk &&
        matchesOwner &&
        matchesAmount &&
        matchesTarget &&
        matchesSearch &&
        matchesAttention
      );
    });
  }, [
    deals,
    priorityFilter,
    riskFilter,
    ownerFilter,
    amountRange,
    targetFilter,
    searchTerm,
    onlyAttention,
  ]);

  const columns = useMemo(() => {
    const grouped = new Map<Stage, { total: number; deals: Deal[] }>();
    STAGE_ORDER.forEach((stage) => {
      grouped.set(stage, { total: 0, deals: [] });
    });

    filteredDeals.forEach((deal) => {
      const stage = normalizeStage(deal.stage);
      const entry = grouped.get(stage);
      if (!entry) return;
      entry.deals.push(deal);
      entry.total += Number(deal.amount ?? 0);
    });

    return STAGE_ORDER.map((stage) => ({ stage, ...grouped.get(stage)! }));
  }, [filteredDeals]);

  const closedDeals = useMemo(() => deals.filter((deal) => deal.status && deal.status !== "Open"), [deals]);

  const closedByStatus = useMemo(() => {
    const grouped: Record<ClosedStatus, Deal[]> = {
      Won: [],
      Lost: [],
    };

    [...closedDeals]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .forEach((deal) => {
        if (deal.status === "Won" || deal.status === "Lost") {
          grouped[deal.status].push(deal);
        }
      });

    return grouped;
  }, [closedDeals]);

  useEffect(() => {
    if (!focusDealId) return;
    const targetDeal = deals.find((deal) => deal.id === focusDealId);
    if (!targetDeal) return;
    setSelectedDeal(targetDeal);
    setHighlightedDealId(focusDealId);
    requestAnimationFrame(() => {
      const element = document.getElementById(`deal-card-${focusDealId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const timer = window.setTimeout(() => {
      setHighlightedDealId((current) => (current === focusDealId ? null : current));
    }, 4000);
    onResetFocus?.();
    return () => {
      window.clearTimeout(timer);
    };
  }, [focusDealId, deals, onResetFocus]);

  useEffect(() => {
    if (!selectedDeal) return;
    const latest = deals.find((deal) => deal.id === selectedDeal.id);
    if (latest && latest !== selectedDeal) {
      setSelectedDeal(latest);
    }
  }, [deals, selectedDeal]);

  useEffect(() => {
    setClosingStatus(null);
    setClosingReason("");
  }, [selectedDeal]);

  const handleDragStart = (dealId: string) => {
    setDraggedDealId(dealId);
  };

  const handleDrop = (stage: Stage) => {
    if (!draggedDealId || mutation.isPending || closeDealMutation.isPending) return;
    const deal = filteredDeals.find((d) => d.id === draggedDealId);
    if (!deal) return;
    const normalizedTarget = normalizeStage(stage);
    const currentStage = normalizeStage(deal.stage);
    if (normalizedTarget === currentStage) {
      setDraggedDealId(null);
      return;
    }
    mutation.mutate({ id: deal.id, stage: normalizedTarget });
    setDraggedDealId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {STAGE_ORDER.map((stage) => (
            <div key={stage} className="space-y-3 rounded-xl border border-white/5 bg-white/5 p-4">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border border-white/10 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/90 shadow-2xl">
        <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-white/60">
                Arrastra los deals entre etapas y enfócate con los filtros según riesgo, owner o importe.
              </p>
            </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row  lg:items-center">
              <div className="relative flex-1 min-w-[220px] lg:min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  placeholder="Buscar deal o empresa"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9 bg-white/5 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                />
              </div>
              <Select value={ownerFilter} onValueChange={(value) => setOwnerFilter(value)}>
                <SelectTrigger className="bg-white/5 text-white placeholder:text-white/60 focus:ring-white/30 lg:min-w-[160px]">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el equipo</SelectItem>
                  {owners.map((ownerId) => (
                    <SelectItem key={ownerId} value={ownerId}>
                      {ownerId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as "all" | Priority)}
              >
                <SelectTrigger className="bg-white/5 text-white placeholder:text-white/60 focus:ring-white/30 lg:min-w-[150px]">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={(value) => setRiskFilter(value as "all" | RiskLevel)}>
                <SelectTrigger className="bg-white/5 text-white placeholder:text-white/60 focus:ring-white/30 lg:min-w-[150px]">
                  <SelectValue placeholder="Riesgo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el riesgo</SelectItem>
                  <SelectItem value="Bajo">Bajo</SelectItem>
                  <SelectItem value="Medio">Medio</SelectItem>
                  <SelectItem value="Alto">Alto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={amountRange} onValueChange={(value) => setAmountRange(value as typeof amountRange)}>
                <SelectTrigger className="bg-white/5 text-white placeholder:text-white/60 focus:ring-white/30 lg:min-w-[170px]">
                  <SelectValue placeholder="Importe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los importes</SelectItem>
                  <SelectItem value="lt10">Menos de 10K</SelectItem>
                  <SelectItem value="bt10_50">10K - 50K</SelectItem>
                  <SelectItem value="gt50">Más de 50K</SelectItem>
                </SelectContent>
              </Select>
              <Select value={targetFilter} onValueChange={(value) => setTargetFilter(value as typeof targetFilter)}>
                <SelectTrigger className="bg-white/5 text-white placeholder:text-white/60 focus:ring-white/30 lg:min-w-[170px]">
                  <SelectValue placeholder="Objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                  <SelectItem value="thisMonth">Cierre este mes</SelectItem>
                </SelectContent>
              </Select>
              <label className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-white/70">
                <Switch checked={onlyAttention} onCheckedChange={(checked) => setOnlyAttention(checked)} />
                Sólo deals en riesgo
              </label>
            </div>
          </div>

          {mutation.isPending && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando deal…
            </div>
          )}

          {attentionDeals.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/15 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-100">Deals que requieren atención</h3>
                  <p className="text-xs text-amber-100/80">
                    {attentionDeals.length} deal{attentionDeals.length === 1 ? "" : "s"} superan el SLA o presentan señales de riesgo.
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {attentionDeals.slice(0, 5).map(({ deal, reasons, priority }) => (
                  <button
                    key={deal.id}
                    type="button"
                    onClick={() => setSelectedDeal(deal)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-left transition hover:border-white/30 hover:bg-black/40"
                  >
                    <div className="flex items-center justify-between text-sm text-white">
                      <span className="font-semibold">{deal.title}</span>
                      <span className="text-[11px] text-white/70">{priority} · {CURRENCY_FORMATTER.format(Number(deal.amount ?? 0))}</span>
                    </div>
                    <p className="text-xs text-white/60">{deal.company ?? "Sin empresa"}</p>
                    <ul className="mt-2 space-y-1 text-[11px] text-white/70">
                      {reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
                {attentionDeals.length > 5 && (
                  <p className="text-[11px] text-amber-100/80">{attentionDeals.length - 5} deal{attentionDeals.length - 5 === 1 ? " adicional" : "es adicionales"} necesitan revisión.</p>
                )}
              </div>
            </div>
          )}

          <div className="relative -mx-2">
            <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-4">
              {columns.map(({ stage, total, deals: stageDeals }) => {
                const stageDetails = STAGE_DETAILS[stage];
                const stepIndex = STAGE_ORDER.indexOf(stage) + 1;
                const totalOpenDeals = filteredDeals.length;
                const share = totalOpenDeals > 0 ? Math.round((stageDeals.length / totalOpenDeals) * 100) : 0;
                const indicatorWidth = totalOpenDeals > 0 ? Math.max(12, (stageDeals.length / totalOpenDeals) * 100) : 12;

                return (
                  <div
                    key={stage}
                    className={`snap-start flex w-[380px] flex-shrink-0 flex-col rounded-2xl border ${stageDetails.border} bg-gradient-to-b ${stageDetails.gradient} p-5 shadow-[0_0_25px_rgba(15,23,42,0.45)] backdrop-blur`}
                    onDragOver={(event) => {
                      if (draggedDealId) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDrop(stage);
                    }}
                  >
                    <div className="mb-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageDetails.badge}`}>
                            Etapa {stepIndex}
                          </span>
                          <h3 className="text-base font-semibold text-white">{stage}</h3>
                        </div>
                        <div className="rounded-xl bg-black/30 px-3 py-2 text-right text-xs text-white/70">
                          <span className="block text-lg font-semibold text-white">{stageDeals.length}</span>
                          <span className="text-[10px] uppercase tracking-wide text-white/55">deals</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/70">{stageDetails.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-white/70">
                        <span>{CURRENCY_FORMATTER.format(total)}</span>
                        <span>{share}% del pipeline</span>
                      </div>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full ${stageDetails.indicator}`}
                          style={{ width: `${Math.min(indicatorWidth, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      {stageDeals.length === 0 ? (
                        <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-center text-xs text-white/60">
                          Arrastra un deal a esta etapa
                        </div>
                      ) : (
                        stageDeals.map((deal) => {
                          const probability = typeof deal.probability === "number" ? deal.probability : 0;
                          const priority = (deal.priority as Priority | undefined) ?? "Cold";
                          const risk = (deal.risk_level as RiskLevel | undefined) ?? "Bajo";
                          const isDragging = draggedDealId === deal.id;
                          const nextStep = deal.next_step?.trim();
                          const targetDate = deal.target_close_date ? new Date(deal.target_close_date) : null;
                          const isOverdue = targetDate ? targetDate.getTime() < Date.now() : false;
                          const targetLabel = targetDate
                            ? targetDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                            : "Sin objetivo";

                          const priorityClasses = {
                            Hot: "bg-red-500/25 text-red-100",
                            Warm: "bg-amber-500/25 text-amber-100",
                            Cold: "bg-blue-500/25 text-blue-100",
                          }[priority];

                          const riskBadge =
                            risk === "Alto"
                              ? { label: "⚠ Alto", style: "bg-red-500/25 text-red-100" }
                              : risk === "Medio"
                                ? { label: "⚠ Medio", style: "bg-amber-500/25 text-amber-100" }
                                : { label: "✔ Salud", style: "bg-emerald-500/25 text-emerald-100" };

                          const targetClasses = isOverdue
                            ? "bg-rose-500/25 text-rose-100"
                            : "bg-white/10 text-white";

                          return (
                            <button
                              key={deal.id}
                              id={`deal-card-${deal.id}`}
                              type="button"
                              draggable
                              onDragStart={() => handleDragStart(deal.id)}
                              onClick={() => setSelectedDeal(deal)}
                              className={`group w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm transition-all hover:border-white/30 hover:bg-white/10 ${
                                isDragging ? "opacity-60" : ""
                              } ${
                                highlightedDealId === deal.id
                                  ? "ring-2 ring-blue-300/80 ring-offset-2 ring-offset-slate-900"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="font-semibold text-white">{deal.title}</p>
                                  <p className="text-xs text-white/70">{deal.company ?? "Sin empresa"}</p>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClasses}`}>
                                  {priority}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/70">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 font-medium text-white">
                                  {CURRENCY_FORMATTER.format(Number(deal.amount ?? 0))}
                                </span>
                                <span className="inline-flex items-center justify-end gap-1 rounded-full bg-white/10 px-2 py-1 font-medium text-white">
                                  {probability}%
                                  <ArrowRight className="h-3 w-3 opacity-70" />
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/70">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${riskBadge.style}`}>
                                  {riskBadge.label}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${targetClasses}`}>
                                  <Calendar className="h-3 w-3" />
                                  {targetLabel}
                                </span>
                              </div>

                              {nextStep ? (
                                <p className="mt-3 line-clamp-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/75">
                                  <span className="font-semibold text-white/90">Próximo paso:</span> {nextStep}
                                </p>
                              ) : (
                                <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500/25 px-3 py-2 text-[11px] text-amber-100">
                                  <AlertTriangle className="h-3 w-3" /> Añade el próximo paso
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {closedDeals.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Deals cerrados recientes</h3>
                  <p className="text-xs text-white/60">
                    Mantén visibilidad sobre lo que ganaste y lo que se perdió sin salir del pipeline.
                  </p>
                </div>
                <span className="text-xs text-white/60">
                  {closedDeals.length} cerrados · {closedByStatus.Won.length} ganados / {closedByStatus.Lost.length} perdidos
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {CLOSED_STATUS_ORDER.map((status) => {
                  const statusDeals = closedByStatus[status].slice(0, 6);
                  const details = CLOSED_STATUS_DETAILS[status];

                  return (
                    <div key={status} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${details.badge}`}>
                          {details.label}
                        </span>
                        <span className="text-[11px] text-white/60">{statusDeals.length} deals</span>
                      </div>
                      <div className="space-y-2">
                        {statusDeals.length > 0 ? (
                          statusDeals.map((deal) => (
                            <button
                              key={deal.id}
                              type="button"
                              onClick={() => setSelectedDeal(deal)}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/30 hover:bg-white/10"
                            >
                              <p className="font-medium text-white">{deal.title}</p>
                              <p className="text-[11px] text-white/60">
                                {deal.company ?? "Sin empresa"} · {CURRENCY_FORMATTER.format(Number(deal.amount ?? 0))}
                              </p>
                              {deal.close_reason && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-white/60">{deal.close_reason}</p>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-white/50">{details.empty}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Sheet open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <SheetContent className="w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0b1222] p-6">
          {selectedDeal && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-white">{selectedDeal.title}</SheetTitle>
                <SheetDescription>{selectedDeal.company ?? "Sin empresa"}</SheetDescription>
              </SheetHeader>

              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-muted-foreground">Valor estimado</div>
                  <div className="text-sm font-semibold text-white">
                    {CURRENCY_FORMATTER.format(Number(selectedDeal.amount ?? 0))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-muted-foreground">Probabilidad</div>
                  <div className="flex items-center gap-2 text-sm text-white">
                    {(selectedDeal.probability ?? 0)}%
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="cursor-help bg-white/10 text-white">
                          {(selectedDeal.priority as Priority | undefined) ?? "Cold"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-xs text-white">
                        <p className="text-[11px] font-semibold text-white">
                          Why {selectedDealScoring?.priority ?? (selectedDeal.priority as Priority | undefined) ?? "Cold"}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {(selectedDealScoring?.reasoning?.length
                            ? selectedDealScoring.reasoning
                            : ["Sin explicaciones registradas por IA"]
                          ).map((reason, index) => (
                            <li key={index} className="flex items-start gap-1 text-[11px]">
                              <span className="text-blue-300">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-muted-foreground">Etapa</div>
                  <div className="text-sm text-white">{selectedDeal.stage}</div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-muted-foreground">Riesgo</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-help border-white/20 bg-transparent text-white">
                        {(selectedDeal.risk_level as RiskLevel | undefined) ?? "Bajo"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-xs text-white">
                      <p className="text-[11px] font-semibold text-white">
                        Why riesgo {((selectedDeal.risk_level as RiskLevel | undefined) ?? "Bajo").toLowerCase()}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {(selectedDealAttention?.reasons?.length
                          ? selectedDealAttention.reasons
                          : ["Sin señales de riesgo registradas"]
                        ).map((reason, index) => (
                          <li key={index} className="flex items-start gap-1 text-[11px]">
                            <span className="text-amber-300">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {selectedDeal.status !== "Open" && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                    <p className="text-xs uppercase tracking-wide text-white/60">Estado</p>
                    <p className="mt-1 font-semibold text-white">{selectedDeal.status}</p>
                    {selectedDeal.close_reason && (
                      <p className="mt-1 text-sm text-white/70">Motivo: {selectedDeal.close_reason}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-white/60">Historial de etapas</p>
                  {timelineLoading && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
                </div>
                {stageHistory.length === 0 ? (
                  <p className="text-xs text-white/60">Aún no hay cambios de etapa registrados.</p>
                ) : (
                  <ol className="space-y-2 text-xs text-white/80">
                    {stageHistory.slice(0, 8).map((event) => (
                      <li key={event.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                        <div className="flex items-center justify-between font-medium text-white">
                          <span>{event.from ? `${event.from} → ${event.to}` : event.to}</span>
                          <span className="text-[11px] text-white/60">{formatTimelineDate(event.date)}</span>
                        </div>
                        {event.status && (
                          <p className="mt-1 text-[11px] text-white/60">Estado: {event.status}</p>
                        )}
                        {event.closeReason && (
                          <p className="mt-1 text-[11px] text-white/60">Motivo cierre: {event.closeReason}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">Próximo paso</p>
                  <p className="mt-1 text-white">{selectedDeal.next_step ?? "Aún no definido"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">Fecha objetivo</p>
                  <p className="mt-1 text-white">
                    {selectedDeal.target_close_date
                      ? new Date(selectedDeal.target_close_date).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Sin definir"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">Notas</p>
                  <p className="mt-1 text-white/80">
                    {selectedDeal.description ?? "Aún no hay notas registradas."}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                {selectedDeal.status === "Open" ? (
                  closingStatus ? (
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!closingReason.trim()) {
                          toast({
                            title: "Motivo requerido",
                            description: "Escribe un motivo para cerrar el deal.",
                            variant: "destructive",
                          });
                          return;
                        }
                        closeDealMutation.mutate({
                          status: closingStatus,
                          close_reason: closingReason.trim(),
                        });
                      }}
                    >
                      <p className="text-xs uppercase tracking-wide text-white/60">
                        Completa el cierre ({closingStatus === "Won" ? "Ganado" : "Perdido"})
                      </p>
                      <Textarea
                        placeholder="Motivo del cierre"
                        value={closingReason}
                        onChange={(event) => setClosingReason(event.target.value)}
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setClosingStatus(null);
                            setClosingReason("");
                          }}
                          disabled={closeDealMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" variant={closingStatus === "Won" ? "secondary" : "outline"} disabled={closeDealMutation.isPending}>
                          {closeDealMutation.isPending ? "Guardando..." : "Confirmar cierre"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/60">Acciones rápidas</p>
                        <p className="mt-1 text-white/70">Marca el deal como ganado o perdido.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setClosingStatus("Won")} disabled={closeDealMutation.isPending}>
                          Ganado
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setClosingStatus("Lost")} disabled={closeDealMutation.isPending}>
                          Perdido
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/60">Estado actual</p>
                    <p className="mt-1 text-white">
                      {selectedDeal.status} · {selectedDeal.close_reason ?? "Sin motivo registrado"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedDeal(null)}>
                  Cerrar
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => {
                    window.open(`#deal-${selectedDeal.id}`, "_blank");
                  }}
                >
                  Abrir detalle
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
