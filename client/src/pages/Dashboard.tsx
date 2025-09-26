import { useEffect, useState, useMemo, useCallback, Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import TasksCard from "@/components/TasksCard";
import HotDealCard from "@/components/HotDealCard";
import StalledDealsCard from "@/components/StalledDealsCard";
import RecentActivityCard from "@/components/RecentActivityCard";
import QuickMetricsCard from "@/components/QuickMetricsCard";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { seedDemo, subscribeToChanges } from "@/lib/db";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useTasksQuery, useDealsQuery, useContactsQuery } from "@/hooks/useCrmQueries";
import type { Task, Deal, Contact } from "@/lib/types";
import DealModal from "@/components/DealModal";
import ContactModal from "@/components/ContactModal";
import OverviewCard from "@/components/OverviewCard";
import AdvancedMetricsPanel from "@/components/AdvancedMetricsPanel";
import DealsKanban from "@/components/DealsKanban";
import PipelineSummaryCard from "@/components/PipelineSummaryCard";
import UpcomingActionsCard from "@/components/UpcomingActionsCard";
import DealAlertsBanner from "@/components/DealAlertsBanner";
import { Button } from "@/components/ui/button";
import ManagerMetricsPanel from "@/components/ManagerMetricsPanel";
import {
  computeDealAttention,
  detectDealAlerts,
  type DealAlert,
  type AlertsChannelPayload,
  generateDailyDigest,
} from "@/lib/pipelineInsights";
import { logDealAlertResolution } from "@/lib/db";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Lazy load the list components
const DealsList = lazy(() => import("@/components/DealsList"));
const ContactsList = lazy(() => import("@/components/ContactsList"));
const CompaniesList = lazy(() => import("@/components/CompaniesList"));

interface DigestMeta {
  headline: string | null;
  summary: string[] | null;
  actions: string[] | null;
  content: string | null;
  provider: string;
  usedFallback: boolean;
  error?: string;
}

