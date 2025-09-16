import React from 'react';
import { cn } from '@/lib/utils';
import type { PriorityBadgeProps } from '@/lib/types';

/**
 * Componente para mostrar solo la prioridad con iconos y colores
 */
export default function PriorityBadge({ 
  priority, 
  size = 'md' 
}: PriorityBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const priorityConfig = {
    Hot: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '🔥',
      label: 'Hot'
    },
    Warm: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '🌡️',
      label: 'Warm'
    },
    Cold: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '❄️',
      label: 'Cold'
    },
  };

  const config = priorityConfig[priority];

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      sizeClasses[size],
      config.color
    )}>
      <span className="text-sm">{config.icon}</span>
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}