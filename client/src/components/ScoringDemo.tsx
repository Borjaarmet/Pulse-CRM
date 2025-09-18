import React, { useState, useEffect } from 'react';
import { calculateDealScore, calculateContactScore, recalculateAllScores } from '@/lib/scoring';
import Card from './Card';
import ScoreBadge from './ScoreBadge';
import PriorityBadge from './PriorityBadge';
import RiskBadge from './RiskBadge';
import ScoringTooltip from './ScoringTooltip';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, TrendingUp, Users, Target } from 'lucide-react';
import type { Deal, Contact } from '@/lib/types';
import { useDealsQuery, useContactsQuery } from '@/hooks/useCrmQueries';

/**
 * Componente de demostración del sistema de scoring
 */
export default function ScoringDemo() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState<Date | null>(null);

  const { data: dealsData, isLoading: dealsLoading } = useDealsQuery();

  const { data: contactsData, isLoading: contactsLoading } = useContactsQuery();

  const deals = dealsData ?? ([] as Deal[]);
  const contacts = contactsData ?? ([] as Contact[]);

  // Calcular scores para todos los deals y contactos
  const dealsWithScoring = deals.map(deal => {
    const scoringResult = calculateDealScore(deal);
    return {
      ...deal,
      calculatedScore: scoringResult.score,
      calculatedPriority: scoringResult.priority,
      scoringResult
    };
  });

  const contactsWithScoring = contacts.map(contact => {
    const contactDeals = deals.filter(deal => deal.contact_id === contact.id);
    const scoringResult = calculateContactScore(contact, contactDeals);
    return {
      ...contact,
      calculatedScore: scoringResult.score,
      calculatedPriority: scoringResult.priority,
      scoringResult,
      dealCount: contactDeals.length
    };
  });

  // Estadísticas de scoring
  const stats = {
    totalDeals: deals.length,
    hotDeals: dealsWithScoring.filter(d => d.calculatedPriority === 'Hot').length,
    warmDeals: dealsWithScoring.filter(d => d.calculatedPriority === 'Warm').length,
    coldDeals: dealsWithScoring.filter(d => d.calculatedPriority === 'Cold').length,
    avgScore: dealsWithScoring.length > 0 
      ? Math.round(dealsWithScoring.reduce((sum, d) => sum + d.calculatedScore, 0) / dealsWithScoring.length)
      : 0,
    highValueDeals: dealsWithScoring.filter(d => (d.amount || 0) > 50000).length,
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    // Simular recálculo
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastRecalculation(new Date());
    setIsRecalculating(false);
  };

  if (dealsLoading || contactsLoading) {
    return (
      <Card>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos de scoring...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Sistema de Scoring IA</h2>
            <p className="text-muted-foreground">
              Análisis inteligente de leads y oportunidades
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Recalculando...' : 'Recalcular'}
            </Button>
            {lastRecalculation && (
              <span className="text-xs text-muted-foreground">
                Última actualización: {lastRecalculation.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.hotDeals}</div>
            <div className="text-sm text-red-700">Deals Hot</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.warmDeals}</div>
            <div className="text-sm text-yellow-700">Deals Warm</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.coldDeals}</div>
            <div className="text-sm text-blue-700">Deals Cold</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.avgScore}</div>
            <div className="text-sm text-green-700">Score Promedio</div>
          </div>
        </div>
      </Card>

      {/* Top Deals por Score */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Top Deals por Score</h3>
        </div>
        
        <div className="space-y-3">
          {dealsWithScoring
            .sort((a, b) => b.calculatedScore - a.calculatedScore)
            .slice(0, 5)
            .map((deal, index) => {
              const tooltipType = deal.calculatedPriority === 'Hot'
                ? 'hot'
                : deal.calculatedPriority === 'Warm'
                  ? 'warm'
                  : 'cold';
              return (
              <div key={deal.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{deal.title}</div>
                    <div className="text-sm text-muted-foreground">{deal.company}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ScoringTooltip type={tooltipType}>
                    <ScoreBadge 
                      score={deal.calculatedScore} 
                      priority={deal.calculatedPriority} 
                      size="sm" 
                    />
                  </ScoringTooltip>
                  <span className="text-sm font-medium">
                    {deal.amount ? `€${deal.amount.toLocaleString()}` : 'Sin valor'}
                  </span>
                </div>
              </div>
            );
            })}
        </div>
      </Card>

      {/* Top Contactos por Score */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Top Contactos por Score</h3>
        </div>
        
        <div className="space-y-3">
          {contactsWithScoring
            .sort((a, b) => b.calculatedScore - a.calculatedScore)
            .slice(0, 5)
            .map((contact, index) => {
              const tooltipType = contact.calculatedPriority === 'Hot'
                ? 'hot'
                : contact.calculatedPriority === 'Warm'
                  ? 'warm'
                  : 'cold';
              return (
              <div key={contact.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {typeof contact.company === 'string' ? contact.company : 'Sin empresa'} • {contact.dealCount} deals
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ScoringTooltip type={tooltipType}>
                    <ScoreBadge 
                      score={contact.calculatedScore} 
                      priority={contact.calculatedPriority} 
                      size="sm" 
                    />
                  </ScoringTooltip>
                  <PriorityBadge priority={contact.calculatedPriority} size="sm" />
                </div>
              </div>
            );
            })}
        </div>
      </Card>

      {/* Análisis de Riesgo */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Análisis de Riesgo</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {dealsWithScoring.filter(d => d.risk_level === 'Alto').length}
            </div>
            <div className="text-sm text-red-700">Alto Riesgo</div>
            <div className="text-xs text-red-600 mt-1">
              Requieren atención inmediata
            </div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {dealsWithScoring.filter(d => d.risk_level === 'Medio').length}
            </div>
            <div className="text-sm text-yellow-700">Riesgo Medio</div>
            <div className="text-xs text-yellow-600 mt-1">
              Monitorear de cerca
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {dealsWithScoring.filter(d => d.risk_level === 'Bajo').length}
            </div>
            <div className="text-sm text-green-700">Bajo Riesgo</div>
            <div className="text-xs text-green-600 mt-1">
              En buen estado
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
