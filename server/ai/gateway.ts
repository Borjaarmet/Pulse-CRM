import type { DigestRequestPayload, DigestResponsePayload } from "./types";

const DEFAULT_MODEL = process.env.OPENAI_API_MODEL || "gpt-4o-mini";
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const MAX_TOKENS = Number(process.env.OPENAI_API_MAX_TOKENS || 700);

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
  const apiKey = process.env.OPENAI_API_KEY;
  const hasKey = Boolean(apiKey);

  console.log("[AI] generateDigest", {
    hasKey,
    timeframe: payload.timeframe,
    deals: payload.topDeals.length,
    alerts: payload.alerts.length,
  });

  if (!apiKey) {
    console.warn("[AI] OPENAI_API_KEY not configured. Returning fallback digest.");
    return {
      headline: null,
      summary: null,
      actions: null,
      provider: "fallback",
      content: payload.fallbackText,
      usedFallback: true,
    };
  }

  const prompt = buildPrompt(payload);

  try {
    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Eres un experto en operaciones comerciales. Devuelve únicamente JSON válido con la estructura solicitada.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    console.log("[AI] raw json", JSON.stringify(json));
    const content: string | undefined = json?.choices?.[0]?.message?.content;
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
      return {
        headline: null,
        summary: null,
        actions: null,
        content: payload.fallbackText,
        provider: DEFAULT_MODEL,
        usedFallback: true,
      };
    }

    return {
      headline: headlineField,
      summary: summaryLines,
      actions: actionsLines,
      content: finalContent,
      provider: DEFAULT_MODEL,
      usedFallback: false,
    };
  } catch (error) {
    console.error("[AI] generateDigest error", error);
    return {
      headline: null,
      summary: null,
      actions: null,
      provider: "fallback-error",
      content: payload.fallbackText,
      usedFallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
