import React, { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Target,
  Sparkles,
  Brain,
  Zap,
  Calendar
} from "lucide-react";
import type { Deal, Contact } from "@/lib/types";

interface AIPredictionsProps {
  deals: Deal[];
  contacts: Contact[];
  className?: string;
}

interface Prediction {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  confidence: number;
  action?: string;
  dealId?: string;
  contactId?: string;
  icon: React.ComponentType<any>;
  timeline: string;
}

export default function AIPredictions({ deals, contacts, className }: AIPredictionsProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Generar predicciones basadas en datos reales
  const predictions = useMemo(() => {
    const preds: Prediction[] = [];

    deals.forEach(deal => {
      const now = new Date();
      const targetClose = deal.target_close_date ? new Date(deal.target_close_date) : null;
      const lastActivity = deal.last_activity ? new Date(deal.last_activity) : null;
      const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      // Predicción de éxito
      if (deal.probability && deal.probability > 75 && deal.stage === "Negociación") {
        preds.push({
          id: `success-${deal.id}`,
          type: 'success',
          title: `${deal.title} se cerrará pronto`,
          description: `Alta probabilidad (${deal.probability}%) + etapa avanzada = cierre inminente`,
          confidence: Math.min(95, deal.probability + 10),
          action: "Preparar contrato y documentación",
          dealId: deal.id,
          icon: TrendingUp,
          timeline: "Próximos 7-14 días"
        });
      }

      // Predicción de riesgo
      if (daysSinceActivity > 7 && deal.status === "Open") {
        preds.push({
          id: `risk-${deal.id}`,
          type: 'danger',
          title: `${deal.title} en riesgo de perderse`,
          description: `${daysSinceActivity} días sin actividad. Probabilidad de cierre bajando`,
          confidence: Math.min(85, daysSinceActivity * 5),
          action: "Contactar urgentemente",
          dealId: deal.id,
          icon: AlertTriangle,
          timeline: "Acción inmediata requerida"
        });
      }

      // Predicción de oportunidad
      if (deal.probability && deal.probability < 50 && deal.amount && deal.amount > 50000) {
        preds.push({
          id: `opportunity-${deal.id}`,
          type: 'warning',
          title: `${deal.title} tiene potencial inexplorado`,
          description: `Alto valor (€${deal.amount?.toLocaleString()}) pero baja probabilidad. Revisar estrategia`,
          confidence: 70,
          action: "Replantear propuesta de valor",
          dealId: deal.id,
          icon: Target,
          timeline: "Esta semana"
        });
      }

      // Predicción temporal
      if (targetClose && targetClose < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        preds.push({
          id: `timeline-${deal.id}`,
          type: 'info',
          title: `${deal.title} cierra en menos de 7 días`,
          description: `Fecha objetivo: ${targetClose.toLocaleDateString('es-ES')}. Acelerar proceso`,
          confidence: 80,
          action: "Intensificar seguimiento",
          dealId: deal.id,
          icon: Clock,
          timeline: "Próximos 7 días"
        });
      }
    });

    // Predicciones generales del pipeline
    const hotDeals = deals.filter(d => d.probability && d.probability > 75).length;
    const totalValue = deals.filter(d => d.status === "Open").reduce((sum, d) => sum + (d.amount || 0), 0);
    
    if (hotDeals > 0) {
      preds.push({
        id: 'pipeline-positive',
        type: 'success',
        title: `Pipeline saludable: ${hotDeals} deals calientes`,
        description: `${Math.round(totalValue / 1000)}k en valor total. Tendencia positiva`,
        confidence: Math.min(90, hotDeals * 15 + 40),
        action: "Mantener el ritmo",
        icon: TrendingUp,
        timeline: "Próximo mes"
      });
    }

    return preds.sort((a, b) => b.confidence - a.confidence);
  }, [deals, contacts]);

  const filteredPredictions = predictions.filter(pred => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'high') return pred.confidence >= 80;
    if (selectedFilter === 'medium') return pred.confidence >= 60 && pred.confidence < 80;
    return pred.confidence < 60;
  });

  const getTypeStyles = (type: Prediction['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <Card className={className}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">🤖 Predicciones IA</h3>
            </div>
            <Badge className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              <Sparkles className="h-3 w-3" />
              {predictions.length} insights
            </Badge>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {[
              { key: 'all', label: 'Todas', count: predictions.length },
              { key: 'high', label: 'Alta', count: predictions.filter(p => p.confidence >= 80).length },
              { key: 'medium', label: 'Media', count: predictions.filter(p => p.confidence >= 60 && p.confidence < 80).length },
              { key: 'low', label: 'Baja', count: predictions.filter(p => p.confidence < 60).length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setSelectedFilter(key as any)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedFilter === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Predictions List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredPredictions.length > 0 ? (
              filteredPredictions.map((prediction) => {
                const Icon = prediction.icon;
                return (
                  <div
                    key={prediction.id}
                    className={`p-3 rounded-lg border ${getTypeStyles(prediction.type)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-white/80`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{prediction.title}</h4>
                          <div className="flex items-center gap-1">
                            <Progress value={prediction.confidence} className="w-12 h-1" />
                            <span className="text-xs font-medium">{prediction.confidence}%</span>
                          </div>
                        </div>
                        <p className="text-xs mb-2">{prediction.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {prediction.timeline}
                            </Badge>
                            {prediction.action && (
                              <span className="text-xs font-medium">💡 {prediction.action}</span>
                            )}
                          </div>
                          {prediction.dealId && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              Ver Deal
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay predicciones para el filtro seleccionado</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 flex-1">
                <Zap className="h-4 w-4" />
                Generar más insights
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                Ver todos
              </Button>
            </div>
          </div>
        </div>
      </Card>
  );
}
