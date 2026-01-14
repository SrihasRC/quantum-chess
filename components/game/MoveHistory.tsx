'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Move } from '@/lib/types';
import { indexToAlgebraic } from '@/lib/engine/utils';

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

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Move History</h3>
      <div className="max-h-75 overflow-y-auto space-y-1">
        {moveHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No moves yet</p>
        ) : (
          moveHistory.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm p-1 rounded hover:bg-accent"
            >
              <span className="font-mono text-muted-foreground min-w-6">
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
