import Card from "./Card";
import Skeleton from "./Skeleton";
import { getStalledDeals } from "@/lib/db";
import type { Deal } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface StalledDealsCardProps {
  deals?: Deal[];
  isLoading?: boolean;
}

export default function StalledDealsCard({ deals, isLoading: externalLoading }: StalledDealsCardProps) {
  const { data: stalledDeals = [], isLoading } = useQuery({
    queryKey: ["stalledDeals"],
    queryFn: getStalledDeals,
  });

  const loading = externalLoading || isLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysOverdue = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-orange-600 dark:text-orange-400"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Deals estancados</h2>
            <p className="text-sm text-muted-foreground">Requieren atención inmediata</p>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 rounded-md">
            {stalledDeals.length} deals
          </span>
        )}
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : stalledDeals.length > 0 ? (
        <div className="space-y-4">
          {stalledDeals.map((deal) => {
            // Handle inactivity field from deals_stalled_v1 view
            const inactivity = (deal as any).inactivity || 0;
            
            return (
              <div 
                key={deal.id} 
                className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl"
                data-testid={`stalled-deal-${deal.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-card-foreground">{deal.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{deal.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-card-foreground">
                      {formatCurrency(deal.amount || 0)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {deal.probability || 50}% prob.
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="px-2 py-1 text-xs font-medium bg-orange-200 text-orange-800 dark:bg-orange-800/30 dark:text-orange-300 rounded">
                      {deal.stage}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {deal.next_step || "Sin próximo paso"}
                    </span>
                  </div>
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {inactivity} días inactivo
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <i className="fas fa-check-circle text-2xl mb-2"></i>
          <p>No stalled deals found. Great job!</p>
        </div>
      )}
    </Card>
  );
}
