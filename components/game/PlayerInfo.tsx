'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';

export function PlayerInfo() {
  const activeColor = useGameStore((state) => state.board.activeColor);
  const status = useGameStore((state) => state.status);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* White Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-5 w-5 fill-white stroke-border" />
            <span className="font-semibold">White</span>
          </div>
          {activeColor === 'white' && status === 'active' && (
            <Badge variant="default">Your Turn</Badge>
          )}
        </div>

        {/* Black Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-5 w-5 fill-foreground stroke-border" />
            <span className="font-semibold">Black</span>
          </div>
          {activeColor === 'black' && status === 'active' && (
            <Badge variant="default">Your Turn</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
