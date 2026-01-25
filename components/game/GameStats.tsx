'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';

export function GameStats() {
  const board = useGameStore((state) => state.board);

  if (!board || !board.pieces) {
    return null;
  }

  // Count pieces by color
  const whitePieces = board.pieces.filter((p) => p.color === 'white').length;
  const blackPieces = board.pieces.filter((p) => p.color === 'black').length;
  const quantumPieces = board.pieces.filter((p) => p.isSuperposed).length;

  return (
    <Card className="p-2 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[10px] sm:gap-4 sm:text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-white border border-border" />
            <span className="font-medium">{whitePieces}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-foreground" />
            <span className="font-medium">{blackPieces}</span>
          </div>
          {quantumPieces > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">⚛</span>
              <span className="font-medium">{quantumPieces}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
