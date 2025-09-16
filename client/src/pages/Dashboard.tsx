import { useEffect, useState, Suspense, lazy } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import TasksCard from "@/components/TasksCard";
import HotDealCard from "@/components/HotDealCard";
import StalledDealsCard from "@/components/StalledDealsCard";
import RecentActivityCard from "@/components/RecentActivityCard";
import ShortcutsCard from "@/components/ShortcutsCard";
import QuickMetricsCard from "@/components/QuickMetricsCard";
import ScoringDashboard from "@/components/ScoringDashboard";
import Skeleton from "@/components/Skeleton";
import { getTasks, getDeals, getContacts, seedDemo, subscribeToChanges } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

// Lazy load the list components
const DealsList = lazy(() => import("@/components/DealsList"));
const ContactsList = lazy(() => import("@/components/ContactsList"));
const CompaniesList = lazy(() => import("@/components/CompaniesList"));

export default function Dashboard() {
  const [isDemo, setIsDemo] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: getTasks,
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: getDeals,
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: getContacts,
  });

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
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["deals"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
      });

      return unsubscribe;
    }
  }, [queryClient]);

  const handleInjectDemo = async () => {
    try {
      await seedDemo();
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["quickMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["stalledDeals"] });
      queryClient.invalidateQueries({ queryKey: ["hotDeal"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
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
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    toast({
      title: "Data refreshed",
      description: "All data has been updated",
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden crm-premium" data-testid="dashboard">
      {/* Spectacular multi-layer animated background */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-600/40 via-purple-600/30 to-pink-600/40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-purple-500/20 to-pink-500/20"></div>
        
        {/* Dynamic floating orbs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse float-animation"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse float-animation" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-emerald-400/15 to-teal-400/15 rounded-full blur-2xl animate-pulse float-animation" style={{animationDelay: '4s'}}></div>
          <div className="absolute top-3/4 left-1/4 w-48 h-48 bg-gradient-to-r from-yellow-400/15 to-orange-400/15 rounded-full blur-2xl animate-pulse float-animation" style={{animationDelay: '1s'}}></div>
        </div>
        
        {/* Radial gradients for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.4),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.3),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.3),transparent_50%)]"></div>
      </div>
      <Header
        isDemo={isDemo}
        onInjectDemo={handleInjectDemo}
        onRefresh={handleRefresh}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Scoring Demo Section */}
          <ScoringDashboard />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="xl:col-span-2 space-y-6">
              <TasksCard tasks={tasks} isLoading={tasksLoading} />
              <StalledDealsCard deals={deals} isLoading={dealsLoading} />
             
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              <HotDealCard deals={deals} isLoading={dealsLoading} />
              <ShortcutsCard />
              <QuickMetricsCard
                tasks={tasks}
                deals={deals}
                isLoading={tasksLoading || dealsLoading}
              />
               <RecentActivityCard />
              
     
            </div>
          </div>
              {/* Lazy loaded lists */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <DealsList />
              </Suspense>
              
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <ContactsList />
              </Suspense>
              
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <CompaniesList />
              </Suspense>
              </div>

        </div>
      </main>
    </div>
  );
}
