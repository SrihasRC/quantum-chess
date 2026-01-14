'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuantumPiece } from '@/lib/types';
import { indexToAlgebraic } from '@/lib/engine/utils';

interface ProbabilityOverlayProps {
  piece: QuantumPiece;
}

export function ProbabilityOverlay({ piece }: ProbabilityOverlayProps) {
  if (!piece.isSuperposed) return null;

  // Get all superposition squares
  const superpositionSquares = Object.entries(piece.superposition)
    .filter(([, prob]) => prob > 0)
    .map(([sq, prob]) => ({
      square: parseInt(sq),
      algebraic: indexToAlgebraic(parseInt(sq)),
      probability: Math.round(prob * 100),
    }))
    .sort((a, b) => b.probability - a.probability);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute inset-0 pointer-events-auto" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Quantum Superposition</p>
            <p className="text-xs text-muted-foreground">
              This piece exists in multiple locations:
            </p>
            <div className="space-y-1">
              {superpositionSquares.map(({ algebraic, probability }) => (
                <div key={algebraic} className="flex justify-between text-xs">
                  <span className="font-mono">{algebraic}</span>
                  <span className="text-muted-foreground">{probability}%</span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
