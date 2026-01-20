'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';

export function PlayerInfo() {
  const activeColor = useGameStore((state) => state.board.activeColor);
  const status = useGameStore((state) => state.status);

  return (
    <Card className="p-2 sm:p-3">
      <div className="space-y-1.5 sm:space-y-2">
        {/* White Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Circle className="h-3 w-3 fill-white stroke-border sm:h-4 sm:w-4" />
            <span className="font-semibold text-xs sm:text-sm">White</span>
          </div>
          {activeColor === 'white' && status === 'active' && (
            <Badge variant="default" className="text-[10px] sm:text-xs">Your Turn</Badge>
          )}
        </div>

        {/* Black Player */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Circle className="h-3 w-3 fill-foreground stroke-border sm:h-4 sm:w-4" />
            <span className="font-semibold text-xs sm:text-sm">Black</span>
          </div>
          {activeColor === 'black' && status === 'active' && (
            <Badge variant="default" className="text-[10px] sm:text-xs">Your Turn</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
