import React from "react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Target, TrendingDown, BarChart3 } from "lucide-react";

interface ScoringTooltipProps {
  type: "hot" | "warm" | "cold" | "average";
  count?: number;
  children: React.ReactNode;
}

const tooltipContent = {
  hot: {
    title: "🔥 Deals Hot - Alta Prioridad",
    description: "Deals con las mejores probabilidades de cierre",
    icon: TrendingUp,
    color: "bg-red-500",
    criteria: [
      "Score: 75-100 puntos",
      "Alta probabilidad de cierre (>70%)",
      "Actividad reciente (<3 días)",
      "Etapas avanzadas del pipeline",
      "Valor significativo del deal"
    ],
    actionable: [
      "✅ Priorizarlos en tu agenda",
      "✅ Hacer seguimiento diario",
      "✅ Preparar propuestas específicas",
      "✅ Agilizar proceso de cierre"
    ]
  },
  warm: {
    title: "🎯 Deals Warm - Oportunidades Potenciales", 
    description: "Deals que requieren nurturing y atención moderada",
    icon: Target,
    color: "bg-yellow-500",
    criteria: [
      "Score: 45-74 puntos",
      "Probabilidad moderada (40-70%)",
      "Actividad regular (3-7 días)",
      "En etapas intermedias",
      "Potencial de crecimiento"
    ],
    actionable: [
      "📞 Contactar semanalmente",
      "📧 Enviar contenido relevante",
      "🤝 Programar demos/reuniones",
      "📈 Trabajar objeciones"
    ]
  },
  cold: {
    title: "❄️ Deals Cold - Requieren Reactivación",
    description: "Deals con baja probabilidad que necesitan estrategia especial",
    icon: TrendingDown,
    color: "bg-blue-500",
    criteria: [
      "Score: 0-44 puntos",
      "Baja probabilidad (<40%)",
      "Sin actividad reciente (>7 días)",
      "Etapas tempranas o estancados",
      "Posibles objeciones sin resolver"
    ],
    actionable: [
      "🔄 Estrategia de reactivación",
      "📋 Revisar y actualizar info",
      "💡 Ofrecer nuevo valor",
      "❓ Revalidar necesidad/interés"
    ]
  },
  average: {
    title: "📊 Score Promedio del Pipeline",
    description: "Indicador general de la salud de tu pipeline",
    icon: BarChart3,
    color: "bg-green-500",
    criteria: [
      "Promedio de todos los deals activos",
      "Incluye factores ponderados:",
      "• 35% - Probabilidad de cierre",
      "• 25% - Valor monetario",
      "• 25% - Actividad reciente",
      "• 15% - Etapa y tiempo en etapa"
    ],
    actionable: [
      "📈 Score >70: Pipeline saludable",
      "⚠️ Score 40-70: Atención moderada",
      "🚨 Score <40: Requiere acción inmediata",
      "🎯 Meta: Mantener score >65"
    ]
  }
};

export default function ScoringTooltip({ type, count, children }: ScoringTooltipProps) {
  // Fallback to 'average' if type doesn't exist
  const content = tooltipContent[type] || tooltipContent['average'];
  const Icon = content.icon;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="cursor-help relative group">
            {children}
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm p-4 bg-popover border shadow-lg">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded-full ${content.color}`}>
                <Icon className="h-3 w-3 text-white" />
              </div>
              <h4 className="font-semibold text-sm">{content.title}</h4>
            </div>
            
            {/* Description */}
            <p className="text-xs text-muted-foreground">{content.description}</p>
            
            {/* Count badge if provided */}
            {count !== undefined && (
              <Badge variant="secondary" className="text-xs">
                {count} {type === 'average' ? 'puntos promedio' : 'deals encontrados'}
              </Badge>
            )}
            
            {/* Criteria */}
            <div>
              <h5 className="font-medium text-xs mb-1">📋 Criterios:</h5>
              <ul className="space-y-1">
                {content.criteria.map((criterion, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary">•</span>
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Actionable items */}
            <div>
              <h5 className="font-medium text-xs mb-1">🎯 Acciones recomendadas:</h5>
              <ul className="space-y-1">
                {content.actionable.map((action, index) => (
                  <li key={index} className="text-xs text-muted-foreground">
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-[10px] text-muted-foreground italic">
                💡 Tip: Haz hover sobre elementos para más información
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}