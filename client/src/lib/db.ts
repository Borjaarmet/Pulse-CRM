// lib/db.ts
import type { Task, Deal, Contact, TimelineEntry } from "./types";

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
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const newTask = {
    id: generateId(),
    ...payload,
    inserted_at: new Date().toISOString(),
  };
  demoData.tasks.unshift(newTask);
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
    return data;
  }

  const idx = demoData.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");
  demoData.tasks[idx].state = state;
  return demoData.tasks[idx];
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

export async function addDeal(
  payload: Omit<Deal, "id" | "updated_at"> & { contact_id?: string },
): Promise<Deal> {
  // Normalize defaults
  const normalizedPayload = {
    ...payload,
    status: payload.status || "Open",
    risk: (payload as any).risk || "Bajo",
    probability: payload.probability ?? 0,
    stage: payload.stage || "Prospección",
    updated_at: new Date().toISOString(),
  };

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals")
      .insert([normalizedPayload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const newDeal = {
    id: generateId(),
    ...normalizedPayload,
  };
  demoData.deals.unshift(newDeal);
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
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const newContact = {
    id: generateId(),
    ...payload,
    inserted_at: new Date().toISOString(),
  };
  demoData.contacts.unshift(newContact);
  return newContact;
}

/* ==============
   UPDATE/DELETE FUNCTIONS
   ============== */
export async function updateDeal(id: string, patch: Partial<Deal>): Promise<Deal> {
  const normalizedPatch = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("deals")
      .update(normalizedPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const idx = demoData.deals.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Deal not found");
  demoData.deals[idx] = { ...demoData.deals[idx], ...normalizedPatch };
  return demoData.deals[idx];
}

export async function deleteDeal(id: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const idx = demoData.deals.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Deal not found");
  demoData.deals.splice(idx, 1);
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("contacts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const idx = demoData.contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Contact not found");
  demoData.contacts[idx] = { ...demoData.contacts[idx], ...patch };
  return demoData.contacts[idx];
}

export async function deleteContact(id: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const idx = demoData.contacts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Contact not found");
  demoData.contacts.splice(idx, 1);
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
      inserted_at: now.toISOString(),
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
      inserted_at: now.toISOString(),
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
      inserted_at: now.toISOString(),
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
      status: "Open", // respeta el CHECK ('Open','Won','Lost')
      updated_at: now.toISOString(),
    } as unknown as Deal,
    {
      id: generateId(),
      title: "Implementación ERP - InnovaCorp",
      company: "InnovaCorp Solutions",
      amount: 45000,
      stage: "Propuesta",
      probability: 70,
      target_close_date: pastDate.toISOString(),
      next_step: null,
      status: "Open",
      updated_at: now.toISOString(),
    } as unknown as Deal,
    {
      id: generateId(),
      title: "Consultoría Digital - RetailMax",
      company: "RetailMax Inc.",
      amount: 28500,
      stage: "Negociación",
      probability: 85,
      target_close_date: pastDate.toISOString(),
      next_step: null,
      status: "Open",
      updated_at: now.toISOString(),
    } as unknown as Deal,
    {
      id: generateId(),
      title: "Sistema de Inventario",
      company: "TechStart Ltd.",
      amount: 15000,
      stage: "Cerrado",
      probability: 100,
      target_close_date: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        10,
      ).toISOString(),
      next_step: "Implementación",
      status: "Won",
      updated_at: now.toISOString(),
    } as unknown as Deal,
  ];

  const demoContacts: Contact[] = [
    {
      id: generateId(),
      name: "Juan Pérez",
      email: "juan.perez@dataflow.com",
      company: "DataFlow Systems",
      inserted_at: now.toISOString(),
    } as Contact,
  ];

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    try {
      await Promise.all([
        supabase
          .from("tasks")
          .insert(demoTasks.map(({ id, inserted_at, ...t }) => t)),
        supabase
          .from("deals")
          .insert(demoDeals.map(({ id, updated_at, ...d }) => d)),
        supabase
          .from("contacts")
          .insert(demoContacts.map(({ id, inserted_at, ...c }) => c)),
      ]);
    } catch (error) {
      console.error("Error seeding demo data:", error);
      throw new Error("Failed to seed demo data");
    }
  } else {
    demoData.tasks = demoTasks;
    demoData.deals = demoDeals;
    demoData.contacts = demoContacts;
  }
}
