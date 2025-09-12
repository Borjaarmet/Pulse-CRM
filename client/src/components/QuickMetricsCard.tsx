import React from "react";
import Card from "@/components/Card";
import Metric from "@/components/Metric";
import Skeleton from "@/components/Skeleton";
import type { Task, Deal } from "@/lib/types";
import { getDealsMetrics, type DealsMetrics } from "@/lib/db";
import { useQuery } from "@tanstack/react-query";
import { isThisMonth, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface QuickMetricsCardProps {
  tasks: Task[];
  deals: Deal[];
  isLoading: boolean;
}

export default function QuickMetricsCard({ tasks, deals, isLoading }: QuickMetricsCardProps) {
  // Get real metrics from database
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["deals-metrics"],
    queryFn: getDealsMetrics,
  });

  // Calculate monthly metrics for tasks
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isCurrentMonth = (dateString: string | null) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  };

  const activeTasks = tasks.filter(task => task.state !== 'Done').length;
  const monthlyActiveTasks = tasks.filter(task => 
    task.state !== 'Done' && 
    task.inserted_at && 
    isThisMonth(task.inserted_at)
  ).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return "Sin actividad";
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: es 
    });
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
      
      {isLoading || metricsLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-muted/20 rounded-xl">
              <Skeleton className="h-4 w-4 mb-2" />
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-2 gap-4">
          <Metric
            icon="fas fa-folder-open"
            value={metrics.openDeals}
            label="Deals abiertos"
            color="blue"
            change={`${metrics.stalledDeals} estancados`}
          />
          <Metric
            icon="fas fa-trophy"
            value={metrics.wonDeals}
            label="Deals ganados"
            color="green"
            change={`${metrics.conversionRatio}% conversión`}
          />
          <Metric
            icon="fas fa-chart-line"
            value={formatCurrency(metrics.pipelineValue)}
            label="Valor pipeline"
            color="purple"
            change="Probabilidad ponderada"
          />
          <Metric
            icon="fas fa-clock"
            value={formatLastActivity(metrics.lastActivity)}
            label="Última actividad"
            color="orange"
            change="Deal más reciente"
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <i className="fas fa-exclamation-circle text-2xl mb-2"></i>
          <p>Error al cargar métricas</p>
        </div>
      )}
    </Card>
  );
}
