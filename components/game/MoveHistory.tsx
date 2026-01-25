'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Move } from '@/lib/types';
import { indexToAlgebraic } from '@/lib/engine/utils';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Undo2, Eye } from 'lucide-react';

function formatMove(move: Move): string {
  if (move.type === 'split') {
    const from = indexToAlgebraic(move.from);
    const to1 = indexToAlgebraic(move.to1);
    const to2 = indexToAlgebraic(move.to2);
    return `${from}⇝${to1}|${to2}`;
  }

  if (move.type === 'merge') {
    const from1 = indexToAlgebraic(move.from1);
    const from2 = indexToAlgebraic(move.from2);
    const to = indexToAlgebraic(move.to);
    return `${from1}+${from2}⇝${to}`;
  }

  if (move.type === 'castling') {
    return move.side === 'kingside' ? 'O-O' : 'O-O-O';
  }

  // Normal, capture, en-passant, promotion
  const from = indexToAlgebraic(move.from);
  const to = indexToAlgebraic(move.to);
  return `${from}-${to}`;
}

export function MoveHistory({ isMultiplayer = false }: { isMultiplayer?: boolean }) {
  const moveHistory = useGameStore((state) => state.moveHistory);
  const currentMoveIndex = useGameStore((state) => state.currentMoveIndex);
  const undoMove = useGameStore((state) => state.undoMove);
  const goToFirst = useGameStore((state) => state.goToFirst);
  const goToPrevious = useGameStore((state) => state.goToPrevious);
  const goToNext = useGameStore((state) => state.goToNext);
  const goToLast = useGameStore((state) => state.goToLast);
  
  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex === moveHistory.length - 1;
  const canUndo = moveHistory.length > 0 && isAtEnd;
  const isViewingHistory = !isAtEnd && moveHistory.length > 0;

  return (
    <Card className="p-2 sm:p-3">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <h3 className="font-semibold text-xs sm:text-sm">Moves</h3>
          {isViewingHistory && (
            <Badge variant="secondary" className="text-[10px] flex items-center gap-0.5 px-1 sm:text-xs sm:px-1.5">
              <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </Badge>
          )}
        </div>
        {!isMultiplayer && (
          <Button
            variant="outline"
            size="sm"
            onClick={undoMove}
            disabled={!canUndo}
            className="h-6 px-1.5 hover:cursor-pointer hover:text-accent sm:h-7 sm:px-2"
            title="Undo last move"
          >
            <Undo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        )}
      </div>
      
      {/* Navigation Controls - Hidden in multiplayer since we don't have board state history */}
      {!isMultiplayer && (
        <div className="flex gap-0.5 mb-1 sm:mb-1.5 sm:gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={goToFirst}
            disabled={isAtStart}
            className="h-6 px-1 flex-1 hover:cursor-pointer hover:text-accent sm:h-7 sm:px-1.5"
            title="Go to start"
          >
            <ChevronsLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            disabled={isAtStart}
            className="h-6 px-1 flex-1 hover:cursor-pointer hover:text-accent sm:h-7 sm:px-1.5"
            title="Previous move"
          >
            <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={isAtEnd}
            className="h-6 px-1 flex-1 hover:cursor-pointer hover:text-accent sm:h-7 sm:px-1.5"
            title="Next move"
          >
            <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToLast}
            disabled={isAtEnd}
            className="h-6 px-1 flex-1 hover:cursor-pointer hover:text-accent sm:h-7 sm:px-1.5"
            title="Go to latest"
          >
            <ChevronsRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        </div>
      )}
      
      <div className="h-20 overflow-y-scroll scroll-hidden space-y-0.5 flex flex-col sm:h-28 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {moveHistory.length === 0 ? (
          <p className="text-[10px] text-muted-foreground sm:text-xs">No moves yet</p>
        ) : (
          [...moveHistory].reverse().map((entry, reverseIdx) => {
            const idx = moveHistory.length - 1 - reverseIdx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-1 text-[10px] p-0.5 rounded sm:gap-1.5 sm:text-xs ${
                  idx === currentMoveIndex ? 'bg-accent font-semibold' : 'hover:bg-accent/50'
                }`}
              >
                <span className="font-mono text-muted-foreground min-w-3 sm:min-w-4">
                  {idx + 1}.
                </span>
                <span className="font-mono">{formatMove(entry.move)}</span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
