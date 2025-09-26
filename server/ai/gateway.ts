import { createHash } from "crypto";
import type {
  DigestRequestPayload,
  DigestResponsePayload,
  NextStepRequestPayload,
  NextStepResponsePayload,
  ContactSummaryRequestPayload,
  ContactSummaryResponsePayload,
} from "./types";
import {
  callChatCompletion,
  buildMessages,
  MissingAIKeyError,
  AIRequestError,
  MAX_TOKENS,
  DEFAULT_MODEL,
} from "./client";
import { logAIInvocation } from "./logging";

const DIGEST_CACHE_TTL_MS = Number(process.env.AI_DIGEST_CACHE_TTL_MS || 5 * 60 * 1000);
const digestCache = new Map<
  string,
  {
    response: DigestResponsePayload;
    expiresAt: number;
    payloadHash: string;
  }
>();

function fingerprintPayload(payload: DigestRequestPayload): string {
  const normalized = {
    timeframe: payload.timeframe,
    stats: payload.stats,
    topDeals: payload.topDeals.map((deal) => ({
      id: deal.id,
      stage: deal.stage,
      priority: deal.priority,
      risk: deal.risk,
      amount: deal.amount,
      nextStep: deal.nextStep,
      targetCloseDate: deal.targetCloseDate,
    })),
    alerts: payload.alerts.map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      priority: alert.priority,
      message: alert.message,
    })),
  };

  return createHash("sha1").update(JSON.stringify(normalized)).digest("hex");
}

function buildPrompt({ stats, topDeals, alerts, timeframe }: DigestRequestPayload): string {
  const timeframeLabel = timeframe === "today" ? "hoy" : timeframe === "week" ? "esta semana" : "este mes";
  const statsLines = [
    `• Deals Hot abiertos: ${stats.hotDeals}`,
    `• Deals en riesgo alto: ${stats.riskDeals}`,
    `• Tareas vencidas o críticas: ${stats.overdueTasks}`,
  ];

  const dealsLines = topDeals.slice(0, 5).map((deal, index) => {
    const base = `${index + 1}. ${deal.title} (${deal.company ?? "Sin empresa"}) · ${deal.stage} · ${deal.priority} · ${deal.risk}`;
    const amount = typeof deal.amount === "number" ? ` · €${deal.amount.toLocaleString("es-ES")}` : "";
    const nextStep = deal.nextStep ? ` · Próximo paso: ${deal.nextStep}` : "";
    const target = deal.targetCloseDate ? ` · Cierre objetivo: ${deal.targetCloseDate}` : "";
    return `${base}${amount}${target}${nextStep}`;
  });

  const alertsLines = alerts.slice(0, 5).map((alert, index) => `${index + 1}. ${alert.message} · ${alert.recommendedAction}`);

  return [
    `Eres un assistant de MindLab especializado en ventas B2B. Genera un digest accionable para ${timeframeLabel}.`,
    "Siempre responde en español neutro, tono profesional y conciso.",
    "No inventes datos. Usa únicamente la información suministrada.",
    "Devuelve la respuesta en **JSON válido** con la siguiente forma exacta:",
    '{',
    '  "headline": "...",',
    '  "summary": ["párrafo 1", "párrafo 2"],',
    '  "actions": ["Acción 1", "Acción 2", "Acción 3"]',
    '}',
    "Reglas para el JSON:",
    "- `headline` debe ser una frase motivadora.",
    "- `summary` debe contener 2 entradas como máximo, cada una con frases cortas (<= 2 oraciones).",
    "- `actions` debe tener entre 3 y 5 strings. Cada string comienza con un verbo en imperativo y puede incluir contexto adicional (owner, deal, fechas).",
    "- No añadas claves extra ni valores nulos.",
    "Datos numéricos de contexto:",
    ...statsLines,
    "Deals prioritarios:",
    dealsLines.length ? dealsLines.join("\n") : "Sin deals destacados.",
    "Alertas activas:",
    alertsLines.length ? alertsLines.join("\n") : "Sin alertas activas.",
  ].join("\n");
}

