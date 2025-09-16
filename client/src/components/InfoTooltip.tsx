import React from "react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Target, TrendingDown, BarChart3, Flame, Clock, Users, Zap } from "lucide-react";

interface InfoTooltipProps {
  type: "hotDeal" | "metrics" | "stalledDeals" | "tasks" | "activity" | "shortcuts";
  count?: number;
  children: React.ReactNode;
}

const tooltipContent = {
  hotDeal: {
    title: "🔥 Deal Más Caliente",
    description: "El deal con mejor puntuación basada en probabilidad × valor",
    icon: Flame,
    color: "bg-green-500",
    criteria: [
      "Calculado: Probabilidad × Importe",
      "Prioriza deals con alta probabilidad",
      "Mayor valor monetario",
      "Combinación óptima riesgo/beneficio"
    ],
    actionable: [
      "🎯 Prioridad máxima en seguimiento",
      "📞 Contactar inmediatamente",
      "📈 Acelerar proceso de cierre",
      "💰 Optimizar propuesta de valor"
    ]
  },
  metrics: {
    title: "📊 Métricas Rápidas del Pipeline",
    description: "Visión general del estado actual de tus deals",
    icon: BarChart3,
    color: "bg-blue-500",
    criteria: [
      "🔵 Abiertos: Deals activos en proceso",
      "🏆 Ganados: Deals cerrados exitosamente",
      "❌ Perdidos: Deals que no se concretaron",
      "💰 Valor abierto: Total en deals activos"
    ],
    actionable: [
      "📈 Convierte más abiertos en ganados",
      "🔍 Analiza patrones de deals perdidos",
      "💡 Optimiza proceso de ventas",
      "🎯 Aumenta tasa de conversión"
    ]
  },
  stalledDeals: {
    title: "⚠️ Deals Estancados - Requieren Atención",
    description: "Deals sin actividad reciente o con fechas vencidas",
    icon: Clock,
    color: "bg-orange-500",
    criteria: [
      "Sin próximo paso definido",
      "Fecha de cierre vencida",
      "Inactividad > 7 días",
      "Sin comunicación reciente"
    ],
    actionable: [
      "📞 Contactar inmediatamente",
      "📅 Reagendar fecha de cierre",
      "🔄 Definir próximos pasos",
      "💡 Reactivar con nueva propuesta"
    ]
  },
  tasks: {
    title: "✅ Gestión de Tareas - Tu Agenda",
    description: "Organiza y prioriza tu trabajo diario",
    icon: Target,
    color: "bg-primary",
    criteria: [
      "Tareas pendientes organizadas por fecha",
      "Prioridades: Alta, Media, Baja",
      "Estados: Pendiente, En progreso, Completada",
      "Recordatorios de vencimiento"
    ],
    actionable: [
      "⏰ Completa tareas vencidas primero",
      "🎯 Prioriza tareas de alta importancia",
      "📋 Planifica tu día eficientemente",
      "✅ Mantén tu agenda actualizada"
    ]
  },
  activity: {
    title: "📈 Actividad Reciente - Timeline",
    description: "Historial de acciones importantes en tu CRM",
    icon: TrendingUp,
    color: "bg-purple-500",
    criteria: [
      "Llamadas realizadas",
      "Deals creados/actualizados",
      "Propuestas enviadas",
      "Reuniones programadas"
    ],
    actionable: [
      "📱 Mantén comunicación constante",
      "📝 Documenta todas las interacciones",
      "🔄 Haz seguimiento sistemático",
      "📊 Analiza patrones de actividad"
    ]
  },
  shortcuts: {
    title: "⚡ Acciones Rápidas - Productividad",
    description: "Atajos para las acciones más comunes",
    icon: Zap,
    color: "bg-indigo-500",
    criteria: [
      "Crear nueva tarea rápidamente",
      "Registrar deal de oportunidad",
      "Añadir contacto al CRM",
      "Acceso directo a funciones"
    ],
    actionable: [
      "⚡ Usa atajos para mayor velocidad",
      "📝 Registra información inmediatamente",
      "🎯 No pierdas oportunidades",
      "🚀 Optimiza tu flujo de trabajo"
    ]
  }
};

export default function InfoTooltip({ type, count, children }: InfoTooltipProps) {
  const content = tooltipContent[type] || tooltipContent['metrics'];
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
        <TooltipContent side="bottom" className="max-w-sm p-4 bg-popover border shadow-lg z-50">
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
                {count} {type === 'hotDeal' ? 'deal encontrado' : type === 'metrics' ? 'total' : 'elementos'}
              </Badge>
            )}
            
            {/* Criteria */}
            <div>
              <h5 className="font-medium text-xs mb-1">📋 {type === 'metrics' ? 'Significado' : 'Criterios'}:</h5>
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
                💡 Tip: Mantén el cursor sobre elementos para más información
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
