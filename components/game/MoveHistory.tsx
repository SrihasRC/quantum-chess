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

export function MoveHistory() {
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
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Move History</h3>
          {isViewingHistory && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Viewing
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={undoMove}
          disabled={!canUndo}
          className="h-7 px-2 hover:cursor-pointer hover:text-accent"
          title="Undo last move"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {/* Navigation Controls */}
      <div className="flex gap-1 mb-1">
        <Button
          variant="outline"
          size="sm"
          onClick={goToFirst}
          disabled={isAtStart}
          className="h-7 px-2 flex-1 hover:cursor-pointer hover:text-accent"
          title="Go to start"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrevious}
          disabled={isAtStart}
          className="h-7 px-2 flex-1 hover:cursor-pointer hover:text-accent"
          title="Previous move"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={isAtEnd}
          className="h-7 px-2 flex-1 hover:cursor-pointer hover:text-accent"
          title="Next move"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={goToLast}
          disabled={isAtEnd}
          className="h-7 px-2 flex-1 hover:cursor-pointer hover:text-accent"
          title="Go to latest"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <div className="h-36 overflow-y-auto space-y-0.5 flex flex-col-reverse">
        {moveHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No moves yet</p>
        ) : (
          moveHistory.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 text-xs p-1 rounded ${
                idx === currentMoveIndex ? 'bg-accent font-semibold' : 'hover:bg-accent/50'
              }`}
            >
              <span className="font-mono text-muted-foreground min-w-5">
                {idx + 1}.
              </span>
              <span className="font-mono">{formatMove(entry.move)}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
