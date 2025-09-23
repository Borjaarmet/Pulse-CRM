// lib/db.ts
import type { Task, Deal, Contact, TimelineEntry, Priority, RiskLevel } from "./types";
import { seedCompanies, ensureCompanyByName } from "./companies";

/* =========================
   ENV Y MODO DE OPERACIÓN
   ========================= */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as
  | string
  | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;
export const IS_SUPABASE_MODE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Log de verificación de entorno (visible en consola del navegador)
console.log("[ENV]", !!SUPABASE_URL, (SUPABASE_ANON_KEY || "").slice(-6));

/* =========================
   CLIENTE SUPABASE (LAZY)
   ========================= */
let supabase: any = null;
let initPromise: Promise<void> | null = null;

async function ensureSupabase(): Promise<void> {
  if (!IS_SUPABASE_MODE) return;
  if (supabase) return;

  if (!initPromise) {
    initPromise = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: { persistSession: false }, // evita warnings de múltiples instancias
      });
    })();
  }
  await initPromise;
}

/* =========================
   DEMO STORE (fallback)
   ========================= */
let demoData: {
  tasks: Task[];
  deals: Deal[];
  contacts: Contact[];
  timeline: TimelineEntry[];
} = {
  tasks: [],
  deals: [],
  contacts: [],
  timeline: [],
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const STAGE_BASE_PROBABILITY: Record<string, number> = {
  Prospección: 15,
  Prospeccion: 15,
  "Calificación": 30,
  Calificacion: 30,
  Propuesta: 50,
  "Negociación": 65,
  Negociacion: 65,
  Cierre: 85,
};

const HOT_THRESHOLD = 70;
const WARM_THRESHOLD = 40;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function inferDealInsights(partial: Partial<Deal>): {
  probability: number;
  priority: Priority;
  risk_level: RiskLevel;
} {
  const stage = partial.stage ?? "Prospección";
  const base = STAGE_BASE_PROBABILITY[stage] ?? 20;

  let probability = base;

  const amount = typeof partial.amount === "string" ? Number(partial.amount) : partial.amount ?? 0;
  if (amount >= 50000) probability += 5;
  else if (amount >= 15000) probability += 3;

  if (partial.next_step && partial.next_step.trim().length > 0) probability += 5;

  if (partial.target_close_date) {
    const target = new Date(partial.target_close_date);
    if (!Number.isNaN(target.getTime())) {
      const diffDays = Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 14) probability += 5;
      else if (diffDays <= 30) probability += 3;
      if (diffDays < 0) probability -= 10;
    }
  }

  const lastActivity = partial.last_activity ? new Date(partial.last_activity) : null;
  if (lastActivity && !Number.isNaN(lastActivity.getTime())) {
    const diffDays = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) probability += 5;
    else if (diffDays >= 14) probability -= 10;
    else if (diffDays >= 7) probability -= 5;
  }

  probability = clamp(Math.round(probability), 5, 95);

  let priority: Priority;
  if (probability >= HOT_THRESHOLD) priority = "Hot";
  else if (probability >= WARM_THRESHOLD) priority = "Warm";
  else priority = "Cold";

  let risk: RiskLevel = "Bajo";
  if (!partial.next_step || !partial.next_step.trim()) {
    risk = probability >= WARM_THRESHOLD ? "Medio" : "Alto";
  }

  if (partial.target_close_date) {
    const target = new Date(partial.target_close_date);
    if (!Number.isNaN(target.getTime()) && target.getTime() < Date.now()) {
      risk = "Alto";
    }
  }

  const inactivity = partial.inactivity_days ?? (() => {
    if (!lastActivity) return 0;
    return Math.max(0, Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)));
  })();

  if (inactivity >= 14) risk = "Alto";
  else if (inactivity >= 7 && risk !== "Alto") risk = "Medio";

  return {
    probability,
    priority,
    risk_level: risk,
  };
}

/* ==============
   QUERIES: TASKS
   ============== */
