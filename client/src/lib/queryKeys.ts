export const QUERY_KEYS = {
  tasks: ["tasks"] as const,
  deals: ["deals"] as const,
  contacts: ["contacts"] as const,
  hotDeal: ["hotDeal"] as const,
  stalledDeals: ["stalledDeals"] as const,
  quickMetrics: ["quickMetrics"] as const,
  companies: ["companies"] as const,
} as const;

export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];
