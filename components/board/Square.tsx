'use client';

import { cn } from '@/lib/utils';
import type { SquareIndex } from '@/lib/types';
import { getFile, getRank } from '@/lib/engine/utils';

interface SquareProps {
  index: SquareIndex;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

export function Square({
  index,
  isLight,
  isSelected,
  isLegalMove,
  onClick,
  children,
}: SquareProps) {
  const file = getFile(index);
  const rank = getRank(index);
  
  // Show labels on edge squares
  const showFileLabel = rank === 0;
  const showRankLabel = file === 0;

  return (
    <div
      data-square={index}
      onClick={onClick}
      className={cn(
        'relative aspect-square cursor-pointer transition-colors',
        // Base colors
        isLight ? 'bg-secondary' : 'bg-secondary/60',
        // Hover effect
        'hover:brightness-95',
        // Selected state
        isSelected && 'ring-4 ring-primary ring-inset',
        // Legal move indicator
        isLegalMove && 'ring-2 ring-primary/50 ring-inset'
      )}
    >
      {/* Square Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>

      {/* Legal Move Dot */}
      {isLegalMove && !children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-primary/40" />
        </div>
      )}

      {/* Coordinate Labels */}
      {showFileLabel && (
        <div className="absolute bottom-1 right-1 text-xs font-medium opacity-50">
          {String.fromCharCode(97 + file)}
        </div>
      )}
      {showRankLabel && (
        <div className="absolute left-1 top-1 text-xs font-medium opacity-50">
          {rank + 1}
        </div>
      )}
    </div>
  );
}