export async function getTasks(): Promise<Task[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("inserted_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  return demoData.tasks;
}

export async function addTask(
  payload: Omit<Task, "id" | "inserted_at">,
): Promise<Task> {
  const now = new Date().toISOString();
  const normalizedPayload = {
    ...payload,
    due_at: payload.due_at || null,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
  } as Omit<Task, "id">;

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .insert([normalizedPayload])
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "task_created",
        description: `Nueva tarea: ${data.title}`,
        entity_type: "task",
        entity_id: data.id,
      });
    }
    return data;
  }

  const newTask = {
    id: generateId(),
    ...normalizedPayload,
    inserted_at: now,
  };
  demoData.tasks.unshift(newTask);
  logTimelineEntry({
    type: "task_created",
    description: `Nueva tarea: ${newTask.title}`,
    entity_type: "task",
    entity_id: newTask.id,
  });
  return newTask;
}

export async function markTaskDone(
  id: string,
  state: "To Do" | "Done",
): Promise<Task> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .update({ state })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: state === "Done" ? "task_completed" : "task_reopened",
        description:
          state === "Done"
            ? `Tarea completada: ${data.title}`
            : `Tarea reactivada: ${data.title}`,
        entity_type: "task",
        entity_id: id,
      });
    }
    return data;
  }

  const idx = demoData.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  demoData.tasks[idx].state = state;
  logTimelineEntry({
    type: state === "Done" ? "task_completed" : "task_reopened",
    description: `${state === "Done" ? "Tarea completada" : "Tarea reactivada"}: ${demoData.tasks[idx].title}`,
    entity_type: "task",
    entity_id: id,
  });
  return demoData.tasks[idx];
}

export async function updateTask(
  id: string,
  patch: Partial<Task>,
): Promise<Task> {
  const normalizedPatch = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .update(normalizedPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "task_updated",
        description: `Tarea actualizada: ${data.title}`,
        entity_type: "task",
        entity_id: id,
      });
    }
    return data;
  }

  const idx = demoData.tasks.findIndex((task) => task.id === id);
  if (idx === -1) throw new Error("Task not found");
  demoData.tasks[idx] = { ...demoData.tasks[idx], ...normalizedPatch };
  logTimelineEntry({
    type: "task_updated",
    description: `Tarea actualizada: ${demoData.tasks[idx].title}`,
    entity_type: "task",
    entity_id: id,
  });
  return demoData.tasks[idx];
}

export async function deleteTask(id: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "task_deleted",
        description: `Tarea eliminada: ${data.title ?? ""}`,
        entity_type: "task",
        entity_id: id,
      });
    }
    return;
  }

  const idx = demoData.tasks.findIndex((task) => task.id === id);
  if (idx === -1) throw new Error("Task not found");
  const [removed] = demoData.tasks.splice(idx, 1);
  logTimelineEntry({
    type: "task_deleted",
    description: `Tarea eliminada: ${removed?.title ?? ""}`,
    entity_type: "task",
    entity_id: id,
  });
}

/* ==============
   QUERIES: DEALS
   ============== */
export async function getDeals(): Promise<Deal[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  return demoData.deals;
}

export async function getHotDeal(): Promise<Deal[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals_hot_v1")
      .select("*")
      .order("hot_score", { ascending: false })
      .limit(1);
    if (error) throw error;
    const records = (data ?? []) as Array<Deal & { hot_score?: number }>;
    return records.map((record) => ({
      ...record,
      score:
        typeof record.hot_score === "number"
          ? Number(record.hot_score)
          : record.score ?? 0,
    }));
  }
  // Fallback to demo data - find hottest deal by score
  const hottestDeal = demoData.deals.reduce((hottest, deal) => {
    const currentScore = scoreDeal(deal);
    const hottestScore = scoreDeal(hottest);
    return currentScore > hottestScore ? deal : hottest;
  }, demoData.deals[0]);
  return hottestDeal ? [hottestDeal] : [];
}

