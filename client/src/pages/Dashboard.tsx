import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import TasksCard from "@/components/TasksCard";
import HotDealCard from "@/components/HotDealCard";
import StalledDealsCard from "@/components/StalledDealsCard";
import RecentActivityCard from "@/components/RecentActivityCard";
import ShortcutsCard from "@/components/ShortcutsCard";
import QuickMetricsCard from "@/components/QuickMetricsCard";
import { getTasks, getDeals, getContacts, seedDemo, subscribeToChanges } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
    <div className="min-h-screen bg-background" data-testid="dashboard">
      <Header
        isDemo={isDemo}
        onInjectDemo={handleInjectDemo}
        onRefresh={handleRefresh}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="xl:col-span-2 space-y-6">
            <TasksCard tasks={tasks} isLoading={tasksLoading} />
            <StalledDealsCard deals={deals} isLoading={dealsLoading} />
            <RecentActivityCard />
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
          </div>
        </div>
      </main>
    </div>
  );
}
