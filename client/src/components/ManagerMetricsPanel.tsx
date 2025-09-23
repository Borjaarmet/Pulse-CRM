import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Users, Zap } from "lucide-react";

import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import type { Deal } from "@/lib/types";

interface ManagerMetricsPanelProps {
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

const dayMs = 1000 * 60 * 60 * 24;

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 0,
});

interface StageConversionRow {
  stage: string;
  count: number;
  conversion: number;
  drop?: number;
}

interface OwnerScore {
  ownerId: string;
  name: string;
  openValue: number;
  wonValue: number;
  hotDeals: number;
  closedWon: number;
}

export default function ManagerMetricsPanel({ deals, isLoading }: ManagerMetricsPanelProps) {
  const loading = isLoading ?? false;

  const { stageConversion, winRate, loseRate, averageCycle, highRiskValue, owners, insightBullets } = useMemo(() => {
    const openDeals = deals.filter((deal) => deal.status === "Open");
    const closedWonDeals = deals.filter((deal) => deal.status === "Won");
    const closedLostDeals = deals.filter((deal) => deal.status === "Lost");
    const closedDeals = closedWonDeals.length + closedLostDeals.length;

    const stageCounts = STAGE_ORDER.map((stage) => ({
      stage,
      count: openDeals.filter((deal) => (deal.stage ?? "") === stage).length,
    }));
    const firstStageCount = stageCounts[0]?.count ?? 0;
    const conversionRows: StageConversionRow[] = stageCounts.map(({ stage, count }, index) => {
      const conversion = firstStageCount ? count / firstStageCount : 0;
      const previousCount = index === 0 ? firstStageCount : stageCounts[index - 1]?.count ?? 0;
      const dropRaw = previousCount ? 1 - count / previousCount : 0;
      const drop = previousCount ? Math.max(0, dropRaw) : 0;
      return {
        stage,
        count,
        conversion,
        drop: index === 0 ? undefined : drop,
      };
    });

    const wonCount = closedWonDeals.length;
    const loseCount = closedLostDeals.length;
    const winRate = closedDeals ? wonCount / closedDeals : 0;
    const loseRate = closedDeals ? loseCount / closedDeals : 0;

    const averageCycle = (() => {
      if (!closedDeals) return 0;
      const total = [...closedWonDeals, ...closedLostDeals].reduce((sum, deal) => {
        const created = new Date(deal.created_at);
        const updated = new Date(deal.updated_at);
        if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) return sum;
        const days = Math.max(1, Math.round((updated.getTime() - created.getTime()) / dayMs));
        return sum + days;
      }, 0);
      return Math.round(total / closedDeals);
    })();

    const highRiskValue = openDeals
      .filter((deal) => deal.risk_level === "Alto")
      .reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);

    const ownersMap = deals.reduce<Record<string, OwnerScore>>((acc, deal) => {
      const ownerId = deal.owner_id || "Sin responsable";
      if (!acc[ownerId]) {
        acc[ownerId] = {
          ownerId,
          name: ownerId,
          openValue: 0,
          wonValue: 0,
          hotDeals: 0,
          closedWon: 0,
        };
      }
      const amount = Number(deal.amount ?? 0);
      if (deal.status === "Open") {
        acc[ownerId].openValue += amount;
        if (deal.priority === "Hot") {
          acc[ownerId].hotDeals += 1;
        }
      }
      if (deal.status === "Won") {
        acc[ownerId].wonValue += amount;
        acc[ownerId].closedWon += 1;
      }
      return acc;
    }, {});

    const owners = Object.values(ownersMap)
      .sort((a, b) => b.wonValue - a.wonValue)
      .slice(0, 6);

    const insightBullets: string[] = [];
    const topStage = conversionRows
      .filter((row) => row.count > 0)
      .sort((a, b) => b.conversion - a.conversion)[0];
    if (topStage?.stage) {
      insightBullets.push(
        `${topStage.stage} retiene ${Math.round(topStage.conversion * 100)}% de los deals que entran al funnel.`,
      );
    }

    if (owners[0]) {
      insightBullets.push(
        `${owners[0].name} lidera ingresos con ${CURRENCY_FORMATTER.format(owners[0].wonValue)} cerrados.`,
      );
    }

    if (highRiskValue > 0) {
      insightBullets.push(
        `${CURRENCY_FORMATTER.format(highRiskValue)} del pipeline está en riesgo alto; asigna soporte inmediato.`,
      );
    }

    return {
      stageConversion: conversionRows,
      winRate,
      loseRate,
      averageCycle,
      highRiskValue,
      owners,
      insightBullets,
    };
  }, [deals]);

  if (loading) {
    return (
      <Card>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl bg-white/5 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Panel ejecutivo</h2>
            <p className="text-sm text-white/60">Conversiones, velocidad de cierre y salud del equipo.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <MetricTile
              icon={Award}
              label="Win rate"
              value={closedRateText(winRate)}
              helper={loseRate > 0 ? `Perdidos ${PERCENT_FORMATTER.format(loseRate)}` : undefined}
            />
            <MetricTile
              icon={Zap}
              label="Ciclo promedio"
              value={averageCycle ? `${averageCycle} días` : "—"}
              helper="Desde creación hasta cierre"
            />
            <MetricTile
              icon={Users}
              label="Valor en riesgo"
              value={CURRENCY_FORMATTER.format(highRiskValue)}
              helper="Riesgo alto en pipeline"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="text-base font-semibold text-white">Conversión por etapa</h3>
          <p className="text-xs text-white/60">Porcentaje de deals que se mantienen activos en cada etapa del funnel.</p>
          <div className="mt-6 h-72">
            {stageConversion.some((row) => row.count > 0) ? (
              <ResponsiveContainer>
                <BarChart data={stageConversion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="stage" stroke="#CBD5F5" tick={{ fill: "#CBD5F5", fontSize: 12 }} />
                  <YAxis
                    stroke="#CBD5F5"
                    tick={{ fill: "#CBD5F5", fontSize: 12 }}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(148,163,215,0.08)" }}
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(148,163,215,0.24)",
                      borderRadius: "12px",
                      color: "#E2E8F0",
                    }}
                    formatter={(value: number, name) => {
                      if (name === "conversion") {
                        return [PERCENT_FORMATTER.format(value), "Conversion"];
                      }
                      if (name === "count") {
                        return [value, "Deals activos"];
                      }
                      if (name === "drop") {
                        return [PERCENT_FORMATTER.format(value ?? 0), "Drop-off"];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Etapa: ${label}`}
                  />
                  <Bar dataKey="conversion" name="Conversion" fill="#60A5FA" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-sm text-white/60">
                Aún no hay suficientes deals en el funnel.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-white">Insights clave</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {insightBullets.length ? (
              insightBullets.map((item, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-sky-300">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-white/60">Todavía no hay datos suficientes para generar insights.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-white">Tablero por responsable</h3>
        <p className="text-xs text-white/60">Ranking de ingresos y calor del pipeline por owner.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="text-xs uppercase text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Valor ganado</th>
                <th className="px-4 py-3 font-medium">Valor abierto</th>
                <th className="px-4 py-3 font-medium">Deals Hot</th>
                <th className="px-4 py-3 font-medium">Ganados</th>
              </tr>
            </thead>
            <tbody>
              {owners.length ? (
                owners.map((owner) => (
                  <tr key={owner.ownerId} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white">{owner.name}</td>
                    <td className="px-4 py-3">{CURRENCY_FORMATTER.format(owner.wonValue)}</td>
                    <td className="px-4 py-3">{CURRENCY_FORMATTER.format(owner.openValue)}</td>
                    <td className="px-4 py-3">{owner.hotDeals}</td>
                    <td className="px-4 py-3">{owner.closedWon}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={5}>
                    No hay owners asignados a los deals actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Award;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-white/60">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
        {helper && <p className="text-[11px] text-white/50">{helper}</p>}
      </div>
    </div>
  );
}

function closedRateText(rate: number) {
  if (!rate) return "0%";
  return PERCENT_FORMATTER.format(rate);
}
