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
      
      <main className="container mx-auto flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_350px] lg:gap-6">
          {/* Main Game Area */}
          <div className="flex items-center justify-center">
            {children}
          </div>

          {/* Side Panel - horizontal on mobile, vertical on desktop */}
          <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:space-y-0">
            <PlayerInfo />
            <GameStats />
            <div className="sm:col-span-2 lg:col-span-1">
              <MoveHistory />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
