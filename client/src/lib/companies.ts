import type { Company } from './types';

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

// Log de verificación de entorno
console.log("[COMPANIES ENV]", !!SUPABASE_URL, (SUPABASE_ANON_KEY || "").slice(-6));

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
        auth: { persistSession: false },
      });
    })();
  }
  await initPromise;
}

/* =========================
   DEMO STORE (fallback)
   ========================= */
let demoCompanies: Company[] = [];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/* ==============
   QUERIES: COMPANIES
   ============== */
export async function getCompanies(): Promise<Company[]> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  return demoCompanies;
}

export async function addCompany(
  payload: Omit<Company, "id" | "created_at" | "updated_at">,
): Promise<Company> {
  const normalizedPayload = {
    ...payload,
    score: payload.score || 0,
    priority: payload.priority || "Cold",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("companies")
      .insert([normalizedPayload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const newCompany = {
    id: generateId(),
    ...normalizedPayload,
  };
  demoCompanies.unshift(newCompany);
  return newCompany;
}

export async function updateCompany(id: string, patch: Partial<Company>): Promise<Company> {
  const normalizedPatch = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("companies")
      .update(normalizedPatch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const idx = demoCompanies.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Company not found");
  demoCompanies[idx] = { ...demoCompanies[idx], ...normalizedPatch };
  return demoCompanies[idx];
}

export async function deleteCompany(id: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const idx = demoCompanies.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Company not found");
  demoCompanies.splice(idx, 1);
}

export async function getCompanyById(id: string): Promise<Company | null> {
  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  return demoCompanies.find(c => c.id === id) || null;
}

/* =====================
   SEED DE DATOS DEMO
   ===================== */
export async function seedCompanies(): Promise<void> {
  const now = new Date();

  const demoCompaniesData: Company[] = [
    {
      id: generateId(),
      name: "DataFlow Systems",
      industry: "Tecnología",
      size: "Enterprise",
      revenue_estimate: 50000000,
      location: "Madrid, España",
      website: "https://dataflow.com",
      description: "Empresa líder en soluciones de datos y analytics",
      score: 0,
      priority: "Cold" as const,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId(),
      name: "InnovaCorp Solutions",
      industry: "Consultoría",
      size: "Large",
      revenue_estimate: 15000000,
      location: "Barcelona, España",
      website: "https://innovacorp.com",
      description: "Consultoría especializada en transformación digital",
      score: 0,
      priority: "Cold" as const,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId(),
      name: "RetailMax Inc.",
      industry: "Retail",
      size: "Medium",
      revenue_estimate: 8000000,
      location: "Valencia, España",
      website: "https://retailmax.com",
      description: "Cadena de retail con presencia nacional",
      score: 0,
      priority: "Cold" as const,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId(),
      name: "TechStart Ltd.",
      industry: "Startup",
      size: "Small",
      revenue_estimate: 2000000,
      location: "Sevilla, España",
      website: "https://techstart.com",
      description: "Startup tecnológica en fase de crecimiento",
      score: 0,
      priority: "Cold" as const,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: generateId(),
      name: "MegaCorp Industries",
      industry: "Manufacturing",
      size: "Enterprise",
      revenue_estimate: 100000000,
      location: "Bilbao, España",
      website: "https://megacorp.com",
      description: "Multinacional del sector industrial",
      score: 0,
      priority: "Cold" as const,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  if (IS_SUPABASE_MODE) {
    await ensureSupabase();
    try {
      await supabase
        .from("companies")
        .insert(demoCompaniesData.map(({ id, created_at, updated_at, ...c }) => c));
    } catch (error) {
      console.error("Error seeding companies:", error);
      throw new Error("Failed to seed companies");
    }
  } else {
    demoCompanies = demoCompaniesData;
  }
}