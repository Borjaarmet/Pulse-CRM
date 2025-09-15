import Card from "@/components/Card";
import Metric from "@/components/Metric";
import Skeleton from "@/components/Skeleton";
import { getQuickMetrics } from "@/lib/db";
import { useEffect, useState } from "react";

interface QuickMetricsCardProps {
  isLoading?: boolean;
}

interface QuickMetrics {
  open: number;
  won: number;
  lost: number;
  sumOpen: number;
}

export default function QuickMetricsCard({ isLoading: externalLoading }: QuickMetricsCardProps) {
  const [metrics, setMetrics] = useState<QuickMetrics>({ open: 0, won: 0, lost: 0, sumOpen: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await getQuickMetrics();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching quick metrics:", error);
        setMetrics({ open: 0, won: 0, lost: 0, sumOpen: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

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
        <div className="grid grid-cols-2 gap-4">
          <Metric
            icon="fas fa-folder-open"
            value={metrics.open}
            label="Abiertos"
            color="blue"
            change="+12%"
          />
          <Metric
            icon="fas fa-trophy"
            value={metrics.won}
            label="Ganados"
            color="green"
            change="+8%"
          />
          <Metric
            icon="fas fa-times-circle"
            value={metrics.lost}
            label="Perdidos"
            color="red"
            change="-2%"
          />
          <Metric
            icon="fas fa-euro-sign"
            value={new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
            }).format(metrics.sumOpen)}
            label="Valor abierto"
            color="purple"
            change="+5%"
          />
        </div>
      )}
    </Card>
  );
}
