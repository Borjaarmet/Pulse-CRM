import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { ScoringResult } from '@/lib/types';

interface ScoringTooltipProps {
  children: React.ReactNode;
  scoringResult: ScoringResult;
}

/**
 * Tooltip que muestra detalles del scoring y factores
 */
export default function ScoringTooltip({ children, scoringResult }: ScoringTooltipProps) {
  const { score, priority, factors, reasoning } = scoringResult;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Score: {score}</span>
              <Badge variant={priority === 'Hot' ? 'destructive' : priority === 'Warm' ? 'secondary' : 'outline'}>
                {priority}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Factores de Scoring:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Probabilidad:</span>
                  <span className="font-medium">{Math.round(factors.probability)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <span className="font-medium">{Math.round(factors.amount)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Actividad:</span>
                  <span className="font-medium">{Math.round(factors.activity)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Etapa:</span>
                  <span className="font-medium">{Math.round(factors.stage)}%</span>
                </div>
              </div>
            </div>

            {reasoning.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-muted-foreground">Análisis:</h4>
                <ul className="text-xs space-y-1">
                  {reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-muted-foreground">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}