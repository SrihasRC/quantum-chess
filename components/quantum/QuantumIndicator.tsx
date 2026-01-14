'use client';

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface QuantumIndicatorProps {
  probability: number;
  showIcon?: boolean;
}

export function QuantumIndicator({ probability, showIcon = true }: QuantumIndicatorProps) {
  // Only show for pieces in superposition (< 100%)
  if (probability >= 1.0) return null;

  const percentage = Math.round(probability * 100);

  return (
    <Badge 
      variant="secondary" 
      className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 flex items-center gap-0.5 bg-primary/90 text-primary-foreground"
    >
      {showIcon && <Sparkles className="h-3 w-3" />}
      {percentage}%
    </Badge>
  );
}
