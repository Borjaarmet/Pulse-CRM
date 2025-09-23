import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  getTasks,
  getDeals,
  getContacts,
  getHotDeal,
  getStalledDeals,
  getQuickMetrics,
  getRecentActivity,
  getDealTimeline,
} from "@/lib/db";
import { QUERY_KEYS } from "@/lib/queryKeys";
import type { Task, Deal, Contact, TimelineEntry } from "@/lib/types";

export interface QuickMetrics {
  open: number;
  won: number;
  lost: number;
  sumOpen: number;
}

// Utility type to allow future configuration overrides without leaking queryKey/queryFn
type QueryConfig<TData, TKey extends readonly unknown[]> = Omit<
  UseQueryOptions<TData, unknown, TData, TKey>,
  "queryKey" | "queryFn"
>;

export function useTasksQuery(config?: QueryConfig<Task[], typeof QUERY_KEYS.tasks>) {
  return useQuery<Task[], unknown, Task[], typeof QUERY_KEYS.tasks>({
    queryKey: QUERY_KEYS.tasks,
    queryFn: getTasks,
    ...config,
  });
}

export function useDealsQuery(config?: QueryConfig<Deal[], typeof QUERY_KEYS.deals>) {
  return useQuery<Deal[], unknown, Deal[], typeof QUERY_KEYS.deals>({
    queryKey: QUERY_KEYS.deals,
    queryFn: getDeals,
    ...config,
  });
}

export function useContactsQuery(config?: QueryConfig<Contact[], typeof QUERY_KEYS.contacts>) {
  return useQuery<Contact[], unknown, Contact[], typeof QUERY_KEYS.contacts>({
    queryKey: QUERY_KEYS.contacts,
    queryFn: getContacts,
    ...config,
  });
}

export function useHotDealQuery(config?: QueryConfig<Deal[], typeof QUERY_KEYS.hotDeal>) {
  return useQuery<Deal[], unknown, Deal[], typeof QUERY_KEYS.hotDeal>({
    queryKey: QUERY_KEYS.hotDeal,
    queryFn: getHotDeal,
    ...config,
  });
}

export function useStalledDealsQuery(config?: QueryConfig<Deal[], typeof QUERY_KEYS.stalledDeals>) {
  return useQuery<Deal[], unknown, Deal[], typeof QUERY_KEYS.stalledDeals>({
    queryKey: QUERY_KEYS.stalledDeals,
    queryFn: getStalledDeals,
    ...config,
  });
}

export function useQuickMetricsQuery(config?: QueryConfig<QuickMetrics, typeof QUERY_KEYS.quickMetrics>) {
  return useQuery<QuickMetrics, unknown, QuickMetrics, typeof QUERY_KEYS.quickMetrics>({
    queryKey: QUERY_KEYS.quickMetrics,
    queryFn: getQuickMetrics,
    ...config,
  });
}

export function useRecentActivityQuery(
  config?: QueryConfig<TimelineEntry[], typeof QUERY_KEYS.timeline>,
) {
  return useQuery<TimelineEntry[], unknown, TimelineEntry[], typeof QUERY_KEYS.timeline>({
    queryKey: QUERY_KEYS.timeline,
    queryFn: () => getRecentActivity(8),
    staleTime: 30_000,
    ...config,
  });
}

export function useDealTimelineQuery(
  dealId: string | undefined,
  config?: QueryConfig<TimelineEntry[], readonly [string, string | undefined]>,
  limit = 30,
) {
  return useQuery<TimelineEntry[], unknown, TimelineEntry[], readonly [string, string | undefined]>({
    queryKey: [QUERY_KEYS.dealTimeline[0], dealId] as const,
    queryFn: () => getDealTimeline(dealId!, limit),
    enabled: !!dealId,
    ...config,
  });
}
