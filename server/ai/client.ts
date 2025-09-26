import type { ChatCompletionRequest, ChatCompletionResult } from "./types";

export class MissingAIKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured");
    this.name = "MissingAIKeyError";
  }
}

export class AIRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AIRequestError";
    this.status = status;
  }
}

const DEFAULT_MODEL = process.env.OPENAI_API_MODEL || "gpt-4o-mini";
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const MAX_TOKENS = Number(process.env.OPENAI_API_MAX_TOKENS || 700);

export async function callChatCompletion({
  messages,
  responseFormat,
  temperature = 0.4,
  maxTokens = MAX_TOKENS,
  model = DEFAULT_MODEL,
  metadata,
}: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new MissingAIKeyError();
  }

  const start = Date.now();

  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
      messages,
    }),
  });

  const elapsed = Date.now() - start;

  if (!response.ok) {
    const text = await response.text();
    console.error("[AI] call failed", { status: response.status, body: text, metadata });
    throw new AIRequestError(`OpenAI request failed: ${response.status}`, response.status);
  }

  const json = await response.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content ?? undefined;

  return {
    content: content ?? null,
    raw: json,
    usage: json?.usage ?? null,
    elapsed,
    metadata,
  };
}

type RequiredMessages = ChatCompletionRequest["messages"];

export function buildMessages(system: string, user: string): RequiredMessages {
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export { DEFAULT_MODEL, MAX_TOKENS };
