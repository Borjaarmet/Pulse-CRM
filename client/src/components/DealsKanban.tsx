import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { useDealsQuery, useDealTimelineQuery } from "@/hooks/useCrmQueries";
import { updateDeal } from "@/lib/db";
import type { Deal, Priority, RiskLevel } from "@/lib/types";
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
      <Card>
        <p className="text-xs text-muted-foreground mb-5">
          Filtra y arrastra los deals entre etapas para mantener el pipeline al día.
        </p>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="relative lg:w-52">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar deal o empresa"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ownerFilter} onValueChange={(value) => setOwnerFilter(value)}>
              <SelectTrigger className="lg:w-36">
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
              <SelectTrigger className="lg:w-36">
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
              <SelectTrigger className="lg:w-36">
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
              <SelectTrigger className="lg:w-40">
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
              <SelectTrigger className="lg:w-40">
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="thisMonth">Cierre este mes</SelectItem>
              </SelectContent>
            </Select>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={onlyAttention} onCheckedChange={(checked) => setOnlyAttention(checked)} />
              Sólo atención urgente
            </label>
          </div>
        </div>
        {mutation.isPending && (
          <div className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Actualizando deal…
          </div>
        )}

        {attentionDeals.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-amber-100">Deals que requieren atención</h3>
                <p className="text-xs text-amber-200/80">
                  {attentionDeals.length} deal{attentionDeals.length === 1 ? "" : "s"} superan el SLA o presentan riesgo.
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {attentionDeals.slice(0, 5).map(({ deal, reasons, priority }) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => setSelectedDeal(deal)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-left transition hover:border-white/20 hover:bg-white/10"
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
                <p className="text-[11px] text-amber-200/70">{attentionDeals.length - 5} deal{attentionDeals.length - 5 === 1 ? " adicional" : "es adicionales"} necesitan revisión.</p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {columns.map(({ stage, total, deals: stageDeals }) => (
            <div
              key={stage}
              className="flex h-full min-h-[260px] flex-col rounded-xl border border-white/10 bg-white/5 p-4"
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">{stage}</h3>
                  <p className="text-xs text-muted-foreground">
                    {stageDeals.length} deals · {CURRENCY_FORMATTER.format(total)}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {stageDeals.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-xs text-muted-foreground">
                    Sin deals
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const probability = typeof deal.probability === "number" ? deal.probability : 0;
                    const priority = (deal.priority as Priority | undefined) ?? "Cold";
                    const risk = (deal.risk_level as RiskLevel | undefined) ?? "Bajo";
                    const isDragging = draggedDealId === deal.id;

                    const priorityClasses = {
                      Hot: "bg-red-500/20 text-red-200",
                      Warm: "bg-amber-500/20 text-amber-200",
                      Cold: "bg-blue-500/20 text-blue-200",
                    }[priority];

                    const riskBadge =
                      risk === "Alto"
                        ? { label: "⚠ Alto", style: "bg-red-500/20 text-red-200" }
                        : risk === "Medio"
                        ? { label: "⚠ Medio", style: "bg-amber-500/20 text-amber-200" }
                        : { label: "✔ Salud", style: "bg-emerald-500/20 text-emerald-200" };

                    return (
                      <button
                        key={deal.id}
                        id={`deal-card-${deal.id}`}
                        type="button"
                        draggable
                        onDragStart={() => handleDragStart(deal.id)}
                        onClick={() => setSelectedDeal(deal)}
                        className={`group w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm transition-all hover:border-white/20 hover:bg-white/10 ${
                          isDragging ? "opacity-60" : ""
                        } ${
                          highlightedDealId === deal.id
                            ? "ring-2 ring-blue-300 ring-offset-2 ring-offset-transparent shadow-lg"
                            : ""
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-card-foreground">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">{deal.company ?? "Sin empresa"}</p>
                          </div>
                          <span className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${priorityClasses}`}>
                            {priority}
                          </span>
                        </div>

                        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{CURRENCY_FORMATTER.format(Number(deal.amount ?? 0))}</span>
                          <span className="inline-flex items-center gap-1">
                            {probability}%<ArrowRight className="h-3 w-3 opacity-60" />
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${riskBadge.style}`}>
                            {riskBadge.label}
                          </span>
                          {!deal.next_step && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-[11px] text-amber-200">
                              <AlertTriangle className="h-3 w-3" /> Sin próximo paso
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
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
