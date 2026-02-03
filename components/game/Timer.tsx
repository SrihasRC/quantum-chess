'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialTime: number; // Base time in seconds (from DB)
  turnStartTime: number; // Timestamp when turn started (last_move_time)
  isActive: boolean; // Is it this player's turn?
  color: 'white' | 'black';
  onTimeout?: () => void; // Called when time runs out
}

export function Timer({ initialTime, turnStartTime, isActive, color, onTimeout }: TimerProps) {
  const [displayTime, setDisplayTime] = useState(initialTime);

  useEffect(() => {
    if (!isActive) {
      setDisplayTime(initialTime);
      return;
    }

    // Calculate time left based on elapsed time since turn started
    const updateTime = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - turnStartTime) / 1000);
      const remaining = Math.max(0, initialTime - elapsed);
      
      setDisplayTime(remaining);
      
      // Check for timeout
      if (remaining === 0 && onTimeout) {
        onTimeout();
      }
    };

    // Update immediately
    updateTime();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateTime, 100);

    return () => clearInterval(interval);
  }, [isActive, initialTime, turnStartTime, onTimeout]);

  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const isLowTime = displayTime <= 30;
  const isVeryLowTime = displayTime <= 10;

  return (
    <div 
      className={`
        flex items-center gap-2 rounded-md border p-3 transition-colors
        ${isActive ? 'bg-primary/10 border-primary' : 'bg-muted border-muted-foreground/20'}
        ${isVeryLowTime && isActive ? 'animate-pulse bg-destructive/20 border-destructive' : ''}
        ${isLowTime && !isVeryLowTime && isActive ? 'bg-yellow-500/20 border-yellow-500' : ''}
      `}
    >
      <Clock className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          {color}
        </span>
        <span 
          className={`
            font-mono text-lg font-bold
            ${isVeryLowTime && isActive ? 'text-destructive' : ''}
            ${isLowTime && !isVeryLowTime && isActive ? 'text-yellow-600' : ''}
          `}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
