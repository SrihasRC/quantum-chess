'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { PlayerInfo } from '@/components/game/PlayerInfo';
import { MoveHistory } from '@/components/game/MoveHistory';

interface GameContainerProps {
  children: ReactNode;
  gameControls?: ReactNode;
}

export function GameContainer({ children, gameControls }: GameContainerProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 overflow-y-auto px-3 py-3 justify-center items-center sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="h-full flex flex-col lg:flex-row justify-center items-center lg:gap-6">
          {/* Main Game Area */}
          <div className="flex items-center justify-center">
            {children}
          </div>

          {/* Side Panel - horizontal on mobile, vertical on desktop */}
          <aside className="grid grid-cols-1 gap-3 sm:grid-cols-1 lg:grid-cols-1 lg:space-y-0">
            <PlayerInfo gameControls={gameControls} />
            <MoveHistory />
          </aside>
        </div>
      </main>
    </div>
  );
}
