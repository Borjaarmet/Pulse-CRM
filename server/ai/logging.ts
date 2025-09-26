import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface AIInvocationLogInput {
  job: string;
  status: "success" | "fallback" | "error" | "cache-hit";
  provider?: string | null;
  elapsedMs?: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  usedFallback?: boolean;
  payloadHash?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string | null;
}

let supabase: SupabaseClient | null = null;

function ensureSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return null;
  }

  if (!supabase) {
    supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });
  }

  return supabase;
}

export async function logAIInvocation(entry: AIInvocationLogInput): Promise<void> {
  const client = ensureSupabase();
  if (!client) {
    return;
  }

  try {
    await client.from("ai_logs").insert({
      job: entry.job,
      status: entry.status,
      provider: entry.provider ?? null,
      elapsed_ms: entry.elapsedMs ?? null,
      prompt_tokens: entry.promptTokens ?? null,
      completion_tokens: entry.completionTokens ?? null,
      total_tokens: entry.totalTokens ?? null,
      used_fallback: entry.usedFallback ?? null,
      payload_hash: entry.payloadHash ?? null,
      metadata: entry.metadata ?? null,
      error_message: entry.errorMessage ?? null,
    });
  } catch (error) {
    console.error("[AI] Failed to persist log", error);
  }
}
