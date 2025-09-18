import { useMemo, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, Clock2, Flame, Sparkles, Target, TrendingUp } from "lucide-react";

import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import type { Contact, Deal, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AdvancedMetricsPanelProps {
  deals: Deal[];
  tasks: Task[];
  contacts: Contact[];
  isLoading?: boolean;
}

type StageSummary = {
  stage: string;
  value: number;
  count: number;
  weighted: number;
};

type ForecastPoint = {
  key: string;
  label: string;
  date: Date;
  expected: number;
  committed: number;
};

type DistributionPoint = {
  name: string;
  value: number;
};

type Suggestion = {
  title: string;
  description: string;
  tone: "positive" | "warning" | "info";
};

const ENGAGEMENT_COLORS = ["#10B981", "#3B82F6", "#6366F1", "#F97316"];
const TASK_COLORS = ["#38BDF8", "#FBBF24", "#A855F7", "#F97316", "#EF4444"];

const formatterCurrency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatterPercent = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatterMonth = new Intl.DateTimeFormat("es-ES", {
  month: "short",
  year: "numeric",
});

const TASK_STATE_LABELS: Record<string, string> = {
  "To Do": "Por hacer",
  "Doing": "En progreso",
  "Waiting": "En espera",
  "Done": "Completadas",
  Pending: "Pendientes",
  InProgress: "En progreso",
  Overdue: "Vencidas",
  Completed: "Completadas",
};

function normalizeTaskState(state?: string | null): string {
  if (!state) return "Otros";
  return TASK_STATE_LABELS[state] ?? state;
}

function getDaysFromNow(dateLike?: string | null): number | null {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getStageOrder(stage: string): number {
  const order: Record<string, number> = {
    Prospección: 1,
    "Prospeccion": 1,
    "Calificación": 2,
    "Calificacion": 2,
    Descubrimiento: 3,
    "Propuesta": 4,
    "Negociación": 5,
    "Negotiación": 5,
    "Cierre": 6,
  };
  return order[stage] ?? 99;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 py-10 text-sm text-white/60">
      {label}
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-white/5 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-6 h-48 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, inner) => (
                <Skeleton key={inner} className="h-4 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdvancedMetricsPanel({
  deals,
  tasks,
  contacts,
  isLoading,
}: AdvancedMetricsPanelProps) {
  const loading = isLoading ?? false;

  const stageSummary = useMemo<StageSummary[]>(() => {
    if (!deals?.length) return [];

    const grouped = deals.reduce<Record<string, StageSummary>>((acc, deal) => {
      const stage = deal.stage ?? "Sin etapa";
      const amount = deal.amount ?? 0;
      const probability = typeof deal.probability === "number" ? deal.probability : 0;

      if (!acc[stage]) {
        acc[stage] = {
          stage,
          value: 0,
          weighted: 0,
          count: 0,
        };
      }

      acc[stage].value += amount;
      acc[stage].weighted += amount * (probability / 100);
      acc[stage].count += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => {
        const orderDiff = getStageOrder(a.stage) - getStageOrder(b.stage);
        if (orderDiff !== 0) return orderDiff;
        return b.value - a.value;
      })
      .map((summary) => ({
        ...summary,
        value: Math.round(summary.value),
        weighted: Math.round(summary.weighted),
      }));
  }, [deals]);

  const forecastSeries = useMemo<ForecastPoint[]>(() => {
    if (!deals?.length) return [];

    const buckets = new Map<string, ForecastPoint>();

    deals.forEach((deal) => {
      if (!deal.target_close_date) return;
      const candidate = new Date(deal.target_close_date);
      if (Number.isNaN(candidate.getTime())) return;

      const key = `${candidate.getFullYear()}-${candidate.getMonth()}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label: formatterMonth.format(candidate),
          date: candidate,
          expected: 0,
          committed: 0,
        });
      }

      const bucket = buckets.get(key)!;
      const amount = deal.amount ?? 0;
      const probability = typeof deal.probability === "number" ? deal.probability : 0;
      const weighted = amount * (probability / 100);

      if (deal.status === "Won") {
        bucket.committed += amount;
      } else {
        bucket.expected += weighted;
      }
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);
  }, [deals]);

  const taskDistribution = useMemo<DistributionPoint[]>(() => {
    if (!tasks?.length) return [];

    const distribution = tasks.reduce<Record<string, number>>((acc, task) => {
      const label = normalizeTaskState(task.state);
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  const contactEngagement = useMemo<DistributionPoint[]>(() => {
    if (!contacts?.length) return [];

    let active = 0;
    let warm = 0;
    let fading = 0;
    let cold = 0;

    contacts.forEach((contact) => {
      const days = getDaysFromNow(contact.last_activity);
      if (days === null) {
        cold += 1;
        return;
      }

      if (days <= 7) active += 1;
      else if (days <= 14) warm += 1;
      else if (days <= 30) fading += 1;
      else cold += 1;
    });

    return [
      { name: "Alta interacción", value: active },
      { name: "Calentándose", value: warm },
      { name: "En riesgo", value: fading },
      { name: "Fríos", value: cold },
    ].filter((segment) => segment.value > 0);
  }, [contacts]);

  const metrics = useMemo(() => {
    const totalDeals = deals?.length ?? 0;
    const dealsWithAmount = deals?.filter((deal) => typeof deal.amount === "number" && !Number.isNaN(deal.amount)) ?? [];
    const openDeals = deals?.filter((deal) => deal.status === "Open") ?? [];
    const closedDeals = deals?.filter((deal) => deal.status === "Won" || deal.status === "Lost") ?? [];
    const wonDeals = deals?.filter((deal) => deal.status === "Won") ?? [];

    const totalPipelineValue = openDeals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
    const expectedPipelineValue = openDeals.reduce((sum, deal) => {
      const amount = deal.amount ?? 0;
      const probability = typeof deal.probability === "number" ? deal.probability : 0;
      return sum + amount * (probability / 100);
    }, 0);
    const averageDealSize = dealsWithAmount.length
      ? dealsWithAmount.reduce((sum, deal) => sum + (deal.amount ?? 0), 0) / dealsWithAmount.length
      : 0;
    const winRate = closedDeals.length ? (wonDeals.length / closedDeals.length) : 0;

    const overdueTasks = tasks?.filter((task) => {
      if (!task.due_at) return false;
      if (task.state === "Done" || normalizeTaskState(task.state) === "Completadas") return false;
      const dueDate = new Date(task.due_at);
      if (Number.isNaN(dueDate.getTime())) return false;
      return dueDate.getTime() < Date.now();
    }) ?? [];

    const avgInactivity = openDeals.length
      ? openDeals.reduce((sum, deal) => sum + (deal.inactivity_days ?? 0), 0) / openDeals.length
      : 0;

    const atRiskDeals = openDeals.filter((deal) => {
      const inactivity = deal.inactivity_days ?? 0;
      const dueDate = deal.target_close_date ? new Date(deal.target_close_date) : null;
      const isPastDue = dueDate ? dueDate.getTime() < Date.now() : false;
      return inactivity > 14 || isPastDue || !deal.next_step;
    });

    return {
      totalDeals,
      totalPipelineValue,
      expectedPipelineValue,
      averageDealSize,
      winRate,
      overdueTasksCount: overdueTasks.length,
      avgInactivity,
      atRiskDeals,
      openDealsCount: openDeals.length,
      closedDealsCount: closedDeals.length,
      wonDealsCount: wonDeals.length,
    };
  }, [deals, tasks]);

  const insightBullets = useMemo(() => {
    const insights: string[] = [];

    if (stageSummary.length) {
      const topStage = [...stageSummary].sort((a, b) => b.value - a.value)[0];
      insights.push(
        `${topStage.stage} concentra ${formatterCurrency.format(topStage.value)} en pipeline con un valor ponderado de ${formatterCurrency.format(topStage.weighted)}.`,
      );
    }

    if (forecastSeries.length) {
      const peak = [...forecastSeries].sort((a, b) => b.expected + b.committed - (a.expected + a.committed))[0];
      const total = peak.expected + peak.committed;
      insights.push(
        `La proyección más fuerte es ${peak.label} con ${formatterCurrency.format(total)} entre ingresos comprometidos y probables.`,
      );
    }

    if (taskDistribution.length) {
      const topTask = taskDistribution[0];
      insights.push(
        `${topTask.value} tareas se encuentran en estado "${topTask.name}", lo que indica dónde está la mayor carga operativa.`,
      );
    }

    if (contactEngagement.length) {
      const coldSegment = contactEngagement.find((segment) => segment.name === "Fríos");
      if (coldSegment) {
        const totalContacts = contactEngagement.reduce((sum, segment) => sum + segment.value, 0);
        const ratio = totalContacts ? coldSegment.value / totalContacts : 0;
        insights.push(
          `${Math.round(ratio * 100)}% de los contactos están fríos; programa campañas de reactivación para no perderlos.`,
        );
      }
    }

    return insights;
  }, [stageSummary, forecastSeries, taskDistribution, contactEngagement]);

  const aiSuggestions = useMemo<Suggestion[]>(() => {
    const suggestions: Suggestion[] = [];

    if (metrics.closedDealsCount > 0) {
      const formattedWin = metrics.winRate > 0 ? formatterPercent.format(metrics.winRate) : "0%";
      if (metrics.winRate < 0.35) {
        suggestions.push({
          title: "Refuerza la tasa de cierre",
          description: `La tasa de ganancia actual es ${formattedWin}. Revisa argumentos y materiales de negociación para deals en etapas avanzadas.`,
          tone: "warning",
        });
      } else if (metrics.winRate < 0.55) {
        suggestions.push({
          title: "Pequeños ajustes mejorarán cierres",
          description: `Con una tasa de cierre de ${formattedWin}, enfoca coaching en negociaciones claves para subir unos puntos porcentuales.`,
          tone: "info",
        });
      } else {
        suggestions.push({
          title: "Excelente tasa de ganancia",
          description: `Mantén las buenas prácticas que impulsan una tasa de cierre de ${formattedWin}. Documenta las mejores jugadas del equipo.`,
          tone: "positive",
        });
      }
    }

    if (metrics.atRiskDeals.length) {
      const valueAtRisk = metrics.atRiskDeals.reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
      suggestions.push({
        title: "Recupera deals en riesgo",
        description: `${metrics.atRiskDeals.length} deals abiertos presentan señales de riesgo por inactividad o fecha vencida. Están valorados en ${formatterCurrency.format(valueAtRisk)}. Prioriza seguimientos hoy.`,
        tone: "warning",
      });
    }

    if (metrics.overdueTasksCount > 0) {
      suggestions.push({
        title: "Ordena tareas críticas",
        description: `Hay ${metrics.overdueTasksCount} tareas atrasadas. Reasigna responsables o ajusta fechas para destrabar el pipeline.`,
        tone: "warning",
      });
    }

    if (metrics.expectedPipelineValue > 0) {
      const lift = metrics.totalPipelineValue - metrics.expectedPipelineValue;
      suggestions.push({
        title: "Activa aceleradores del pipeline",
        description: `Tienes ${formatterCurrency.format(metrics.expectedPipelineValue)} esperados a cierre. Si elevas la probabilidad promedio ganarías ${formatterCurrency.format(Math.max(lift, 0))} adicionales.`,
        tone: "info",
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        title: "Pulsa el botón de optimización",
        description: "Explora filtros y segmentaciones para descubrir oportunidades ocultas dentro de tus datos.",
        tone: "info",
      });
    }

    return suggestions.slice(0, 4);
  }, [metrics]);

  if (loading) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricHighlight
            icon={TrendingUp}
            label="Valor en pipeline"
            value={formatterCurrency.format(metrics.totalPipelineValue)}
            helper={`Probable: ${formatterCurrency.format(metrics.expectedPipelineValue)}`}
          />
          <MetricHighlight
            icon={Target}
            label="Tasa de cierre"
            value={metrics.closedDealsCount ? formatterPercent.format(metrics.winRate) : "—"}
            helper={`${metrics.wonDealsCount} ganados de ${metrics.closedDealsCount}`}
          />
          <MetricHighlight
            icon={Clock2}
            label="Inactividad promedio"
            value={metrics.openDealsCount ? `${Math.round(metrics.avgInactivity)} días` : "—"}
            helper={`${metrics.atRiskDeals.length} deals en riesgo`}
          />
          <MetricHighlight
            icon={Sparkles}
            label="Tareas atrasadas"
            value={metrics.overdueTasksCount}
            helper={`Total tareas: ${tasks.length}`}
            tone={metrics.overdueTasksCount > 0 ? "warning" : "positive"}
          />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold text-white">Pipeline por etapa</h3>
          <p className="text-sm text-white/60">Distribución de valor y ponderación por etapa de venta</p>
          <div className="mt-6 h-64">
            {stageSummary.length ? (
              <ResponsiveContainer>
                <BarChart data={stageSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="stage" stroke="#CBD5F5" tick={{ fill: "#CBD5F5", fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="#CBD5F5" tick={{ fill: "#CBD5F5", fontSize: 12 }} tickFormatter={(value) => formatterCurrency.format(value)} />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(148, 163, 215, 0.1)" }}
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(148, 163, 215, 0.2)",
                      borderRadius: "0.75rem",
                      color: "#E2E8F0",
                    }}
                    formatter={(value: number, name) => {
                      if (name === "weighted") {
                        return [formatterCurrency.format(value), "Valor ponderado"];
                      }

                      if (name === "value") {
                        return [formatterCurrency.format(value), "Valor bruto"];
                      }

                      if (name === "count") {
                        return [value, "Deals"];
                      }

                      return [value, name];
                    }}
                    labelFormatter={(label) => `Etapa: ${label}`}
                  />
                  <Bar dataKey="value" name="Valor bruto" fill="#60A5FA" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="weighted" name="Valor ponderado" fill="#C084FC" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="Aún no hay deals para representar el pipeline." />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Forecast mensual</h3>
          <p className="text-sm text-white/60">Balance entre ingresos comprometidos y probables</p>
          <div className="mt-6 h-64">
            {forecastSeries.length ? (
              <ResponsiveContainer>
                <AreaChart data={forecastSeries}>
                  <defs>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorCommitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" stroke="#CBD5F5" tick={{ fill: "#CBD5F5", fontSize: 12 }} />
                  <YAxis stroke="#CBD5F5" tick={{ fill: "#CBD5F5", fontSize: 12 }} tickFormatter={(value) => formatterCurrency.format(value)} />
                  <RechartsTooltip
                    cursor={{ stroke: "rgba(255,255,255,0.2)" }}
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(148, 163, 215, 0.2)",
                      borderRadius: "0.75rem",
                      color: "#E2E8F0",
                    }}
                    formatter={(value: number, name) => {
                      if (name === "expected") {
                        return [formatterCurrency.format(value), "Probables"];
                      }
                      if (name === "committed") {
                        return [formatterCurrency.format(value), "Comprometidos"];
                      }
                      return [value, name];
                    }}
                  />
                  <Area type="monotone" dataKey="expected" name="Probables" stroke="#6366F1" fill="url(#colorExpected)" strokeWidth={2} />
                  <Area type="monotone" dataKey="committed" name="Comprometidos" stroke="#34D399" fill="url(#colorCommitted)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No hay datos de forecast disponibles." />
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Actividades clave</h3>
          <p className="text-sm text-white/60">Cómo se distribuyen tareas y la temperatura de contactos</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
            <div className="h-56">
              {taskDistribution.length ? (
                <ResponsiveContainer>
                  <BarChart data={taskDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                    <XAxis type="number" stroke="#CBD5F5" tick={{ fill: "#CBD5F5", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#CBD5F5", fontSize: 12 }} />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(148, 163, 215, 0.08)" }}
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(148, 163, 215, 0.2)",
                        borderRadius: "0.75rem",
                        color: "#E2E8F0",
                      }}
                      formatter={(value: number) => [value, "Tareas"]}
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                      {taskDistribution.map((_, index) => (
                        <Cell key={`task-${index}`} fill={TASK_COLORS[index % TASK_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState label="Sin actividades suficientes para mostrar." />
              )}
            </div>

            <div className="h-56">
              {contactEngagement.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={contactEngagement}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {contactEngagement.map((_, index) => (
                        <Cell key={`segment-${index}`} fill={ENGAGEMENT_COLORS[index % ENGAGEMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(148, 163, 215, 0.2)",
                        borderRadius: "0.75rem",
                        color: "#E2E8F0",
                      }}
                      formatter={(value: number, name) => [`${value} contactos`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState label="Aún no tienes actividad registrada con contactos." />
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-orange-300" />
            <h3 className="text-lg font-semibold text-white">Lectura rápida del tablero</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {insightBullets.length ? (
              insightBullets.map((insight, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-orange-300">•</span>
                  <span>{insight}</span>
                </li>
              ))
            ) : (
              <li className="text-white/60">No hay suficientes datos para generar conclusiones aún.</li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-emerald-300" />
            <h3 className="text-lg font-semibold text-white">Sugerencias del asistente</h3>
          </div>
          <ul className="mt-4 space-y-4 text-sm">
            {aiSuggestions.map((suggestion, index) => (
              <li key={index} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  {suggestion.tone === "positive" && (
                    <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  )}
                  {suggestion.tone === "warning" && (
                    <Flame className="h-4 w-4 text-amber-300" aria-hidden="true" />
                  )}
                  {suggestion.tone === "info" && (
                    <Target className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  )}
                  <p className="font-medium text-white">{suggestion.title}</p>
                </div>
                <p className="mt-2 text-white/70">{suggestion.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

interface MetricHighlightProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "positive" | "warning";
}

function MetricHighlight({ icon: Icon, label, value, helper, tone = "default" }: MetricHighlightProps) {
  const toneClasses: Record<typeof tone, string> = {
    default: "bg-white/5 border-white/10",
    positive: "bg-emerald-500/10 border-emerald-400/40",
    warning: "bg-amber-500/10 border-amber-400/40",
  };

  return (
    <div className={cn("rounded-xl border p-4 transition hover:bg-white/10", toneClasses[tone])}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-white/70">{label}</p>
          <p className="text-xl font-semibold text-white">{value}</p>
        </div>
      </div>
      {helper && <p className="mt-2 text-xs text-white/60">{helper}</p>}
    </div>
  );
}
