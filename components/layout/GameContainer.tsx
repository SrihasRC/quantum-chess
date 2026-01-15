'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { PlayerInfo } from '@/components/game/PlayerInfo';
import { MoveHistory } from '@/components/game/MoveHistory';
import { GameStats } from '@/components/game/GameStats';

interface GameContainerProps {
  children: ReactNode;
}

export function GameContainer({ children }: GameContainerProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="container mx-auto flex-1 px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_350px]">
          {/* Main Game Area */}
          <div className="flex items-center justify-center">
            {children}
          </div>

          {/* Side Panel */}
          <aside className="space-y-3">
            <PlayerInfo />
            <GameStats />
            <MoveHistory />
          </aside>
        </div>
      </main>
    </div>
  );
}
