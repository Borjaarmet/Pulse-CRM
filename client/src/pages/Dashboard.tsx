import { useEffect, useState, Suspense, lazy } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import TasksCard from "@/components/TasksCard";
import HotDealCard from "@/components/HotDealCard";
import StalledDealsCard from "@/components/StalledDealsCard";
import RecentActivityCard from "@/components/RecentActivityCard";
import ShortcutsCard from "@/components/ShortcutsCard";
import QuickMetricsCard from "@/components/QuickMetricsCard";
import ScoringDashboard from "@/components/ScoringDashboard";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { seedDemo, subscribeToChanges } from "@/lib/db";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import { useTasksQuery, useDealsQuery, useContactsQuery } from "@/hooks/useCrmQueries";
import type { Task, Deal, Contact } from "@/lib/types";

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

  const hotDeals = deals.filter((deal) => deal.priority === "Hot").length;
  const warmDeals = deals.filter((deal) => deal.priority === "Warm").length;
  const totalContacts = contacts.length;

  const displayValue = (value: number, isLoading: boolean) =>
    isLoading ? "—" : value;

  return (
    <DashboardLayout
      isDemo={isDemo}
      onInjectDemo={handleInjectDemo}
      onRefresh={handleRefresh}
      initialSection="Dashboard"
    >
      <section id="dashboard-overview" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 bg-white/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/60">Buenos días 👋</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Tienes {displayValue(hotDeals, dealsLoading)} deals calientes y {displayValue(activeTasks, tasksLoading)} tareas activas
              </h2>
              <p className="mt-1 text-sm text-white/50">
                La IA recomienda priorizar los deals con mayor riesgo esta mañana.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-right">
              <p className="text-xs uppercase tracking-wide text-white/60">Pipeline activo</p>
              <p className="text-3xl font-bold text-white">€0</p>
              <p className="text-xs text-white/40">Actualizado hace un momento</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-white/50">Deals Hot</p>
              <p className="text-2xl font-semibold text-white">{displayValue(hotDeals, dealsLoading)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-white/50">Deals Warm</p>
              <p className="text-2xl font-semibold text-white">{displayValue(warmDeals, dealsLoading)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-white/50">Contactos activos</p>
              <p className="text-2xl font-semibold text-white">{displayValue(totalContacts, contactsLoading)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-white/50">Racha activa</p>
              <p className="text-2xl font-semibold text-white">7 días</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Próximas acciones</h3>
            <span className="rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-200">
              IA Sugerido
            </span>
          </div>
          <p className="mt-4 text-sm text-white/60">
            ¡Excelente! No hay deals en riesgo crítico. Mantén el ritmo con los deals warm para elevar su score.
          </p>
        </Card>
      </section>

      <section id="next-actions" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Tareas de hoy</h3>
            <span className="text-sm text-white/50">{displayValue(activeTasks, tasksLoading)}</span>
          </div>
          <p className="mt-4 text-sm text-white/60">
            {tasksLoading
              ? "Cargando tareas..."
              : activeTasks === 0
                ? "No hay tareas pendientes para hoy"
                : "Prioriza las tareas con fecha de vencimiento próxima."}
          </p>
          <button className="mt-6 text-sm font-medium text-blue-200 hover:text-blue-100">
            Ver lista completa →
          </button>
        </Card>

        <Card className="bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Pipeline este mes</h3>
            <span className="text-sm text-blue-200">Ver todo →</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-white">
            <div>
              <p className="text-xs text-white/50">Abiertos</p>
              <p className="text-2xl font-semibold">{displayValue(openDeals, dealsLoading)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Ganados</p>
              <p className="text-2xl font-semibold">{displayValue(wonDeals, dealsLoading)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Perdidos</p>
              <p className="text-2xl font-semibold">{displayValue(lostDeals, dealsLoading)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Valor total</p>
              <p className="text-2xl font-semibold">€0K</p>
            </div>
          </div>
        </Card>

        <ShortcutsCard />
      </section>

      <section id="tasks-section" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TasksCard tasks={tasks} isLoading={tasksLoading} />
        <HotDealCard deals={deals} isLoading={dealsLoading} />
      </section>

      <section id="pipeline-section" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <StalledDealsCard deals={deals} isLoading={dealsLoading} />
        <QuickMetricsCard
          tasks={tasks}
          deals={deals}
          isLoading={tasksLoading || dealsLoading}
        />
        <RecentActivityCard />
      </section>

      <section className="grid grid-cols-1 gap-6">
        <ScoringDashboard />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div id="deals-section">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <DealsList />
          </Suspense>
        </div>

        <div id="contacts-section">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ContactsList />
          </Suspense>
        </div>

        <div id="companies-section">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <CompaniesList />
          </Suspense>
        </div>
      </section>
    </DashboardLayout>
  );
}
