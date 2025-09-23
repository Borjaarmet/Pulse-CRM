import { calculateDealScore, calculateRiskLevel } from "@/lib/scoring";
import type { Deal, Priority, RiskLevel, Task } from "@/lib/types";

export const SLA_THRESHOLDS: Record<Priority, number> = {
  Hot: 3,
  Warm: 7,
  Cold: 14,
};

const dayMs = 1000 * 60 * 60 * 24;

function computeInactivityDays(deal: Deal): number {
  if (typeof deal.inactivity_days === "number") {
    return deal.inactivity_days;
  }
  if (!deal.last_activity) return 0;
  const last = new Date(deal.last_activity);
  if (Number.isNaN(last.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - last.getTime()) / dayMs));
}

export interface DealAttention {
  deal: Deal;
  priority: Priority;
  risk: RiskLevel;
  score: number;
  inactivity: number;
  reasons: string[];
}

export function computeDealAttention(deals: Deal[]): DealAttention[] {
  return deals
    .filter((deal) => deal.status === "Open")
    .map((deal) => {
      const scoring = calculateDealScore(deal);
      const risk = calculateRiskLevel(deal);
      const inactivity = computeInactivityDays(deal);
      const priority = scoring.priority ?? (deal.priority as Priority | undefined) ?? "Cold";
      const threshold = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS.Cold;

      const reasons: string[] = [];

      if (!deal.next_step || !deal.next_step.trim()) {
        reasons.push("Sin próximo paso definido");
      }

      if (!deal.target_close_date) {
        reasons.push("Sin fecha objetivo");
      } else {
        const target = new Date(deal.target_close_date);
        if (!Number.isNaN(target.getTime()) && target.getTime() < Date.now()) {
          const overdueDays = Math.max(1, Math.floor((Date.now() - target.getTime()) / dayMs));
          reasons.push(`Fecha objetivo vencida hace ${overdueDays} día${overdueDays === 1 ? "" : "s"}`);
        }
      }

      if (inactivity > threshold) {
        reasons.push(`Sin actividad ${inactivity} día${inactivity === 1 ? "" : "s"} (SLA ${threshold})`);
      }

      if (risk === "Alto" && !reasons.includes("Riesgo alto")) {
        reasons.push("Marcado como riesgo alto");
      }

      return {
        deal,
        priority,
        risk,
        score: scoring.score,
        inactivity,
        reasons,
      };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => b.score - a.score);
}

export type DealAlertType = "missing_next_step" | "target_overdue";

export type DealAlertSeverity = "warning" | "critical";

export interface DealAlert {
  deal: Deal;
  type: DealAlertType;
  severity: DealAlertSeverity;
  reasons: string[];
  message: string;
  recommendedAction: string;
  priority: Priority;
  risk: RiskLevel;
  score: number;
}

function buildAlertRecommendation(alert: {
  hasMissingStep: boolean;
  hasOverdueDate: boolean;
  inactivity: number;
}): string {
  if (alert.hasOverdueDate) {
    return "Contacta hoy, renegocia la fecha objetivo y deja registro del próximo paso.";
  }

  if (alert.inactivity >= 7) {
    return "Agenda un follow-up y documenta el próximo paso para reactivar la cuenta.";
  }

  if (alert.hasMissingStep) {
    return "Define un próximo paso concreto (llamada, demo o propuesta) y compártelo con el equipo.";
  }

  return "Actualiza el deal con la información más reciente.";
}

export function detectDealAlerts(deals: Deal[]): DealAlert[] {
  const attention = computeDealAttention(deals);

  return attention
    .map(({ deal, reasons, inactivity, risk, priority, score }) => {
      const missingNextStep = reasons.find((reason) => reason.toLowerCase().includes("próximo paso"));
      const overdue = reasons.find((reason) => reason.toLowerCase().includes("fecha objetivo"));

      if (!missingNextStep && !overdue) {
        return null;
      }

      const severity: DealAlertSeverity = overdue ? "critical" : "warning";
      const type: DealAlertType = overdue ? "target_overdue" : "missing_next_step";
      const message = overdue
        ? `${deal.title} tiene la fecha objetivo vencida`
        : `${deal.title} no tiene próximo paso definido`;

      const recommendedAction = buildAlertRecommendation({
        hasMissingStep: Boolean(missingNextStep),
        hasOverdueDate: Boolean(overdue),
        inactivity,
      });

      const filteredReasons = reasons.filter((reason) => {
        if (reason.toLowerCase().includes("próximo paso")) return true;
        if (reason.toLowerCase().includes("fecha objetivo")) return true;
        return false;
      });

      return {
        deal,
        type,
        severity,
        reasons: filteredReasons,
        message,
        recommendedAction,
        priority,
        risk,
        score,
      } satisfies DealAlert;
    })
    .filter((alert): alert is DealAlert => alert !== null)
    .sort((a, b) => (a.severity === b.severity ? b.score - a.score : a.severity === "critical" ? -1 : 1));
}

export interface AlertsChannelPayload {
  text: string;
  attachments: Array<{
    title: string;
    body: string;
    severity: DealAlertSeverity;
  }>;
}

export function buildAlertsChannelPayload(alerts: DealAlert[]): AlertsChannelPayload {
  if (alerts.length === 0) {
    return {
      text: "✅ Sin alertas críticas en el pipeline. Buen trabajo equipo.",
      attachments: [],
    };
  }

  const headline = `⚠️ ${alerts.length} deal${alerts.length === 1 ? "" : "s"} requieren atención inmediata.`;
  const attachments = alerts.map((alert) => ({
    title: alert.message,
    body: `${alert.deal.company ?? "Sin empresa"} · Prioridad ${alert.priority} · Riesgo ${alert.risk}. ${
      alert.recommendedAction
    }`,
    severity: alert.severity,
  }));

  return {
    text: [headline, ...attachments.map((item) => `• ${item.title}`)].join("\n"),
    attachments,
  };
}

export interface DailyDigestContext {
  deals: Deal[];
  tasks: Task[];
  alerts: DealAlert[];
}

export function generateDailyDigest({ deals, tasks, alerts }: DailyDigestContext): string {
  const totalHot = deals.filter((deal) => deal.status === "Open" && deal.priority === "Hot").length;
  const totalRisk = deals.filter((deal) => deal.status === "Open" && deal.risk_level === "Alto").length;
  const overdueTasks = tasks.filter((task) => {
    if (!task.due_at || task.state === "Done") return false;
    const due = new Date(task.due_at).getTime();
    return Number.isFinite(due) && due < Date.now();
  });

  const lines = [
    `Resumen IA · ${new Date().toLocaleDateString("es-ES")}`,
    `• Deals Hot abiertos: ${totalHot}`,
    `• Deals en riesgo alto: ${totalRisk}`,
    `• Tareas vencidas: ${overdueTasks.length}`,
  ];

  if (alerts.length > 0) {
    lines.push("• Alertas prioritarias:");
    alerts.slice(0, 3).forEach((alert) => {
      lines.push(`   → ${alert.message} (${alert.recommendedAction})`);
    });
    if (alerts.length > 3) {
      lines.push(`   … y ${alerts.length - 3} alertas adicionales.`);
    }
  } else {
    lines.push("• No hay alertas críticas registradas.");
  }

  const topDeal = deals
    .filter((deal) => deal.status === "Open")
    .sort((a, b) => (Number(b.amount ?? 0) || 0) - (Number(a.amount ?? 0) || 0))[0];

  if (topDeal) {
    lines.push(
      `• Mayor oportunidad abierta: ${topDeal.title} (${topDeal.company ?? "Sin empresa"}) por €${
        Number(topDeal.amount ?? 0).toLocaleString("es-ES")
      }`,
    );
  }

  return lines.join("\n");
}
