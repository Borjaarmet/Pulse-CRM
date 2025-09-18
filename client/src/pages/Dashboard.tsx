import { useEffect, useState, Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import TasksCard from "@/components/TasksCard";
import HotDealCard from "@/components/HotDealCard";
import StalledDealsCard from "@/components/StalledDealsCard";
import RecentActivityCard from "@/components/RecentActivityCard";
import QuickMetricsCard from "@/components/QuickMetricsCard";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { seedDemo, subscribeToChanges } from "@/lib/db";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useTasksQuery, useDealsQuery, useContactsQuery } from "@/hooks/useCrmQueries";
import type { Task, Deal, Contact } from "@/lib/types";
import DealModal from "@/components/DealModal";
import ContactModal from "@/components/ContactModal";
import OverviewCard from "@/components/OverviewCard";
import AdvancedMetricsPanel from "@/components/AdvancedMetricsPanel";

// Lazy load the list components
const DealsList = lazy(() => import("@/components/DealsList"));
const ContactsList = lazy(() => import("@/components/ContactsList"));
const CompaniesList = lazy(() => import("@/components/CompaniesList"));

export default function Dashboard() {
  const [isDemo, setIsDemo] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasksData, isLoading: tasksLoading } = useTasksQuery();
  const { data: dealsData, isLoading: dealsLoading } = useDealsQuery();
  const { data: contactsData, isLoading: contactsLoading } = useContactsQuery();

  const tasks = tasksData ?? ([] as Task[]);
  const deals = dealsData ?? ([] as Deal[]);
  const contacts = contactsData ?? ([] as Contact[]);

  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    // Check if we're in demo mode
    const hasSupabaseEnv = !!(
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    setIsDemo(!hasSupabaseEnv);

    // Set up real-time subscriptions if using Supabase
    if (hasSupabaseEnv) {
      const unsubscribe = subscribeToChanges(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      });

      return unsubscribe;
    }
  }, [queryClient]);

  const handleInjectDemo = async () => {
    try {
      await seedDemo();
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quickMetrics });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stalledDeals });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hotDeal });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      toast({
        title: "Demo data injected",
        description: "Sample data has been added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to inject demo data",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deals });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
    toast({
      title: "Data refreshed",
      description: "All data has been updated",
    });
  };

  const openDeals = deals.filter((deal) => deal.status === "Open").length;
  const wonDeals = deals.filter((deal) => deal.status === "Won").length;
  const lostDeals = deals.filter((deal) => deal.status === "Lost").length;
  const activeTasks = tasks.filter((task) => task.state !== "Done").length;
  const activeContactsCount = contacts.filter((contact) => {
    if (!contact.last_activity) return false;
    const last = new Date(contact.last_activity);
    const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 14;
  }).length;

  const displayValue = (value: number, isLoading: boolean) =>
    isLoading ? "—" : value;

  const renderDashboardSummary = () => (
    <>
      <OverviewCard
        deals={deals}
        tasks={tasks}
        contactsActivos={contactsLoading ? 0 : activeContactsCount}
        isDealsLoading={dealsLoading}
        isTasksLoading={tasksLoading}
      />
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HotDealCard deals={deals} isLoading={dealsLoading} />
        <QuickMetricsCard
          tasks={tasks}
          deals={deals}
          isLoading={tasksLoading || dealsLoading}
        />
      </section>

      <section className="">
        <StalledDealsCard deals={deals} isLoading={dealsLoading} />
      </section>
      <section className="">
        <RecentActivityCard />
      </section>
    </>
  );

  return (
    <DashboardLayout
      isDemo={isDemo}
      onInjectDemo={handleInjectDemo}
      onRefresh={handleRefresh}
      initialSection="Dashboard"
    >
      {(activeSection) => {
        switch (activeSection) {
          case "Dashboard":
            return renderDashboardSummary();
          case "Deals":
            return (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Pipeline completo</h2>
                  <button
                    type="button"
                    onClick={() => setIsDealModalOpen(true)}
                    className="inline-flex items-center rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                  >
                    + Nuevo Deal
                  </button>
                </div>
                <HotDealCard deals={deals} isLoading={dealsLoading} />
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <DealsList />
                </Suspense>
                <DealModal
                  open={isDealModalOpen}
                  onClose={() => setIsDealModalOpen(false)}
                  contacts={contacts}
                />
              </section>
            );
          case "Contactos":
            return (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Contactos</h2>
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(true)}
                    className="inline-flex items-center rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/20"
                  >
                    + Nuevo Contacto
                  </button>
                </div>
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <ContactsList />
                </Suspense>
                <ContactModal
                  open={isContactModalOpen}
                  onClose={() => setIsContactModalOpen(false)}
                />
              </section>
            );
          case "Empresas":
            return (
              <section className="space-y-6">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <CompaniesList />
                </Suspense>
              </section>
            );
          case "Tareas":
            return (
              <section className="space-y-6">
                <TasksCard tasks={tasks} isLoading={tasksLoading} />
              </section>
            );
          case "Métricas":
            return (
              <section className="space-y-6">
                <QuickMetricsCard
                  tasks={tasks}
                  deals={deals}
                  isLoading={tasksLoading || dealsLoading}
                />
                <AdvancedMetricsPanel
                  deals={deals}
                  tasks={tasks}
                  contacts={contacts}
                  isLoading={tasksLoading || dealsLoading || contactsLoading}
                />
              </section>
            );
          default:
            return (
              <Card className="bg-white/5">
                <h3 className="text-lg font-semibold text-white">En desarrollo</h3>
                <p className="mt-2 text-sm text-white/60">
                  Esta sección estará disponible próximamente.
                </p>
              </Card>
            );
        }
      }}
    </DashboardLayout>
  );
}