export async function getStalledDeals(): Promise<Deal[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals_stalled_v1")
      .select("*")
      .order("inactivity", { ascending: false })
      .limit(5);
    if (error) throw error;
    const records = (data ?? []) as Array<Deal & { inactivity?: number }>;
    return records.map((record) => ({
      ...record,
      inactivity_days:
        typeof record.inactivity === "number"
          ? Number(record.inactivity)
          : record.inactivity_days ?? 0,
    }));
  }
  // Fallback to demo data - filter stalled deals
  const stalledDeals = demoData.deals.filter(deal => {
    if (!deal.next_step) return true;
    if (deal.target_close_date) {
      const closeDate = new Date(deal.target_close_date);
      const now = new Date();
      return closeDate < now;
    }
    return false;
  });
  return stalledDeals.slice(0, 5);
}

export async function getQuickMetrics(): Promise<{ open: number; won: number; lost: number; sumOpen: number; }> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    
    // Execute all queries in parallel
    const [openResult, wonResult, lostResult, sumOpenResult] = await Promise.all([
      supabase.from("deals").select("id", { count: "exact" }).eq("status", "Open"),
      supabase.from("deals").select("id", { count: "exact" }).eq("status", "Won"),
      supabase.from("deals").select("id", { count: "exact" }).eq("status", "Lost"),
      supabase.from("deals").select("amount").eq("status", "Open")
    ]);

    if (openResult.error) throw openResult.error;
    if (wonResult.error) throw wonResult.error;
    if (lostResult.error) throw lostResult.error;
    if (sumOpenResult.error) throw sumOpenResult.error;

    const sumOpen = sumOpenResult.data?.reduce((sum: number, deal: any) => sum + (deal.amount || 0), 0) || 0;

    return {
      open: openResult.count || 0,
      won: wonResult.count || 0,
      lost: lostResult.count || 0,
      sumOpen
    };
  }
  
  // Fallback to demo data
  const openDeals = demoData.deals.filter(deal => deal.status === 'Open');
  const wonDeals = demoData.deals.filter(deal => deal.status === 'Won');
  const lostDeals = demoData.deals.filter(deal => deal.status === 'Lost');
  const sumOpen = openDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

  return {
    open: openDeals.length,
    won: wonDeals.length,
    lost: lostDeals.length,
    sumOpen
  };
}

export async function addDeal(
  payload: Omit<Deal, "id" | "updated_at" | "probability" | "priority" | "risk_level"> & {
    probability?: number;
    priority?: Priority;
    risk_level?: RiskLevel;
    contact_id?: string;
  },
): Promise<Deal> {
  const now = new Date().toISOString();

  const trimmedNextStep = payload.next_step?.toString().trim() ?? "";
  if (!trimmedNextStep) {
    throw new Error("NEXT_STEP_REQUIRED");
  }
  if (!payload.target_close_date) {
    throw new Error("TARGET_CLOSE_REQUIRED");
  }

  const amount =
    payload.amount !== undefined && payload.amount !== null
      ? Number(payload.amount)
      : undefined;

  const draftForInsights: Partial<Deal> = {
    ...payload,
    amount,
    stage: payload.stage || "Prospección",
    last_activity: payload.last_activity ?? now,
    inactivity_days: payload.inactivity_days ?? 0,
    next_step: trimmedNextStep,
    target_close_date: payload.target_close_date,
  };

  const { probability, priority, risk_level } = inferDealInsights(draftForInsights);

  const normalizedPayload = {
    ...payload,
    amount,
    status: "Open",
    priority: payload.priority ?? priority,
    risk_level: payload.risk_level ?? risk_level,
    probability: clamp(payload.probability ?? probability, 0, 100),
    stage: payload.stage || "Prospección",
    updated_at: now,
    created_at: payload.created_at ?? now,
    last_activity: draftForInsights.last_activity,
    inactivity_days: draftForInsights.inactivity_days ?? 0,
    score: payload.score ?? 0,
    next_step: trimmedNextStep,
    target_close_date: payload.target_close_date,
    close_reason: null,
  } as Omit<Deal, "id">;

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals")
      .insert([normalizedPayload])
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "deal_created",
        description: `Nuevo deal: ${data.title}`,
        entity_type: "deal",
        entity_id: data.id,
        metadata: JSON.stringify({ stage: data.stage, probability: data.probability }),
      });
    }
    return data;
  }

  const newDeal = {
    id: generateId(),
    ...normalizedPayload,
  };
  demoData.deals.unshift(newDeal);
  logTimelineEntry({
    type: "deal_created",
    description: `Nuevo deal: ${newDeal.title}`,
    entity_type: "deal",
    entity_id: newDeal.id,
    metadata: JSON.stringify({ stage: newDeal.stage, probability: newDeal.probability }),
  });
  return newDeal;
}

