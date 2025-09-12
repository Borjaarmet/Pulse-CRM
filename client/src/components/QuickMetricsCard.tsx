import Card from "@/components/Card";
import Metric from "@/components/Metric";
import Skeleton from "@/components/Skeleton";
import type { Task, Deal } from "@/lib/types";

interface QuickMetricsCardProps {
  tasks: Task[];
  deals: Deal[];
  isLoading: boolean;
}

export default function QuickMetricsCard({ tasks, deals, isLoading }: QuickMetricsCardProps) {
  // Calculate metrics for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isCurrentMonth = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const isThisMonth = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const metrics = {
    open: deals.filter(deal => deal.status === 'Open').length,
    won: deals.filter(deal => deal.status === 'Won').length,
    lost: deals.filter(deal => deal.status === 'Lost').length,
    activeTasks: tasks.filter(task => task.state !== 'Done').length
  };

  // Calculate monthly metrics with null safety
  const monthlyMetrics = {
    open: deals.filter(deal => 
      deal.status === 'Open' && 
      deal.updated_at && 
      isThisMonth(deal.updated_at)
    ).length,
    won: deals.filter(deal => 
      deal.status === 'Won' && 
      deal.updated_at && 
      isThisMonth(deal.updated_at)
    ).length,
    lost: deals.filter(deal => 
      deal.status === 'Lost' && 
      deal.updated_at && 
      isThisMonth(deal.updated_at)
    ).length,
    activeTasks: tasks.filter(task => 
      task.state !== 'Done' && 
      task.inserted_at && 
      isThisMonth(task.inserted_at)
    ).length
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-chart-bar text-blue-600 dark:text-blue-400"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Métricas rápidas</h2>
            <p className="text-sm text-muted-foreground">Este mes</p>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-muted/20 rounded-xl">
              <Skeleton className="h-4 w-4 mb-2" />
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Metric
            icon="fas fa-folder-open"
            value={monthlyMetrics.open}
            label="Abiertos"
            color="blue"
            change="+12%"
          />
          <Metric
            icon="fas fa-trophy"
            value={monthlyMetrics.won}
            label="Ganados"
            color="green"
            change="+8%"
          />
          <Metric
            icon="fas fa-times-circle"
            value={monthlyMetrics.lost}
            label="Perdidos"
            color="red"
            change="-2%"
          />
          <Metric
            icon="fas fa-tasks"
            value={monthlyMetrics.activeTasks}
            label="Tareas activas"
            color="purple"
            change="+5%"
          />
        </div>
      )}
    </Card>
  );
}