export async function generateDigest(payload: DigestRequestPayload): Promise<DigestResponsePayload> {
  console.log("[AI] generateDigest", {
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    timeframe: payload.timeframe,
    deals: payload.topDeals.length,
    alerts: payload.alerts.length,
  });

  const payloadHash = fingerprintPayload(payload);
  const cacheKey = `${payload.timeframe}:${payloadHash}`;

  if (DIGEST_CACHE_TTL_MS > 0) {
    const cached = digestCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log("[AI] digest cache hit", { timeframe: payload.timeframe });
      await logAIInvocation({
        job: "digest",
        status: "cache-hit",
        provider: cached.response.provider,
        usedFallback: cached.response.usedFallback,
        payloadHash,
      });
      return cached.response;
    }

    if (cached && cached.expiresAt <= Date.now()) {
      digestCache.delete(cacheKey);
    }
  }

  const prompt = buildPrompt(payload);

  try {
    const result = await callChatCompletion({
      messages: buildMessages(
        "Eres un experto en operaciones comerciales. Devuelve únicamente JSON válido con la estructura solicitada.",
        prompt,
      ),
      responseFormat: { type: "json_object" },
      temperature: 0.4,
      maxTokens: MAX_TOKENS,
      metadata: {
        job: "digest",
        timeframe: payload.timeframe,
      },
    });

    console.log("[AI] raw json", JSON.stringify(result.raw));

    const content = result.content;
    if (!content) {
      throw new Error("Respuesta sin contenido");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`No se pudo parsear la respuesta JSON: ${(parseError as Error).message}`);
    }

    console.log("[AI] parsed content", parsed);

    const summarySource = parsed.summary ?? parsed.resumen ?? parsed.body;
    const summaryLines = Array.isArray(summarySource)
      ? parsed.summary
      : typeof summarySource === "string"
        ? [summarySource]
        : null;

    const headlineField = parsed.headline ?? parsed.titular ?? parsed.title ?? null;
    const actionsField = parsed.actions ?? parsed.acciones ?? parsed.action_items ?? null;
    const actionsLines = Array.isArray(actionsField)
      ? actionsField.map((action) => {
          if (typeof action === "string") return action;
          if (action && typeof action === "object") {
            const label = action.action ?? action.accion ?? action['acción'] ?? action.title ?? action.titulo;
            const details = action.details ?? action.detalles;
            const priority = action.priority ?? action.prioridad;
            return [label, priority ? `(Prioridad ${priority})` : null, details].filter(Boolean).join(" ");
          }
          return String(action ?? "");
        })
      : Array.isArray(parsed.actionItems)
        ? parsed.actionItems
        : null;

    const contentField = parsed.content || parsed.output || parsed.text || null;
    const fallbackContent = [headlineField, ...(summaryLines ?? []), ...(actionsLines ?? [])]
      .filter(Boolean)
      .join("\n");
    const finalContent = contentField || fallbackContent || "";

    if (!finalContent.trim()) {
      console.warn("[AI] Modelo no devolvió contenido útil. Usamos fallback.");
      const fallback = {
        headline: null,
        summary: null,
        actions: null,
        content: payload.fallbackText,
        provider: (result.raw?.model as string | undefined) ?? DEFAULT_MODEL,
        usedFallback: true,
      } satisfies DigestResponsePayload;

      await logAIInvocation({
        job: "digest",
        status: "fallback",
        provider: fallback.provider,
        usedFallback: true,
        payloadHash,
        metadata: {
          timeframe: payload.timeframe,
        },
      });

      return fallback;
    }

    const successful: DigestResponsePayload = {
      headline: headlineField,
      summary: summaryLines,
      actions: actionsLines,
      content: finalContent,
      provider: (result.raw?.model as string | undefined) ?? DEFAULT_MODEL,
      usedFallback: false,
    };

    if (DIGEST_CACHE_TTL_MS > 0) {
      digestCache.set(cacheKey, {
        response: successful,
        expiresAt: Date.now() + DIGEST_CACHE_TTL_MS,
        payloadHash,
      });
    }

    await logAIInvocation({
      job: "digest",
      status: "success",
      provider: successful.provider,
      elapsedMs: result.elapsed,
      promptTokens: result.usage?.prompt_tokens ?? null,
      completionTokens: result.usage?.completion_tokens ?? null,
      totalTokens: result.usage?.total_tokens ?? null,
      usedFallback: false,
      payloadHash,
      metadata: {
        timeframe: payload.timeframe,
        deals: payload.topDeals.length,
        alerts: payload.alerts.length,
      },
    });

    return successful;
  } catch (error) {
    if (error instanceof MissingAIKeyError) {
      console.warn("[AI] OPENAI_API_KEY not configured. Returning fallback digest.");
      const fallback = {
        headline: null,
        summary: null,
        actions: null,
        provider: "fallback",
        content: payload.fallbackText,
        usedFallback: true,
      } satisfies DigestResponsePayload;

      await logAIInvocation({
        job: "digest",
        status: "fallback",
        provider: fallback.provider,
        usedFallback: true,
        payloadHash,
        metadata: {
          timeframe: payload.timeframe,
        },
        errorMessage: error.message,
      });

      return fallback;
    }

    if (error instanceof AIRequestError) {
      console.error("[AI] generateDigest request error", {
        message: error.message,
        status: error.status,
      });
    } else {
      console.error("[AI] generateDigest error", error);
    }

    const fallback = {
      headline: null,
      summary: null,
      actions: null,
      provider: "fallback-error",
      content: payload.fallbackText,
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    } satisfies DigestResponsePayload;

    await logAIInvocation({
      job: "digest",
      status: "error",
      provider: fallback.provider,
      usedFallback: true,
      payloadHash,
      metadata: {
        timeframe: payload.timeframe,
      },
      errorMessage: fallback.error ?? null,
    });

    return fallback;
  }
}