/* =================
   QUERIES: CONTACTS
   ================= */
export async function getContacts(): Promise<Contact[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("inserted_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  return demoData.contacts;
}

export async function addContact(
  payload: Omit<Contact, "id" | "inserted_at">,
): Promise<Contact> {
  let companyId = payload.company_id;
  let companyName = payload.company?.trim() || undefined;

  if (companyName) {
    const companyRecord = await ensureCompanyByName(companyName);
    companyId = companyRecord.id;
    companyName = companyRecord.name;
  }

  const now = new Date().toISOString();
  const normalizedPayload = {
    ...payload,
    company: companyName,
    company_id: companyId,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
  } as Omit<Contact, "id" | "inserted_at">;

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .insert([normalizedPayload])
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "contact_created",
        description: `Nuevo contacto: ${data.name}`,
        entity_type: "contact",
        entity_id: data.id,
        metadata: data.company_id ? JSON.stringify({ company_id: data.company_id }) : undefined,
      });
    }
    return data;
  }

  const newContact = {
    id: generateId(),
    ...normalizedPayload,
    inserted_at: new Date().toISOString(),
  };
  demoData.contacts.unshift(newContact);
  logTimelineEntry({
    type: "contact_created",
    description: `Nuevo contacto: ${newContact.name}`,
    entity_type: "contact",
    entity_id: newContact.id,
    metadata: companyId ? JSON.stringify({ company_id: companyId }) : undefined,
  });
  return newContact;
}

/* ==============
   UPDATE/DELETE FUNCTIONS
   ============== */
