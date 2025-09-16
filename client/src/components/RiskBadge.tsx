import React from 'react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente para mostrar el nivel de riesgo
 */
export default function RiskBadge({ 
  riskLevel, 
  size = 'md' 
}: RiskBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const riskConfig = {
    Alto: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '⚠️',
      label: 'Alto Riesgo'
    },
    Medio: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⚡',
      label: 'Riesgo Medio'
    },
    Bajo: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      label: 'Bajo Riesgo'
    },
  };

  const config = riskConfig[riskLevel];

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