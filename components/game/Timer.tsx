'use client';

import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  timeRemaining: number; // in seconds
  isActive: boolean;
  color: 'white' | 'black';
  onTimeUpdate?: (elapsedSeconds: number) => void;
}

export function Timer({ timeRemaining, isActive, color, onTimeUpdate }: TimerProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const lastTimeRemainingRef = useRef(timeRemaining);
  const accumulatedSecondsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Reset when timeRemaining changes from parent (e.g., after a move or turn change)
  useEffect(() => {
    if (timeRemaining !== lastTimeRemainingRef.current) {
      setDisplayTime(timeRemaining);
      lastTimeRemainingRef.current = timeRemaining;
      accumulatedSecondsRef.current = 0;
    }
  }, [timeRemaining]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!isActive) {
      accumulatedSecondsRef.current = 0;
      return;
    }

    let lastTick = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTick;
      
      if (elapsedMs >= 1000) {
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        setDisplayTime(prev => {
          const newTime = Math.max(0, prev - elapsedSeconds);
          return newTime;
        });
        lastTick = now;
        
        // Notify parent every second
        if (onTimeUpdate && elapsedSeconds > 0) {
          onTimeUpdate(elapsedSeconds);
        }
      }
    }, 100); // Check every 100ms for smoother updates

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onTimeUpdate, displayTime]);

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
