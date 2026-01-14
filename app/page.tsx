'use client';

import { GameContainer } from '@/components/layout/GameContainer';
import { Chessboard } from '@/components/board/Chessboard';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { useGameStore } from '@/lib/store/gameStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function Home() {
  const status = useGameStore((state) => state.status);
  const newGame = useGameStore((state) => state.newGame);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <>
      <GameContainer>
        <Chessboard />
      </GameContainer>
      
      <GameOverModal 
        isOpen={status !== 'active'} 
        status={status} 
        onNewGame={newGame} 
      />
    </>
  );
}
