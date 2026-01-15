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
        <div className="flex w-full items-center gap-6">
          <div className="shrink-0">
            <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
          </div>
          <div className="flex-1">
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
