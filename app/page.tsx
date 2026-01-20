'use client';

import { useState } from 'react';
import { GameContainer } from '@/components/layout/GameContainer';
import { Chessboard } from '@/components/board/Chessboard';
import { MoveModSelector, type MoveMode } from '@/components/game/MoveModSelector';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { useGameStore } from '@/lib/store/gameStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function Home() {
  const status = useGameStore((state) => state.status);
  const newGame = useGameStore((state) => state.newGame);
  const [moveMode, setMoveMode] = useState<MoveMode>('classic');
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <>
      <GameContainer>
        <div className="flex w-full flex-col items-center gap-3 sm:gap-4 md:w-2xl md:flex-row md:gap-6 lg:gap-8">
          <div className="w-full shrink-0 md:w-auto">
            <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
          </div>
          <div className="w-full flex-1">
            <Chessboard mode={moveMode} />
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
