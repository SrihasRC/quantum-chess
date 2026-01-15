'use client';

import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/store/gameStore';

export function Header() {
  const newGame = useGameStore((state) => state.newGame);

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Quantum Chess</h1>
              <p className="text-xs text-muted-foreground">
                Superposition • Entanglement • Measurement
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={newGame} variant="outline" size="sm">
              New Game
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
