'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function GameStats() {
  const board = useGameStore((state) => state.board);
  const status = useGameStore((state) => state.status);

  if (!board || !board.pieces) {
    return null;
  }

  // Count pieces by color
  const whitePieces = board.pieces.filter(
    (p) => p.color === 'white'
  ).length;

  const blackPieces = board.pieces.filter(
    (p) => p.color === 'black'
  ).length;

  // Count quantum pieces (in superposition)
  const quantumPieces = board.pieces.filter(
    (p) => p.isSuperposed
  ).length;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Game Stats</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Turn:</span>
          <Badge variant="secondary">
            {Math.floor(board.fullmoveNumber)}
          </Badge>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">White pieces:</span>
          <span className="font-medium">{whitePieces}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Black pieces:</span>
          <span className="font-medium">{blackPieces}</span>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Quantum pieces:</span>
          <Badge variant="outline">{quantumPieces}</Badge>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge
            variant={status === 'active' ? 'default' : 'destructive'}
          >
            {status}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
