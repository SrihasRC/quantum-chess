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
  const moveHistory = useGameStore((state) => state.moveHistory);
  
  // Get fullmove number - use moveHistory length if board.fullmoveNumber doesn't exist
  const fullmoveNumber = board.fullmoveNumber 
    ? Math.floor(board.fullmoveNumber) 
    : Math.floor(moveHistory.length / 2) + 1;
  
  // Count pieces - handle both piece array and board grid
  let whitePieces = 0;
  let blackPieces = 0;
  let quantumPieces = 0;

  if (Array.isArray(board.pieces)) {
    // New board structure with pieces array
    whitePieces = board.pieces.filter((p) => p.color === 'white').length;
    blackPieces = board.pieces.filter((p) => p.color === 'black').length;
    quantumPieces = board.pieces.filter((p) => p.isSuperposed).length;
  } else if (Array.isArray(board) && board.length === 8) {
    // Legacy board structure (2D array)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          if (piece === piece.toUpperCase()) {
            whitePieces++;
          } else {
            blackPieces++;
          }
        }
      }
    }
  }

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
