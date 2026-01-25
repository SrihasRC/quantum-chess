'use client';

import { cn } from '@/lib/utils';
import type { SquareIndex } from '@/lib/types';
import { getFile, getRank } from '@/lib/engine/utils';

interface SquareProps {
  index: SquareIndex;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMoveFrom?: boolean;
  isLastMoveTo?: boolean;
  isFailedCaptureFrom?: boolean;
  isFailedCaptureTo?: boolean;
  flipped?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

export function Square({
  index,
  isLight,
  isSelected,
  isLegalMove,
  isLastMoveFrom = false,
  isLastMoveTo = false,
  isFailedCaptureFrom = false,
  isFailedCaptureTo = false,
  flipped = false,
  onClick,
  children,
}: SquareProps) {
  const file = getFile(index);
  const rank = getRank(index);
  
  // Show labels on edge squares - adjust based on flip state
  const showFileLabel = flipped ? rank === 7 : rank === 0;
  const showRankLabel = flipped ? file === 7 : file === 0;

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
        // Selected state (highest priority)
        isSelected && 'ring-4 ring-primary ring-inset',
        // Last move highlighting (darker shade of square color)
        !isSelected && (isLastMoveFrom || isLastMoveTo) && 'brightness-75 opacity-90',
        // Legal move indicator
        isLegalMove && 'ring-2 ring-primary/60 ring-inset shadow-inner shadow-primary/30'
      )}
    >
      {/* Failed Capture Animation Line */}
      {isFailedCaptureFrom && isFailedCaptureTo && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 50 }}
        >
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="50%"
            stroke="black"
            strokeWidth="2"
            className="animate-pulse"
          />
        </svg>
      )}
      
      {/* Animated line from failed capture source to fallback */}
      {(isFailedCaptureFrom || isFailedCaptureTo) && (
        <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
      )}

      {/* Square Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>

      {/* Legal Move Dot */}
      {isLegalMove && !children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary/50 shadow-lg" />
        </div>
      )}
      
      {/* Legal Move Ring for capture */}
      {isLegalMove && children && (
        <div className="absolute inset-2 rounded-full ring-2 ring-primary/60" />
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