export async function updateDeal(id: string, patch: Partial<Deal>): Promise<Deal> {
  const normalizedPatch: Partial<Deal> = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const enforceCoreFields = (draft: Partial<Deal>) => {
    const nextStepCandidate = (draft.next_step ?? "").toString().trim();
    if (!nextStepCandidate) {
      throw new Error("NEXT_STEP_REQUIRED");
    }
    draft.next_step = nextStepCandidate;

    if (!draft.target_close_date) {
      throw new Error("TARGET_CLOSE_REQUIRED");
    }

    const statusCandidate = (draft.status ?? "Open") as Deal["status"];
    if (statusCandidate === "Won" || statusCandidate === "Lost") {
      const reason = (draft.close_reason ?? "").toString().trim();
      if (!reason) {
        throw new Error("CLOSE_REASON_REQUIRED");
      }
      draft.close_reason = reason;
      draft.status = statusCandidate;
      draft.stage = "Cierre";
    } else {
      draft.status = "Open";
      draft.close_reason = null;
    }

    return draft;
  };

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data: current, error: fetchError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const draft: Partial<Deal> = enforceCoreFields({
      ...current,
      ...normalizedPatch,
      next_step: normalizedPatch.next_step ?? current?.next_step,
      target_close_date:
        normalizedPatch.target_close_date ?? current?.target_close_date,
      close_reason:
        normalizedPatch.close_reason ?? current?.close_reason ?? undefined,
      status: normalizedPatch.status ?? current?.status ?? "Open",
    });

    normalizedPatch.next_step = draft.next_step;
    normalizedPatch.target_close_date = draft.target_close_date;
    normalizedPatch.close_reason = draft.close_reason;
    normalizedPatch.status = draft.status;
    if (draft.status !== "Open") {
      normalizedPatch.stage = "Cierre";
    }

    const auto = inferDealInsights(draft);
    if (patch.probability === undefined) normalizedPatch.probability = auto.probability;
    if (patch.priority === undefined) normalizedPatch.priority = auto.priority;
    if (patch.risk_level === undefined) normalizedPatch.risk_level = auto.risk_level;

    const { data, error } = await supabase
      .from("deals")
      .update(normalizedPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const changes: string[] = [];
      if (current?.stage !== data.stage) {
        changes.push(`Etapa: ${current?.stage ?? ""} → ${data.stage}`);
      }
      if (current?.probability !== data.probability) {
        changes.push(`Probabilidad: ${current?.probability ?? 0}% → ${data.probability ?? 0}%`);
      }
      if (current?.status !== data.status) {
        changes.push(`Estado: ${current?.status ?? ""} → ${data.status}`);
      }

      logTimelineEntry({
        type: "deal_updated",
        description: `Deal actualizado: ${data.title}`,
        entity_type: "deal",
        entity_id: id,
        metadata:
          changes.length || data.close_reason
            ? JSON.stringify({ changes, status: data.status, closeReason: data.close_reason ?? undefined })
            : undefined,
      });
    }
    return data;
  }

  const idx = demoData.deals.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Deal not found");
  const previous = demoData.deals[idx];
  const draft = enforceCoreFields({ ...previous, ...normalizedPatch });

  const auto = inferDealInsights(draft);
  if (patch.probability === undefined) draft.probability = auto.probability;
  if (patch.priority === undefined) draft.priority = auto.priority;
  if (patch.risk_level === undefined) draft.risk_level = auto.risk_level;
  demoData.deals[idx] = draft as Deal;

  const changes: string[] = [];
  if (previous.stage !== draft.stage) {
    changes.push(`Etapa: ${previous.stage ?? ""} → ${draft.stage ?? ""}`);
  }
  if (previous.probability !== draft.probability) {
    changes.push(`Probabilidad: ${previous.probability ?? 0}% → ${draft.probability ?? 0}%`);
  }
  if (previous.status !== draft.status) {
    changes.push(`Estado: ${previous.status ?? ""} → ${draft.status ?? ""}`);
  }

  logTimelineEntry({
    type: "deal_updated",
    description: `Deal actualizado: ${draft.title}`,
    entity_type: "deal",
    entity_id: id,
    metadata:
      changes.length || draft.close_reason
        ? JSON.stringify({
            changes,
            status: draft.status,
            closeReason: draft.close_reason ?? undefined,
          })
        : undefined,
  });
  return demoData.deals[idx];
}

export async function deleteDeal(id: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "deal_deleted",
        description: `Deal eliminado: ${data.title ?? ""}`,
        entity_type: "deal",
        entity_id: id,
      });
    }
    return;
  }

  const idx = demoData.deals.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Deal not found");
  const [removed] = demoData.deals.splice(idx, 1);
  logTimelineEntry({
    type: "deal_deleted",
    description: `Deal eliminado: ${removed?.title ?? ""}`,
    entity_type: "deal",
    entity_id: id,
  });
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact> {
  let normalizedPatch = { ...patch } as Partial<Contact>;

  if (patch.company) {
    const trimmed = patch.company.trim();
    if (trimmed) {
      const companyRecord = await ensureCompanyByName(trimmed);
      normalizedPatch.company = companyRecord.name;
      normalizedPatch.company_id = companyRecord.id;
    } else {
      normalizedPatch.company = undefined;
      normalizedPatch.company_id = undefined;
    }
  }

  normalizedPatch.updated_at = new Date().toISOString();

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .update(normalizedPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "contact_updated",
        description: `Contacto actualizado: ${data.name}`,
        entity_type: "contact",
        entity_id: id,
      });
    }
    return data;
  }

  const idx = demoData.contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Contact not found");
  demoData.contacts[idx] = { ...demoData.contacts[idx], ...normalizedPatch };
  logTimelineEntry({
    type: "contact_updated",
    description: `Contacto actualizado: ${demoData.contacts[idx].name}`,
    entity_type: "contact",
    entity_id: id,
  });
  return demoData.contacts[idx];
}

