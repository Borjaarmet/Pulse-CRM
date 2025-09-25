export type DigestTimeframe = "today" | "week" | "month";

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
