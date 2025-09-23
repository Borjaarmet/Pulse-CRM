import Card from "@/components/Card";
import Metric from "@/components/Metric";
import Skeleton from "@/components/Skeleton";
import { useQuickMetricsQuery, type QuickMetrics } from "@/hooks/useCrmQueries";

interface QuickMetricsCardProps {
  tasks?: any[];
  deals?: any[];
  isLoading?: boolean;
}

export default function QuickMetricsCard({ tasks, deals, isLoading: externalLoading }: QuickMetricsCardProps) {
  const { data: metricsData, isLoading } = useQuickMetricsQuery();

  const metrics = metricsData ?? ({ open: 0, won: 0, lost: 0, sumOpen: 0 } as QuickMetrics);

  const loading = externalLoading || isLoading;

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
      
      {loading ? (
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
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-slate-500/30 to-slate-600/30 p-4 text-white shadow-lg transition-all duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Abiertos</p>
                <p className="text-2xl font-bold text-white">{metrics.open}</p>
              </div>
              <i className="fas fa-folder-open text-2xl text-white/80"></i>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-400/60 to-emerald-500/60 p-4 text-white shadow-lg transition-all duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Ganados</p>
                <p className="text-2xl font-bold text-white">{metrics.won}</p>
              </div>
              <i className="fas fa-trophy text-2xl text-white/80"></i>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-rose-500/70 to-red-600/70 p-4 text-white shadow-lg transition-all duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Perdidos</p>
                <p className="text-2xl font-bold text-white">{metrics.lost}</p>
              </div>
              <i className="fas fa-times-circle text-2xl text-white/80"></i>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-indigo-400/40 via-purple-500/40 to-indigo-600/40 p-4 text-white shadow-lg transition-all duration-300 hover:scale-[1.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Valor</p>
                <p className="text-xl font-bold text-white">€{Math.round(metrics.sumOpen / 1000)}k</p>
              </div>
              <i className="fas fa-euro-sign text-2xl text-white/80"></i>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
