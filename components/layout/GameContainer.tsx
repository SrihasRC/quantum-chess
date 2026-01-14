'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { PlayerInfo } from '@/components/game/PlayerInfo';
import { CapturedPieces } from '@/components/game/CapturedPieces';
import { MoveHistory } from '@/components/game/MoveHistory';
import { GameStats } from '@/components/game/GameStats';

interface GameContainerProps {
  children: ReactNode;
}

export function GameContainer({ children }: GameContainerProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Main Game Area */}
          <div className="flex items-center justify-center">
            {children}
          </div>

          {/* Side Panel */}
          <aside className="space-y-4">
            <PlayerInfo />
            <GameStats />
            <MoveHistory />
            <CapturedPieces />
          </aside>
        </div>
      </main>
    </div>
  );
}
