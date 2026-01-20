'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export type MoveMode = 'classic' | 'split' | 'merge';

interface ModeSelectProps {
  mode: MoveMode;
  onModeChange: (mode: MoveMode) => void;
}

export function MoveModSelector({ mode, onModeChange }: ModeSelectProps) {
  return (
    <Card className="p-1.5 inline-flex  gap-1 w-full justify-center sm:p-2 md:w-auto">
      <Button
        variant={mode === 'classic' ? 'default' : 'outline'}
        size="sm"
        className='hover:cursor-pointer hover:text-primary flex-1 text-xs sm:flex-none sm:text-sm'
        onClick={() => onModeChange('classic')}
      >
        Classic
      </Button>
      <Button
        variant={mode === 'split' ? 'default' : 'outline'}
        size="sm"
        className='hover:cursor-pointer hover:text-primary flex-1 text-xs sm:flex-none sm:text-sm'
        onClick={() => onModeChange('split')}
      >
        Split
      </Button>
      <Button
        variant={mode === 'merge' ? 'default' : 'outline'}
        size="sm"
        className='hover:cursor-pointer hover:text-primary flex-1 text-xs sm:flex-none sm:text-sm'
        onClick={() => onModeChange('merge')}
      >
        Merge
      </Button>
    </Card>
  );
}
