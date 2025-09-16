import Card from "./Card";
import Skeleton from "./Skeleton";
import AIEmailGenerator from "./AIEmailGenerator";
import { getHotDeal } from "@/lib/db";
import { Button } from "./ui/button";
import { Mail, ExternalLink } from "lucide-react";
import type { Deal } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface HotDealCardProps {
  deals?: Deal[];
  isLoading?: boolean;
}

export default function HotDealCard({ deals, isLoading: externalLoading }: HotDealCardProps) {
  const { data: hotDeals = [], isLoading } = useQuery({
    queryKey: ["hotDeal"],
    queryFn: getHotDeal,
  });

  const hotDeal = hotDeals.length > 0 ? hotDeals[0] : null;
  const loading = externalLoading || isLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <i className="fas fa-fire text-green-600 dark:text-green-400"></i>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Deal más caliente</h2>
            <p className="text-sm text-muted-foreground">Mayor probabilidad × importe</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
          <Skeleton className="h-6 w-3/4 mb-2 bg-white/20" />
          <Skeleton className="h-4 w-1/2 mb-4 bg-white/20" />
          <Skeleton className="h-8 w-1/3 bg-white/20" />
        </div>
      ) : hotDeal ? (
        <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white" data-testid="hot-deal-card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-white">{hotDeal.title}</h3>
              <p className="text-green-100 text-sm mt-1">{hotDeal.company}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(hotDeal.amount || 0)}
              </p>
              <p className="text-green-100 text-sm">
                {hotDeal.probability || 50}% probabilidad
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
                {hotDeal.stage}
              </span>
              {hotDeal.target_close_date && (
                <span className="text-green-100 text-xs">
                  Cierre: {formatDate(hotDeal.target_close_date)}
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-green-100 text-sm">Score calculado</span>
              <span className="text-white font-bold">
                {formatCurrency((hotDeal.probability || 0) * (hotDeal.amount || 0))}
              </span>
            </div>
            
            {/* AI Actions */}
            <div className="flex gap-2">
              <AIEmailGenerator 
                deal={hotDeal}
                trigger={
                  <Button size="sm" variant="secondary" className="gap-2 flex-1 bg-white/20 text-white hover:bg-white/30">
                    <Mail className="h-4 w-4" />
                    Email con IA
                  </Button>
                }
              />
              <Button size="sm" variant="ghost" className="gap-2 text-green-100 hover:bg-white/20">
                <ExternalLink className="h-4 w-4" />
                Ver Deal
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-muted rounded-xl text-center">
          <i className="fas fa-handshake text-2xl text-muted-foreground mb-2"></i>
          <p className="text-muted-foreground">No deals available</p>
        </div>
      )}
    </Card>
  );
}
