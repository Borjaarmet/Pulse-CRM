import test from "node:test";
import assert from "node:assert/strict";

import {
  computeDealAttention,
  detectDealAlerts,
  buildAlertsChannelPayload,
  generateDailyDigest,
} from "../client/src/lib/pipelineInsights";
import type { Deal, Task } from "../client/src/lib/types";
import { randomUUID } from "node:crypto";

const ORIGINAL_DATE_NOW = Date.now;
const fixedNow = new Date("2024-01-15T10:00:00.000Z").getTime();

function withFixedNow<T>(fn: () => T): T {
  Date.now = () => fixedNow;
  try {
    return fn();
  } finally {
    Date.now = ORIGINAL_DATE_NOW;
  }
}

function createDeal(overrides: Partial<Deal> = {}): Deal {
  const nowISOString = new Date(fixedNow).toISOString();
  return {
    id: overrides.id ?? randomUUID(),
    title: overrides.title ?? "Demo Deal",
    company: overrides.company ?? "Acme Inc",
    amount: overrides.amount ?? 50000,
    stage: overrides.stage ?? "Propuesta",
    probability: overrides.probability ?? 65,
    target_close_date: overrides.target_close_date ?? new Date(fixedNow + 3 * 24 * 60 * 60 * 1000).toISOString(),
    next_step: overrides.next_step ?? "Enviar propuesta final",
    status: overrides.status ?? "Open",
    score: overrides.score ?? 70,
    priority: overrides.priority ?? "Warm",
    risk_level: overrides.risk_level ?? "Medio",
    last_activity: overrides.last_activity ?? nowISOString,
    inactivity_days: overrides.inactivity_days ?? 2,
    contact_id: overrides.contact_id ?? undefined,
    owner_id: overrides.owner_id ?? "owner-1",
    close_reason: overrides.close_reason ?? null,
    created_at: overrides.created_at ?? nowISOString,
    updated_at: overrides.updated_at ?? nowISOString,
    contact: overrides.contact ?? undefined,
  } as Deal;
}

function createTask(overrides: Partial<Task> = {}): Task {
  const nowISOString = new Date(fixedNow).toISOString();
  return {
    id: overrides.id ?? randomUUID(),
    title: overrides.title ?? "Follow up call",
    state: overrides.state ?? "To Do",
    priority: overrides.priority ?? "Media",
    due_at: overrides.due_at ?? nowISOString,
    description: overrides.description,
    completed_at: overrides.completed_at,
    assigned_to: overrides.assigned_to,
    deal_id: overrides.deal_id,
    contact_id: overrides.contact_id,
    notes: overrides.notes,
    created_at: overrides.created_at ?? nowISOString,
    updated_at: overrides.updated_at ?? nowISOString,
    deal: overrides.deal,
    contact: overrides.contact,
  } as Task;
}

test("computeDealAttention detecta faltas y riesgo", () => {
  withFixedNow(() => {
    const deals: Deal[] = [
      createDeal({
        id: "deal-1",
        last_activity: new Date("2023-12-20T00:00:00.000Z").toISOString(),
        inactivity_days: 26,
        next_step: "",
        priority: "Hot",
        risk_level: "Alto",
        target_close_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
      }),
      createDeal({ id: "deal-2" }),
    ];

    const attention = computeDealAttention(deals);

    assert.ok(attention.length >= 1);
    assert.equal(attention[0]?.deal.id, "deal-1");
    const reasons = attention[0]?.reasons ?? [];
    assert.ok(reasons.some((reason) => reason.includes("próximo paso")));
    assert.ok(reasons.some((reason) => reason.includes("vencida")));
    assert.ok(reasons.some((reason) => reason.includes("Sin actividad")));
  });
});

test("detectDealAlerts clasifica severidad crítica", () => {
  withFixedNow(() => {
    const deals: Deal[] = [
      createDeal({ id: "deal-alert", next_step: "", target_close_date: new Date("2023-12-01").toISOString() }),
    ];

    const alerts = detectDealAlerts(deals);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.deal.id, "deal-alert");
    assert.equal(alerts[0]?.type, "target_overdue");
    assert.equal(alerts[0]?.severity, "critical");
  });
});

test("buildAlertsChannelPayload produce resumen legible", () => {
  withFixedNow(() => {
    const deals: Deal[] = [
      createDeal({ id: "deal-alert", next_step: "", target_close_date: new Date("2023-12-01").toISOString() }),
    ];
    const alerts = detectDealAlerts(deals);

    const payload = buildAlertsChannelPayload(alerts);
    assert.match(payload.text, /⚠️ 1 deal/);
    assert.match(payload.attachments[0]?.title ?? "", /fecha objetivo/);
  });
});

test("generateDailyDigest resume indicadores principales", () => {
  withFixedNow(() => {
    const deals: Deal[] = [
      createDeal({ status: "Open", priority: "Hot", risk_level: "Alto" }),
      createDeal({ id: "won", status: "Won", priority: "Warm", risk_level: "Medio" }),
    ];
    const tasks: Task[] = [
      createTask({ due_at: new Date("2023-12-01T00:00:00.000Z").toISOString() }),
    ];

    const alerts = detectDealAlerts(deals);
    const digest = generateDailyDigest({ deals, tasks, alerts });

    assert.match(digest, /Deals Hot abiertos: 1/);
    assert.match(digest, /Deals en riesgo alto: 1/);
    assert.match(digest, /Tareas vencidas: 1/);
  });
});

test("buildAlertsChannelPayload vacío devuelve mensaje positivo", () => {
  const payload = buildAlertsChannelPayload([]);
  assert.match(payload.text, /Sin alertas críticas/);
  assert.equal(payload.attachments.length, 0);
});