function buildNextStepPrompt({ deal, context }: NextStepRequestPayload): string {
  const lines = [
    `Eres un assistant comercial que ayuda a reps a definir el próximo paso concreto para un deal.`,
    "Responde únicamente con JSON válido usando la forma:",
    '{',
    '  "next_step": "acción concreta",',
    '  "rationale": ["motivo 1", "motivo 2", "motivo 3"]',
    '}',
    "Normas:",
    "- `next_step` debe iniciar con un verbo en imperativo y describir acción+canal+objetivo.",
    "- Incluye en `rationale` entre 2 y 3 motivos cortos que expliquen la recomendación.",
    "- No inventes datos ni añadas claves adicionales.",
    "Contexto del deal:",
    `• Título: ${deal.title}`,
    `• Empresa: ${deal.company ?? "Sin empresa"}`,
    `• Etapa actual: ${deal.stage}`,
    `• Probabilidad declarada: ${deal.probability ?? "N/A"}`,
    `• Prioridad: ${deal.priority ?? "N/A"}`,
    `• Nivel de riesgo: ${deal.risk ?? "N/A"}`,
  ];

  if (deal.amount) {
    lines.push(`• Monto estimado: €${Number(deal.amount).toLocaleString("es-ES")}`);
  }
  if (deal.nextStep) {
    lines.push(`• Último próximo paso registrado: ${deal.nextStep}`);
  }
  if (deal.targetCloseDate) {
    lines.push(`• Fecha objetivo de cierre: ${deal.targetCloseDate}`);
  }
  if (deal.lastActivity) {
    lines.push(`• Última actividad registrada: ${deal.lastActivity}`);
  }
  if (context?.reasons?.length) {
    lines.push("Señales de riesgo: ", ...context.reasons.map((reason, idx) => `${idx + 1}. ${reason}`));
  }
  if (typeof context?.inactivityDays === "number") {
    lines.push(`• Días sin actividad: ${context.inactivityDays}`);
  }

  return lines.join("\n");
}