export default function Dashboard() {
  const [isDemo, setIsDemo] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery();
  const { data: dealsData, isLoading: dealsLoading } = useDealsQuery();
  const { data: contactsData, isLoading: contactsLoading } = useContactsQuery();

  const tasks = tasksData ?? ([] as Task[]);
  const deals = dealsData ?? ([] as Deal[]);
  const contacts = contactsData ?? ([] as Contact[]);

  const attentionDeals = useMemo(() => computeDealAttention(deals), [deals]);
  const detectedAlerts = useMemo(() => detectDealAlerts(deals), [deals]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const activeAlerts = useMemo(
    () => detectedAlerts.filter((alert) => !dismissedAlertIds.includes(alert.deal.id)),
    [detectedAlerts, dismissedAlertIds],
  );
  const [alertSensitivity, setAlertSensitivity] = useState<"all" | "critical" | "warning">("all");
  const filteredAlerts = useMemo(() => {
    if (alertSensitivity === "all") return activeAlerts;
    const severity = alertSensitivity === "critical" ? "critical" : "warning";
    return activeAlerts.filter((alert) => alert.severity === severity);
  }, [activeAlerts, alertSensitivity]);
  const hasFilteredOut = alertSensitivity !== "all" && activeAlerts.length > 0 && filteredAlerts.length === 0;

  useEffect(() => {
    if (!dismissedAlertIds.length) return;
    const alertIds = new Set(detectedAlerts.map((alert) => alert.deal.id));
    setDismissedAlertIds((previous) => {
      const filtered = previous.filter((id) => alertIds.has(id));
      return filtered.length === previous.length ? previous : filtered;
    });
  }, [detectedAlerts, dismissedAlertIds.length]);

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    // Check if we're in demo mode
    const hasSupabaseEnv = !!(
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    setIsDemo(!hasSupabaseEnv);

    // Set up real-time subscriptions if using Supabase
    if (hasSupabaseEnv) {
      const unsubscribe = subscribeToChanges(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      });

      return unsubscribe;
    }
  }, [queryClient]);

  const handleInjectDemo = async () => {
    try {
      await seedDemo();
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quickMetrics });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stalledDeals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotDeal });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      toast({
        title: "Demo data injected",
        description: "Sample data has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to inject demo data",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
    toast({
      title: "Data refreshed",
      description: "All data has been updated",
    });
  };

  const openDeals = deals.filter((deal) => deal.status === "Open").length;
  const wonDeals = deals.filter((deal) => deal.status === "Won").length;
  const lostDeals = deals.filter((deal) => deal.status === "Lost").length;
  const activeTasks = tasks.filter((task) => task.state !== "Done").length;
  const activeContactsCount = contacts.filter((contact) => {
    if (!contact.last_activity) return false;
    const last = new Date(contact.last_activity);
    const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 14;
  }).length;

  const topAlerts = useMemo(() => attentionDeals.slice(0, 3), [attentionDeals]);

  const [pipelineFocusDealId, setPipelineFocusDealId] = useState<string | null>(null);
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [digestText, setDigestText] = useState<string>("");
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [digestMeta, setDigestMeta] = useState<DigestMeta | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month">("today");

  const handleViewPipeline = useCallback((dealId?: string) => {
    setActiveSection("Pipeline");
    setPipelineFocusDealId(dealId ?? null);
  }, []);

  const handleResolveAlert = useCallback(
    async (alert: DealAlert) => {
      try {
        await logDealAlertResolution({
          dealId: alert.deal.id,
          reason: alert.reasons.join(" · ") || alert.message,
        });
        setDismissedAlertIds((previous) =>
          previous.includes(alert.deal.id) ? previous : [...previous, alert.deal.id],
        );
        toast({
          title: "Alerta resuelta",
          description: `${alert.deal.title} queda registrada en el timeline`,
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "No se pudo registrar",
          description: "Reintenta nuevamente",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleShareAlerts = useCallback(
    (payload: AlertsChannelPayload) => {
      console.log("[Alerts] Payload listo para enviar:", payload);
      toast({
        title: "Payload preparado",
        description: "Listo para integrarlo con Slack o Teams",
      });
    },
    [toast],
  );

  const handleGenerateDigest = useCallback(async () => {
    setDigestError(null);
    setDigestMeta(null);
    setIsDigestLoading(true);

    const fallbackDigest = generateDailyDigest({ deals, tasks, alerts: activeAlerts });

    const hotDeals = deals.filter((deal) => deal.status === "Open" && deal.priority === "Hot").length;
    const riskDeals = deals.filter((deal) => deal.status === "Open" && deal.risk_level === "Alto").length;
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_at || task.state === "Done") return false;
      const due = new Date(task.due_at).getTime();
      return Number.isFinite(due) && due < Date.now();
    }).length;

    const topDeals = attentionDeals.slice(0, 5).map(({ deal, priority, risk }) => ({
      id: deal.id,
      title: deal.title,
      company: deal.company ?? null,
      amount: typeof deal.amount === "number" ? deal.amount : null,
      stage: deal.stage,
      priority,
      risk,
      nextStep: deal.next_step ?? null,
      targetCloseDate: deal.target_close_date ?? null,
    }));

    const alertsSnapshot = activeAlerts.slice(0, 5).map((alert) => ({
      id: alert.deal.id,
      message: alert.message,
      recommendedAction: alert.recommendedAction,
      severity: alert.severity,
      priority: alert.priority,
    }));

    try {
      const response = await fetch("/api/ai/digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeframe,
          stats: {
            hotDeals,
            riskDeals,
            overdueTasks,
          },
          topDeals,
          alerts: alertsSnapshot,
          fallbackText: fallbackDigest,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        digest?: DigestMeta;
        message?: string;
      };

      if (!data.success || !data.digest) {
        throw new Error(data.message || "Respuesta inválida");
      }

      const digest = data.digest;
      console.log("[Digest] API response", digest);
      const sections: string[] = [];
      if (digest.headline) {
        sections.push(digest.headline);
      }
      if (digest.summary?.length) {
        sections.push(...digest.summary);
      }
      if (digest.actions?.length) {
        sections.push("Acciones prioritarias:");
        sections.push(
          ...digest.actions.map((action, index) => `${index + 1}. ${action}`),
        );
      }

      const finalDigest = sections.length > 0 ? sections.join("\n") : digest.content ?? fallbackDigest;
      console.log("[Digest] Final text", finalDigest);

      setDigestText(finalDigest);
      setDigestMeta(digest);
      setIsDigestOpen(true);

      toast({
        title: digest.usedFallback ? "Digest heurístico" : "Digest IA generado",
        description: digest.usedFallback
          ? "Mostramos el resumen estándar al no contar con IA disponible."
          : `Modelo: ${digest.provider}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el digest";
      console.error("[Digest]", error);
      setDigestError(message);
      setDigestText(fallbackDigest);
      setDigestMeta({
        headline: null,
        summary: null,
        actions: null,
        content: fallbackDigest,
        provider: "fallback-error",
        usedFallback: true,
        error: message,
      });
      setIsDigestOpen(true);
      toast({
        title: "Digest generado con fallback",
        description: "Mostramos el resumen estándar en lo que conectamos la IA.",
        variant: "destructive",
      });
    } finally {
      setIsDigestLoading(false);
    }
  }, [
    activeAlerts,
    attentionDeals,
    deals,
    tasks,
    timeframe,
    toast,
  ]);

  const handleExitFocus = useCallback(() => setFocusMode(false), []);

  const timeframeLabel = useMemo(() => {
    switch (timeframe) {
      case "today":
        return "Hoy";
      case "week":
        return "Esta semana";
      case "month":
        return "Este mes";
      default:
        return "Hoy";
    }
  }, [timeframe]);

  const digestPreview = useMemo(() => {
    if (isDigestLoading) {
      return "Generando digest con IA…";
    }
    if (digestError) {
      return "Mostrando el resumen estándar mientras conectamos la IA.";
    }
    if (digestText) {
      return digestText.split("\n").slice(0, 3).join(" • ");
    }
    return "Genera el digest para obtener el resumen inteligente del pipeline.";
  }, [digestError, digestText, isDigestLoading]);

  const digestProviderLabel = useMemo(() => {
    if (!digestMeta) return null;
    if (digestMeta.usedFallback) {
      return digestMeta.error ? "Heurística local (sin IA)" : "Heurística local";
    }
    return `Modelo ${digestMeta.provider}`;
  }, [digestMeta]);

  const DigestCard = () => (
    <Card className="bg-gradient-to-br from-blue-500/10 via-slate-800/60 to-slate-900/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Digest IA</h3>
          <p className="text-xs text-white/70">Resumen listo para compartir ({timeframeLabel.toLowerCase()}).</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="bg-blue-500 text-white hover:bg-blue-600"
          disabled={isDigestLoading}
          onClick={handleGenerateDigest}
          aria-busy={isDigestLoading}
        >
          {isDigestLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando…
            </span>
          ) : (
            "Generar"
          )}
        </Button>
      </div>
      <p className="mt-4 text-xs text-white/70">{digestPreview}</p>
      {digestProviderLabel && (
        <p className="mt-2 text-[11px] text-white/50">Fuente: {digestProviderLabel}</p>
      )}
      {digestError && (
        <p className="mt-1 text-[11px] text-rose-200/80">Error: {digestError}</p>
      )}
    </Card>
  );


  const topFocusDeals = useMemo(() => filteredAlerts.slice(0, 3), [filteredAlerts]);

  const urgentTasksCount = useMemo(
    () =>
      tasks
        .filter((task) => task.state !== "Done")
        .filter((task) => (task.due_at ? new Date(task.due_at).getTime() < Date.now() + 48 * 60 * 60 * 1000 : true))
        .length,
    [tasks],
  );

  const renderDashboardSummary = () => {
    const headerFilters = (
      <div className="grid gap-3 pb-4 md:flex md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {["today", "week", "month"].map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={timeframe === option ? "secondary" : "outline"}
              className={timeframe === option ? "bg-blue-500 text-white" : "border-white/20 text-white/70"}
              onClick={() => setTimeframe(option as typeof timeframe)}
            >
              {option === "today" ? "Hoy" : option === "week" ? "Esta semana" : "Este mes"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={focusMode ? "secondary" : "outline"}
            className={focusMode ? "bg-emerald-500 text-white" : "border-white/20 text-white/70"}
            onClick={() => setFocusMode((prev) => !prev)}
          >
            {focusMode ? "Salir de modo foco" : "Modo foco IA"}
          </Button>
        </div>
      </div>
    );

    const dealAlertsRow = (
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <PipelineSummaryCard deals={deals} isLoading={dealsLoading} />
        <DealAlertsBanner
          alerts={activeAlerts}
          onResolve={handleResolveAlert}
          onViewDeal={handleViewPipeline}
          onShareAlerts={handleShareAlerts}
        />
      </div>
    );

    const upcomingRow = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] lg:items-start">
        <UpcomingActionsCard
          deals={deals}
          tasks={tasks}
          isDealsLoading={dealsLoading}
          isTasksLoading={tasksLoading}
          onViewPipeline={handleViewPipeline}
        />
        <DigestCard />
      </div>
    );

    const hotVsActivityRow = (
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <HotDealCard deals={deals} isLoading={dealsLoading} />
        <RecentActivityCard />
      </div>
    );

    if (focusMode) {
      return (
        <>
          {headerFilters}
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">Modo foco IA</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    {activeAlerts.length > 0
                      ? `Trabaja ${activeAlerts.length} deal${activeAlerts.length === 1 ? "" : "s"} críticos`
                      : "Sin alertas activas. Mantén el ritmo."}
                  </h2>
                  <p className="mt-2 text-sm text-white/70">
                    {urgentTasksCount > 0
                      ? `Tienes ${urgentTasksCount} tarea${urgentTasksCount === 1 ? "" : "s"} por vencer en 48h.`
                      : "Agenda despejada. Aprovecha para nutrir contactos o preparar propuestas."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-emerald-500 text-white hover:bg-emerald-400"
                    onClick={() => handleViewPipeline(topFocusDeals[0]?.deal.id)}
                  >
                    Abrir pipeline en foco
                  </Button>
                  <Button type="button" variant="ghost" className="text-white/70 hover:text-white" onClick={handleExitFocus}>
                    Salir de modo foco
                  </Button>
                </div>
              </div>
            </Card>

            {dealAlertsRow}

            <Card className="bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">Plan de ataque sugerido</h3>
              <p className="mt-1 text-sm text-white/60">
                {activeAlerts.length > 0
                  ? "La IA prioriza estos deals. Registra avances a medida que completes cada paso."
                  : "Revisa el pipeline para detectar nuevas oportunidades o activar campañas de nurture."}
              </p>

              {activeAlerts.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {topFocusDeals.map((alert) => (
                    <li key={alert.deal.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{alert.deal.title}</span>
                        <span className="text-xs text-white/60">{alert.priority} · Riesgo {alert.risk}</span>
                      </div>
                      <p className="mt-2 text-xs text-white/60">{alert.recommendedAction}</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-blue-500 text-white hover:bg-blue-600"
                          onClick={() => handleViewPipeline(alert.deal.id)}
                        >
                          Abrir en pipeline
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/30 text-white/80 hover:text-white"
                          onClick={() => {
                            void handleResolveAlert(alert);
                          }}
                        >
                          Marcar resuelto
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                  No hay urgencias registradas. Sigue cultivando relaciones o revisa tus deals Warm para generar tracción.
                </div>
              )}
            </Card>

            {upcomingRow}
            {hotVsActivityRow}
          </div>
        </>
      );
    }

    return (
      <>
        {headerFilters}
        <div className="space-y-6">
          {dealAlertsRow}

          <OverviewCard
            deals={deals}
            tasks={tasks}
            contactsActivos={contactsLoading ? 0 : activeContactsCount}
            isDealsLoading={dealsLoading}
            isTasksLoading={tasksLoading}
          />

          {upcomingRow}
          {hotVsActivityRow}
        </div>
      </>
    );
  };

  return (
    <>
      <DashboardLayout
      isDemo={isDemo}
      onInjectDemo={handleInjectDemo}
      onRefresh={handleRefresh}
      initialSection="Dashboard"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {(activeSection) => {
        switch (activeSection) {
          case "Dashboard":
            return renderDashboardSummary();
          case "Pipeline":
            return (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Pipeline completo</h2>
                  <button
                    type="button"
                    onClick={() => setIsDealModalOpen(true)}
                    className="inline-flex items-center rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                  >
                    + Nuevo Deal
                  </button>
                </div>
                <DealsKanban focusDealId={pipelineFocusDealId} onResetFocus={() => setPipelineFocusDealId(null)} />
                <HotDealCard deals={deals} isLoading={dealsLoading} />
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <DealsList />
                </Suspense>
                <DealModal
                  open={isDealModalOpen}
                  onClose={() => setIsDealModalOpen(false)}
                  contacts={contacts}
                />
              </section>
            );
          case "Contactos":
            return (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Contactos</h2>
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(true)}
                    className="inline-flex items-center rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                  >
                    + Nuevo Contacto
                  </button>
                </div>
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <ContactsList />
                </Suspense>
                <ContactModal
                  open={isContactModalOpen}
                  onClose={() => setIsContactModalOpen(false)}
                />
              </section>
            );
          case "Empresas":
            return (
              <section className="space-y-6">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <CompaniesList />
                </Suspense>
              </section>
            );
          case "Tareas":
            return (
              <section className="space-y-6">
                <TasksCard tasks={tasks} isLoading={tasksLoading} />
              </section>
            );
          case "Métricas":
            return (
              <section className="space-y-6">
                <QuickMetricsCard
                  tasks={tasks}
                  deals={deals}
                  isLoading={tasksLoading || dealsLoading}
                />
                <ManagerMetricsPanel deals={deals} isLoading={dealsLoading} />
                <AdvancedMetricsPanel
                  deals={deals}
                  tasks={tasks}
                  contacts={contacts}
                  isLoading={tasksLoading || dealsLoading || contactsLoading}
                />
              </section>
            );
          default:
            return (
              <Card className="bg-white/5">
                <h3 className="text-lg font-semibold text-white">En desarrollo</h3>
                <p className="mt-2 text-sm text-white/60">
                  Esta sección estará disponible próximamente.
                </p>
              </Card>
            );
        }
      }}
      </DashboardLayout>

      <Dialog open={isDigestOpen} onOpenChange={setIsDigestOpen}>
        <DialogContent className="max-w-xl bg-[#0b1222] text-white">
          <DialogHeader>
            <DialogTitle>Digest IA listo para compartir</DialogTitle>
            <DialogDescription className="text-white/70">
              Copia este resumen para enviarlo por email o Slack.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={digestText}
            readOnly
            className="min-h-[200px] resize-none bg-black/40 text-sm text-white"
          />
          {digestMeta && (
            <p className="mt-2 text-xs text-white/60">
              Fuente: {digestMeta.usedFallback ? "Heurística local" : `Modelo ${digestMeta.provider}`}
              {digestMeta.error ? ` · ${digestMeta.error}` : ""}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