export async function deleteContact(id: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      logTimelineEntry({
        type: "contact_deleted",
        description: `Contacto eliminado: ${data.name ?? ""}`,
        entity_type: "contact",
        entity_id: id,
      });
    }
    return;
  }

  const idx = demoData.contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Contact not found");
  const [removed] = demoData.contacts.splice(idx, 1);
  logTimelineEntry({
    type: "contact_deleted",
    description: `Contacto eliminado: ${removed?.name ?? ""}`,
    entity_type: "contact",
    entity_id: id,
  });
}

/* ==============
   HELPER FUNCTIONS
   ============== */
export function scoreDeal(d: Deal): number {
  return (d.probability ?? 0) * (d.amount ?? 0);
}

/* ====================
   SUBSCRIPCIONES RT
   ==================== */
export function subscribeToChanges(callback: () => void): () => void {
  if (!IS_SUPABASE_MODE) return () => {};

  // devolvemos una función que se actualizará cuando el canal esté listo
  let teardown: () => void = () => {};

  (async () => {
    await ensureSupabase();

    const tasksSub = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        callback,
      )
      .subscribe();

    const dealsSub = supabase
      .channel("deals_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals" },
        callback,
      )
      .subscribe();

    const contactsSub = supabase
      .channel("contacts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        callback,
      )
      .subscribe();

    teardown = () => {
      tasksSub.unsubscribe();
      dealsSub.unsubscribe();
      contactsSub.unsubscribe();
    };
  })();

  return () => teardown();
}

function logTimelineEntry(
  entry: Omit<TimelineEntry, "id" | "created_at"> & { created_at?: string },
) {
  const payload = {
    id: generateId(),
    ...entry,
    created_at: entry.created_at ?? new Date().toISOString(),
  } as TimelineEntry;

  if (IS_SUPABASE_MODE) {
    ensureSupabase()
      .then(() =>
        supabase
          .from("timeline_entries")
          .insert([
            {
              type: payload.type,
              description: payload.description,
              entity_type: payload.entity_type,
              entity_id: payload.entity_id,
              user_id: payload.user_id,
              metadata: payload.metadata,
              created_at: payload.created_at,
            },
          ]),
      )
      .catch((error: unknown) => {
        console.error("Failed to log timeline entry", error);
      });
    return;
  }

  demoData.timeline.unshift(payload);
}