export async function generateNextStep(payload: NextStepRequestPayload): Promise<NextStepResponsePayload> {
  try {
    const prompt = buildNextStepPrompt(payload);
    const result = await callChatCompletion({
      messages: buildMessages(
        "Eres un asistente comercial senior. Devuelve JSON válido con la estructura solicitada.",
        prompt,
      ),
      responseFormat: { type: "json_object" },
      temperature: 0.5,
      metadata: { job: "next-step", dealId: payload.deal.id },
    });

    const content = result.content;
    if (!content) {
      throw new Error("Respuesta sin contenido");
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const nextStep = (parsed.next_step ?? parsed.nextStep ?? null) as string | null;
    const rationaleRaw = parsed.rationale ?? parsed.reasons ?? null;
    const rationale = Array.isArray(rationaleRaw)
      ? rationaleRaw.map((item) => String(item))
      : typeof rationaleRaw === "string"
        ? [rationaleRaw]
        : null;

    if (!nextStep || !nextStep.trim()) {
      throw new Error("JSON sin next_step");
    }

    const response: NextStepResponsePayload = {
      nextStep: nextStep.trim(),
      rationale,
      provider: (result.raw?.model as string | undefined) ?? DEFAULT_MODEL,
      usedFallback: false,
    };

    await logAIInvocation({
      job: "next-step",
      status: "success",
      provider: response.provider,
      elapsedMs: result.elapsed,
      promptTokens: result.usage?.prompt_tokens ?? null,
      completionTokens: result.usage?.completion_tokens ?? null,
      totalTokens: result.usage?.total_tokens ?? null,
      usedFallback: false,
      payloadHash: payload.deal.id,
      metadata: {
        stage: payload.deal.stage,
        risk: payload.deal.risk,
      },
    });

    return response;
  } catch (error) {
    console.error("[AI] generateNextStep error", error);

    await logAIInvocation({
      job: "next-step",
      status: error instanceof MissingAIKeyError ? "fallback" : "error",
      provider: "fallback",
      usedFallback: true,
      payloadHash: payload.deal.id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      nextStep: payload.fallbackText,
      rationale: null,
      provider: "fallback",
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function buildContactSummaryPrompt({ contact }: ContactSummaryRequestPayload): string {
  const lines = [
    "Eres un assistant comercial. Resume el estado actual del contacto en JSON válido:",
    '{',
    '  "headline": "frase corta",',
    '  "highlights": ["punto 1", "punto 2", "punto 3"]',
    '}',
    "- `headline`: tono profesional con llamada a la acción.",
    "- `highlights`: entre 2 y 4 bullet points cortos (máx 15 palabras).",
    "- No inventes datos ni añadas claves extra.",
    `Contacto: ${contact.name}`,
  ];

  if (contact.company) lines.push(`Empresa: ${contact.company}`);
  if (contact.role) lines.push(`Rol: ${contact.role}`);
  if (contact.owner) lines.push(`Owner interno: ${contact.owner}`);
  if (contact.lastActivity) lines.push(`Última actividad: ${contact.lastActivity}`);
  if (contact.deals?.length) {
    lines.push("Deals asociados:");
    contact.deals.forEach((deal, index) => {
      lines.push(
        `${index + 1}. ${deal.title} (${deal.stage}) · ${deal.status} · €${Number(deal.amount ?? 0).toLocaleString("es-ES")}`,
      );
    });
  } else {
    lines.push("No tiene deals vinculados actualmente.");
  }

  return lines.join("\n");
}

export async function generateContactSummary(
  payload: ContactSummaryRequestPayload,
): Promise<ContactSummaryResponsePayload> {
  try {
    const prompt = buildContactSummaryPrompt(payload);
    const result = await callChatCompletion({
      messages: buildMessages(
        "Eres un analista comercial. Devuelve exclusivamente JSON válido.",
        prompt,
      ),
      responseFormat: { type: "json_object" },
      temperature: 0.4,
      metadata: { job: "contact-summary", contactId: payload.contact.id },
    });

    const content = result.content;
    if (!content) {
      throw new Error("Respuesta sin contenido");
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const headline = (parsed.headline ?? parsed.titular ?? null) as string | null;
    const highlightsRaw = parsed.highlights ?? parsed.puntos ?? null;
    const highlights = Array.isArray(highlightsRaw)
      ? highlightsRaw.map((item) => String(item))
      : typeof highlightsRaw === "string"
        ? [highlightsRaw]
        : null;

    if (!headline && (!highlights || !highlights.length)) {
      throw new Error("JSON sin contenido útil");
    }

    const response: ContactSummaryResponsePayload = {
      headline,
      highlights,
      provider: (result.raw?.model as string | undefined) ?? DEFAULT_MODEL,
      usedFallback: false,
    };

    await logAIInvocation({
      job: "contact-summary",
      status: "success",
      provider: response.provider,
      elapsedMs: result.elapsed,
      promptTokens: result.usage?.prompt_tokens ?? null,
      completionTokens: result.usage?.completion_tokens ?? null,
      totalTokens: result.usage?.total_tokens ?? null,
      usedFallback: false,
      payloadHash: payload.contact.id,
      metadata: {
        company: payload.contact.company,
      },
    });

    return response;
  } catch (error) {
    console.error("[AI] generateContactSummary error", error);

    await logAIInvocation({
      job: "contact-summary",
      status: error instanceof MissingAIKeyError ? "fallback" : "error",
      provider: "fallback",
      usedFallback: true,
      payloadHash: payload.contact.id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      headline: null,
      highlights: [payload.fallbackText],
      provider: "fallback",
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
