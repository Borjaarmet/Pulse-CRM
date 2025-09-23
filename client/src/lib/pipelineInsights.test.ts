import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  computeDealAttention,
  detectDealAlerts,
  buildAlertsChannelPayload,
  generateDailyDigest,
  type DealAlert,
} from "./pipelineInsights";
import type { Deal, Task } from "./types";

function createDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Demo Deal",
    company: overrides.company ?? "Acme Inc",
    amount: overrides.amount ?? 50000,
    stage: overrides.stage ?? "Propuesta",
    probability: overrides.probability ?? 65,
    target_close_date: overrides.target_close_date ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    next_step: overrides.next_step ?? "Enviar propuesta final",
    status: overrides.status ?? "Open",
    score: overrides.score ?? 70,
    priority: overrides.priority ?? "Warm",
    risk_level: overrides.risk_level ?? "Medio",
    last_activity: overrides.last_activity ?? new Date().toISOString(),
    inactivity_days: overrides.inactivity_days ?? 2,
    contact_id: overrides.contact_id ?? undefined,
    owner_id: overrides.owner_id ?? "owner-1",
    close_reason: overrides.close_reason ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    contact: overrides.contact ?? undefined,
  } as Deal;
}

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Follow up call",
    state: overrides.state ?? "To Do",
    priority: overrides.priority ?? "Media",
    due_at: overrides.due_at ?? new Date().toISOString(),
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    description: overrides.description,
    completed_at: overrides.completed_at,
    assigned_to: overrides.assigned_to,
    deal_id: overrides.deal_id,
    contact_id: overrides.contact_id,
    notes: overrides.notes,
    deal: overrides.deal,
    contact: overrides.contact,
  } as Task;
}

describe("pipeline insights", () => {
  const fixedNow = new Date("2024-01-15T10:00:00.000Z");

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("prioritises deals that violate SLA or miss next steps", () => {
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

    expect(attention[0]?.deal.id).toBe("deal-1");
    expect(attention[0]?.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Sin próximo paso"),
        expect.stringContaining("Fecha objetivo vencida"),
        expect.stringContaining("Sin actividad"),
      ]),
    );
  });

  it("detects alerts for deals without next step or overdue date", () => {
    const deals: Deal[] = [
      createDeal({ id: "deal-alert", next_step: "", target_close_date: new Date("2023-12-01").toISOString() }),
    ];

    const alerts = detectDealAlerts(deals);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      deal: expect.objectContaining({ id: "deal-alert" }),
      type: "target_overdue",
      severity: "critical",
    });
  });

  it("builds channel payload with human readable summary", () => {
    const deals: Deal[] = [
      createDeal({ id: "deal-alert", next_step: "", target_close_date: new Date("2023-12-01").toISOString() }),
    ];
    const alerts = detectDealAlerts(deals);

    const payload = buildAlertsChannelPayload(alerts);
    expect(payload.text).toContain("⚠️ 1 deal");
    expect(payload.attachments[0]?.title).toContain("fecha objetivo");
  });

  it("generates digest with key indicators", () => {
    const deals: Deal[] = [
      createDeal({ status: "Open", priority: "Hot", risk_level: "Alto" }),
      createDeal({ id: "won", status: "Won", priority: "Warm", risk_level: "Medio" }),
    ];
    const tasks: Task[] = [
      createTask({ due_at: new Date("2023-12-01T00:00:00.000Z").toISOString() }),
    ];

    const alerts = detectDealAlerts(deals);
    const digest = generateDailyDigest({ deals, tasks, alerts });

    expect(digest).toContain("Deals Hot abiertos: 1");
    expect(digest).toContain("Deals en riesgo alto: 1");
    expect(digest).toContain("Tareas vencidas: 1");
  });

  it("handles empty alerts gracefully", () => {
    const payload = buildAlertsChannelPayload([] as DealAlert[]);
    expect(payload.text).toContain("Sin alertas críticas");
    expect(payload.attachments).toHaveLength(0);
  });
});