export async function getRecentActivity(limit = 10): Promise<TimelineEntry[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("timeline_entries")
      .select("*")
      .order("created_at", { descending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  return demoData.timeline
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function getDealTimeline(
  dealId: string,
  limit = 30,
): Promise<TimelineEntry[]> {
  if (!dealId) return [];

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("timeline_entries")
      .select("*")
      .eq("entity_type", "deal")
      .eq("entity_id", dealId)
      .order("created_at", { descending: true })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  return demoData.timeline
    .filter((entry) => entry.entity_type === "deal" && entry.entity_id === dealId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function logDealAlertResolution({
  dealId,
  reason,
}: {
  dealId: string;
  reason?: string;
}): Promise<void> {
  const description = reason?.trim().length
    ? `Alerta resuelta: ${reason.trim()}`
    : "Alerta resuelta desde el dashboard";

  logTimelineEntry({
    type: "deal_alert_resolved",
    description,
    entity_type: "deal",
    entity_id: dealId,
  });
}

/* =====================
   SEED DE DATOS DEMO
   ===================== */
export async function seedDemo(): Promise<void> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - 5);

  const demoTasks: Task[] = [
    {
      id: generateId(),
      title: "Llamar a cliente potencial TechCorp",
      due_at: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        15,
        30,
      ).toISOString(),
      state: "To Do",
      priority: "Media",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
    {
      id: generateId(),
      title: "Revisar propuesta de ventas Q4",
      due_at: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        9,
        0,
      ).toISOString(),
      state: "To Do",
      priority: "Alta",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
    {
      id: generateId(),
      title: "Actualizar documentación del producto",
      due_at: new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 5,
        16,
        0,
      ).toISOString(),
      state: "To Do",
      priority: "Baja",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
    // Tareas adicionales para probar diferentes escenarios
    {
      id: generateId(),
      title: "Seguimiento TechCorp",
      description: "Seguimiento con Laura Martínez - TechCorp",
      state: "To Do",
      priority: "Media",
      due_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 días en el futuro
      completed_at: null,
      notes: "Reunión de seguimiento para propuesta de analytics",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
    {
      id: generateId(),
      title: "Revisar propuesta StartupXYZ",
      description: "Revisar propuesta vencida - StartupXYZ",
      state: "To Do",
      priority: "Alta",
      due_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 días atrás (vencida)
      completed_at: null,
      notes: "URGENTE: Propuesta vencida hace 3 días",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
    {
      id: generateId(),
      title: "Preparar presentación GlobalCorp",
      description: "Preparar presentación ejecutiva - GlobalCorp",
      state: "Doing",
      priority: "Alta",
      due_at: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 día en el futuro
      completed_at: null,
      notes: "Presentación para el comité ejecutivo",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
    {
      id: generateId(),
      title: "Llamada de reactivación LocalBiz",
      description: "Llamada de reactivación - LocalBiz",
      state: "To Do",
      priority: "Baja",
      due_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días en el futuro
      completed_at: null,
      notes: "Contacto inactivo hace 30 días",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Task,
  ];

  const demoDeals: Deal[] = [
    {
      id: generateId(),
      title: "Software CRM Enterprise",
      company: "DataFlow Systems",
      amount: 85000,
      stage: "Cierre",
      probability: 90,
      target_close_date: new Date(
        now.getFullYear(),
        now.getMonth(),
        15,
      ).toISOString(),
      next_step: "Firmar contrato",
      status: "Open",
      score: 0, // Se calculará automáticamente
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: now.toISOString(),
      inactivity_days: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Implementación ERP - InnovaCorp",
      company: "InnovaCorp Solutions",
      amount: 45000,
      stage: "Propuesta",
      probability: 70,
      target_close_date: pastDate.toISOString(),
      next_step: undefined,
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días atrás
      inactivity_days: 5,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Consultoría Digital - RetailMax",
      company: "RetailMax Inc.",
      amount: 28500,
      stage: "Negociación",
      probability: 85,
      target_close_date: pastDate.toISOString(),
      next_step: "Reunión de seguimiento",
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 días atrás
      inactivity_days: 2,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Sistema de Inventario",
      company: "TechStart Ltd.",
      amount: 15000,
      stage: "Cierre",
      probability: 100,
      target_close_date: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        10,
      ).toISOString(),
      next_step: "Implementación",
      status: "Won",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 día atrás
      inactivity_days: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Proyecto de Transformación Digital",
      company: "MegaCorp Industries",
      amount: 120000,
      stage: "Calificación",
      probability: 60,
      target_close_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días en el futuro
      next_step: "Presentación ejecutiva",
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: now.toISOString(), // Hoy
      inactivity_days: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    // Deals adicionales para probar diferentes escenarios
    {
      id: generateId(),
      title: "Solución de Analytics Avanzada",
      company: "TechCorp Analytics",
      amount: 25000,
      stage: "Prospección",
      probability: 20,
      target_close_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 días en el futuro
      next_step: "Primera reunión",
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 días atrás
      inactivity_days: 10,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Integración API - StartupXYZ",
      company: "StartupXYZ",
      amount: 8000,
      stage: "Negociación",
      probability: 60,
      target_close_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días atrás (vencido)
      next_step: "Revisar propuesta",
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Alto" as const,
      last_activity: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 días atrás
      inactivity_days: 15,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Consultoría Estratégica - GlobalCorp",
      company: "GlobalCorp International",
      amount: 150000,
      stage: "Propuesta",
      probability: 80,
      target_close_date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 días en el futuro
      next_step: "Presentación ejecutiva",
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Bajo" as const,
      last_activity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 día atrás
      inactivity_days: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
    {
      id: generateId(),
      title: "Sistema de Gestión - LocalBiz",
      company: "LocalBiz S.L.",
      amount: 12000,
      stage: "Calificación",
      probability: 40,
      target_close_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días en el futuro
      next_step: null, // Sin próximo paso - alto riesgo
      status: "Open",
      score: 0,
      priority: "Cold" as const,
      risk_level: "Alto" as const,
      last_activity: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 días atrás
      inactivity_days: 20,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Deal,
  ];

  const demoContacts: Contact[] = [
    {
      id: generateId(),
      name: "Juan Pérez",
      email: "juan.perez@dataflow.com",
      company: "DataFlow Systems",
      score: 0,
      priority: "Cold" as const,
      last_activity: now.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "María García",
      email: "maria.garcia@innovacorp.com",
      company: "InnovaCorp Solutions",
      score: 0,
      priority: "Cold" as const,
      last_activity: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 días atrás
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "Carlos López",
      email: "carlos.lopez@retailmax.com",
      company: "RetailMax Inc.",
      score: 0,
      priority: "Cold" as const,
      last_activity: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 día atrás
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "Ana Martínez",
      email: "ana.martinez@techstart.com",
      company: "TechStart Ltd.",
      score: 0,
      priority: "Cold" as const,
      last_activity: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 semana atrás
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "Roberto Silva",
      email: "roberto.silva@megacorp.com",
      company: "MegaCorp Industries",
      score: 0,
      priority: "Cold" as const,
      last_activity: now.toISOString(), // Hoy
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    // Contactos adicionales para probar diferentes escenarios
    {
      id: generateId(),
      name: "Laura Martínez",
      email: "laura.martinez@techcorp.com",
      company: "TechCorp Analytics",
      score: 0,
      priority: "Cold" as const,
      last_activity: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días atrás
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "David Chen",
      email: "david.chen@startupxyz.com",
      company: "StartupXYZ",
      score: 0,
      priority: "Cold" as const,
      last_activity: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 días atrás
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "Sarah Johnson",
      email: "sarah.johnson@globalcorp.com",
      company: "GlobalCorp International",
      score: 0,
      priority: "Cold" as const,
      last_activity: now.toISOString(), // Hoy
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
    {
      id: generateId(),
      name: "Miguel Rodríguez",
      email: "miguel.rodriguez@localbiz.com",
      company: "LocalBiz S.L.",
      score: 0,
      priority: "Cold" as const,
      last_activity: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días atrás
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as Contact,
  ];

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    try {
      await Promise.all([
        supabase
          .from("tasks")
          .insert(demoTasks.map(({ id, created_at, updated_at, ...t }) => t)),
        supabase
          .from("deals")
          .insert(demoDeals.map(({ id, created_at, updated_at, ...d }) => d)),
        supabase
          .from("contacts")
          .insert(demoContacts.map(({ id, created_at, updated_at, ...c }) => c)),
      ]);
      // Seed companies
      await seedCompanies();
    } catch (error) {
      console.error("Error seeding demo data:", error);
      throw new Error("Failed to seed demo data");
    }
  } else {
    demoData.tasks = demoTasks;
    demoData.deals = demoDeals;
    demoData.contacts = demoContacts;
    // Seed companies for demo mode
    await seedCompanies();
  }
}
