'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';

export function PlayerInfo() {
  const activeColor = useGameStore((state) => state.board.activeColor);
  const status = useGameStore((state) => state.status);

  return (
    <Card className="p-3">
      <div className="space-y-2">
        {/* White Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 fill-white stroke-border" />
            <span className="font-semibold text-sm">White</span>
          </div>
          {activeColor === 'white' && status === 'active' && (
            <Badge variant="default" className="text-xs">Your Turn</Badge>
          )}
        </div>

        {/* Black Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 fill-foreground stroke-border" />
            <span className="font-semibold text-sm">Black</span>
          </div>
          {activeColor === 'black' && status === 'active' && (
            <Badge variant="default" className="text-xs">Your Turn</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
