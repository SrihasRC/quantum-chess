'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { PlayerInfo } from '@/components/game/PlayerInfo';
import { MoveHistory } from '@/components/game/MoveHistory';

interface GameContainerProps {
  children: ReactNode;
  gameControls?: ReactNode;
  isMultiplayer?: boolean;
}

export function GameContainer({ children, gameControls, isMultiplayer = false }: GameContainerProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 flex overflow-y-auto items-center justify-center px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-3 lg:gap-6">
          {/* Main Game Area */}
          <div className="flex items-center justify-center w-auto">
            {children}
          </div>

          {/* Side Panel - horizontal on mobile, vertical on desktop */}
          <aside className="grid grid-cols-2 gap-3 lg:grid-cols-1 w-sm lg:w-87.5">
            <PlayerInfo gameControls={gameControls} />
            <div className="sm:col-span-2 lg:col-span-1">
              <MoveHistory isMultiplayer={isMultiplayer} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
