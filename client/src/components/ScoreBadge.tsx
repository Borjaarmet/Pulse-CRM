import React from 'react';
import { cn } from '@/lib/utils';
import type { ScoreBadgeProps } from '@/lib/types';

/**
 * Componente para mostrar el score numérico con colores según la prioridad
 */
export default function ScoreBadge({ 
  score, 
  priority, 
  size = 'md', 
  showScore = true 
}: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const priorityColors = {
    Hot: 'bg-red-100 text-red-800 border-red-200',
    Warm: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Cold: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 45) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      sizeClasses[size],
      priorityColors[priority]
    )}>
      {showScore && (
        <span className={cn('font-bold', getScoreColor(score))}>
          {score}
        </span>
      )}
      <span className="text-xs font-medium">
        {priority}
      </span>
    </div>
  );
}