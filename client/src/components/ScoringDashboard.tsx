import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDeals, getContacts } from "@/lib/db";
import { calculateDealScore, calculateContactScore, determinePriority } from "@/lib/scoring";
import Card from "./Card";
import Skeleton from "./Skeleton";
import ScoreBadge from "./ScoreBadge";
import PriorityBadge from "./PriorityBadge";
import RiskBadge from "./RiskBadge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Users, 
  Building2,
  BarChart3,
  RefreshCw
} from "lucide-react";
import type { Deal, Contact, Priority } from "@/lib/types";

interface ScoringDashboardProps {
  className?: string;
}

export default function ScoringDashboard({ className }: ScoringDashboardProps) {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: getDeals,
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: getContacts,
  });

  const scoringData = useMemo(() => {
    if (dealsLoading || contactsLoading) return null;

    // Calcular scores para todos los deals
    const dealsWithScores = deals.map(deal => {
      const scoringResult = calculateDealScore(deal);
      return {
        ...deal,
        calculatedScore: scoringResult.score,
        calculatedPriority: scoringResult.priority,
        factors: scoringResult.factors
      };
    });

    // Calcular scores para todos los contactos
    const contactsWithScores = contacts.map(contact => {
      const scoringResult = calculateContactScore(contact, deals);
      return {
        ...contact,
        calculatedScore: scoringResult.score,
        calculatedPriority: scoringResult.priority,
        factors: scoringResult.factors
      };
    });

    // Agrupar por prioridad
    const dealsByPriority = {
      Hot: dealsWithScores.filter(d => d.calculatedPriority === 'Hot'),
      Warm: dealsWithScores.filter(d => d.calculatedPriority === 'Warm'),
      Cold: dealsWithScores.filter(d => d.calculatedPriority === 'Cold'),
    };

    const contactsByPriority = {
      Hot: contactsWithScores.filter(c => c.calculatedPriority === 'Hot'),
      Warm: contactsWithScores.filter(c => c.calculatedPriority === 'Warm'),
      Cold: contactsWithScores.filter(c => c.calculatedPriority === 'Cold'),
    };

    // Calcular métricas
    const totalDeals = dealsWithScores.length;
    const totalContacts = contactsWithScores.length;
    const avgDealScore = totalDeals > 0 ? dealsWithScores.reduce((sum, d) => sum + d.calculatedScore, 0) / totalDeals : 0;
    const avgContactScore = totalContacts > 0 ? contactsWithScores.reduce((sum, c) => sum + c.calculatedScore, 0) / totalContacts : 0;

    // Deals de alto riesgo (score bajo + inactivos)
    const highRiskDeals = dealsWithScores.filter(d => 
      d.calculatedScore < 30 || 
      (d.last_activity && new Date(d.last_activity) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
    );

    // Top performers
    const topDeals = [...dealsWithScores]
      .sort((a, b) => b.calculatedScore - a.calculatedScore)
      .slice(0, 5);

    const topContacts = [...contactsWithScores]
      .sort((a, b) => b.calculatedScore - a.calculatedScore)
      .slice(0, 5);

    return {
      dealsByPriority,
      contactsByPriority,
      totalDeals,
      totalContacts,
      avgDealScore,
      avgContactScore,
      highRiskDeals,
      topDeals,
      topContacts,
    };
  }, [deals, contacts, dealsLoading, contactsLoading]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    // Simular recálculo
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRecalculating(false);
  };

  if (dealsLoading || contactsLoading || !scoringData) {
    return (
      <Card className={className}>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const { 
    dealsByPriority, 
    contactsByPriority, 
    totalDeals, 
    totalContacts, 
    avgDealScore, 
    avgContactScore,
    highRiskDeals,
    topDeals,
    topContacts
  } = scoringData;

  return (
    <div className={className}>
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Dashboard de Scoring IA</h2>
          </div>
          <Button 
            onClick={handleRecalculate} 
            disabled={isRecalculating}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculando...' : 'Recalcular'}
          </Button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Deals Hot</p>
                <p className="text-2xl font-bold text-red-700">{dealsByPriority.Hot.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Deals Warm</p>
                <p className="text-2xl font-bold text-yellow-700">{dealsByPriority.Warm.length}</p>
              </div>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Deals Cold</p>
                <p className="text-2xl font-bold text-blue-700">{dealsByPriority.Cold.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Score Promedio</p>
                <p className="text-2xl font-bold text-green-700">{Math.round(avgDealScore)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Alertas de riesgo */}
        {highRiskDeals.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Deals de Alto Riesgo</h3>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              {highRiskDeals.length} deals requieren atención inmediata
            </p>
            <div className="flex flex-wrap gap-2">
              {highRiskDeals.slice(0, 3).map(deal => (
                <Badge key={deal.id} variant="destructive" className="text-xs">
                  {deal.title}
                </Badge>
              ))}
              {highRiskDeals.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{highRiskDeals.length - 3} más
                </Badge>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Tabs con detalles */}
      <Tabs defaultValue="deals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deals">Top Deals</TabsTrigger>
          <TabsTrigger value="contacts">Top Contactos</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="space-y-4">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Deals por Score
            </h3>
            <div className="space-y-3">
              {topDeals.map((deal, index) => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{deal.title}</p>
                      <p className="text-sm text-muted-foreground">{deal.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={deal.calculatedScore} priority={deal.calculatedPriority} />
                    <span className="text-sm font-medium">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                      }).format(deal.amount || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Contactos por Score
            </h3>
            <div className="space-y-3">
              {topContacts.map((contact, index) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={contact.calculatedScore} priority={contact.calculatedPriority} />
                    <PriorityBadge priority={contact.calculatedPriority} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-lg font-semibold mb-4">Distribución de Deals</h3>
              <div className="space-y-3">
                {Object.entries(dealsByPriority).map(([priority, deals]) => {
                  const percentage = totalDeals > 0 ? (deals.length / totalDeals) * 100 : 0;
                  return (
                    <div key={priority} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{priority}</span>
                        <span>{deals.length} deals ({Math.round(percentage)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4">Distribución de Contactos</h3>
              <div className="space-y-3">
                {Object.entries(contactsByPriority).map(([priority, contacts]) => {
                  const percentage = totalContacts > 0 ? (contacts.length / totalContacts) * 100 : 0;
                  return (
                    <div key={priority} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{priority}</span>
                        <span>{contacts.length} contactos ({Math.round(percentage)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}