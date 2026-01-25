'use client';

import { ReactNode } from 'react';
import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Circle } from 'lucide-react';

interface PlayerInfoProps {
  gameControls?: ReactNode;
}

export function PlayerInfo({ gameControls }: PlayerInfoProps) {
  const activeColor = useGameStore((state) => state.board.activeColor);
  const status = useGameStore((state) => state.status);
  const board = useGameStore((state) => state.board);
  const fullmoveNumber = Math.floor(board.fullmoveNumber);
  
  // Count pieces
  const whitePieces = board.pieces.filter((p) => p.color === 'white').length;
  const blackPieces = board.pieces.filter((p) => p.color === 'black').length;
  const quantumPieces = board.pieces.filter((p) => p.isSuperposed).length;

  return (
    <Card className="p-2 sm:p-3">
      <div className="space-y-2">
        {/* Turn Display */}
        <div className="flex items-center gap-2">
          <Circle 
            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${activeColor === 'white' ? 'fill-white stroke-border' : 'fill-foreground stroke-border'}`} 
          />
          <span className="text-xs font-semibold sm:text-sm">
            {status === 'active' ? (
              <>{activeColor === 'white' ? 'White' : 'Black'} to move</>
            ) : (
              <>Game Over</>
            )}
          </span>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] sm:text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Turn:</span>
            <span className="font-medium">{fullmoveNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantum:</span>
            <span className="font-medium">{quantumPieces}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">White:</span>
            <span className="font-medium">{whitePieces}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Black:</span>
            <span className="font-medium">{blackPieces}</span>
          </div>
        </div>
        
        {/* Game Controls */}
        {gameControls && (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1">
            {gameControls}
          </div>
        )}
      </div>
    </Card>
  );
}
