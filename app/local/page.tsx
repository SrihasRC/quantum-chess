'use client';

import { useState, useEffect } from 'react';
import { GameContainer } from '@/components/layout/GameContainer';
import { Chessboard } from '@/components/board/Chessboard';
import { MoveModSelector, type MoveMode } from '@/components/game/MoveModSelector';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { Button } from '@/components/ui/button';
import { FlipVertical } from 'lucide-react';
import { useGameStore } from '@/lib/store/gameStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function LocalGame() {
  const status = useGameStore((state) => state.status);
  const newGame = useGameStore((state) => state.newGame);
  const resetSelection = useGameStore((state) => state.resetSelection);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const [moveMode, setMoveMode] = useState<MoveMode>('classic');
  const [flipped, setFlipped] = useState(false);
  const [lastMoveCount, setLastMoveCount] = useState(0);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Reset selection when move mode changes
  useEffect(() => {
    resetSelection();
  }, [moveMode, resetSelection]);

  // Reset mode to classic after each move
  useEffect(() => {
    if (moveHistory.length > lastMoveCount) {
      setMoveMode('classic');
      setLastMoveCount(moveHistory.length);
    }
  }, [moveHistory.length, lastMoveCount]);

  return (
    <>
      <GameContainer 
        gameControls={
          <>
            <Button 
              onClick={newGame} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              New Game
            </Button>
            <Button 
              onClick={() => setFlipped(!flipped)} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              <FlipVertical className="mr-2 h-4 w-4" />
              Flip
            </Button>
          </>
        }
      >
        <div className="flex w-full flex-col items-center justify-center gap-3 sm:gap-4 md:flex-row md:gap-6 lg:gap-8">
          <div className="w-full shrink-0 md:w-auto">
            <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
          </div>
          <div className="w-auto">
            <Chessboard mode={moveMode} flipped={flipped} />
          </div>
        </div>
      </GameContainer>
      
      <GameOverModal 
        isOpen={status !== 'active'} 
        status={status} 
        onNewGame={newGame} 
      />
    </>
  );
}
