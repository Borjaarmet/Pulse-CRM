export type DigestTimeframe = "today" | "week" | "month";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" | "text" };
  temperature?: number;
  maxTokens?: number;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatCompletionResult {
  content: string | null;
  raw: any;
  usage: null | {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  elapsed: number;
  metadata?: Record<string, unknown>;
}

export interface DigestStats {
  hotDeals: number;
  riskDeals: number;
  overdueTasks: number;
}

export interface DigestDealSnapshot {
  id: string;
  title: string;
  company?: string | null;
  amount?: number | null;
  stage: string;
  priority: string;
  risk: string;
  nextStep?: string | null;
  targetCloseDate?: string | null;
}

export interface DigestAlertSnapshot {
  id: string;
  message: string;
  recommendedAction: string;
  severity: string;
  priority: string;
}

export interface DigestRequestPayload {
  timeframe: DigestTimeframe;
  stats: DigestStats;
  topDeals: DigestDealSnapshot[];
  alerts: DigestAlertSnapshot[];
  fallbackText: string;
}

export interface DigestResponsePayload {
  headline: string | null;
  summary: string[] | null;
  actions: string[] | null;
  content: string | null;
  provider: string;
  usedFallback: boolean;
  error?: string;
}

export interface NextStepDealSnapshot {
  id: string;
  title: string;
  company?: string | null;
  stage: string;
  probability?: number | null;
  priority?: string | null;
  risk?: string | null;
  amount?: number | null;
  nextStep?: string | null;
  lastActivity?: string | null;
  targetCloseDate?: string | null;
}

export interface NextStepContext {
  reasons?: string[];
  inactivityDays?: number;
  owner?: string | null;
}

export interface NextStepRequestPayload {
  deal: NextStepDealSnapshot;
  context?: NextStepContext;
  fallbackText: string;
}

export interface NextStepResponsePayload {
  nextStep: string | null;
  rationale: string[] | null;
  provider: string;
  usedFallback: boolean;
  error?: string;
}

export interface ContactSummarySnapshot {
  id: string;
  name: string;
  company?: string | null;
  role?: string | null;
  lastActivity?: string | null;
  owner?: string | null;
  deals?: Array<{
    id: string;
    title: string;
    stage: string;
    status: string;
    amount?: number | null;
    priority?: string | null;
    lastActivity?: string | null;
  }>;
}

export interface ContactSummaryRequestPayload {
  contact: ContactSummarySnapshot;
  fallbackText: string;
}

export interface ContactSummaryResponsePayload {
  headline: string | null;
  highlights: string[] | null;
  provider: string;
  usedFallback: boolean;
  error?: string;
}
