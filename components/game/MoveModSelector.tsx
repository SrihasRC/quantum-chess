'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

export type MoveMode = 'classic' | 'split' | 'merge';

interface ModeSelectProps {
  mode: MoveMode;
  onModeChange: (mode: MoveMode) => void;
}

export function MoveModSelector({ mode, onModeChange }: ModeSelectProps) {
  return (
    <Card className="p-2 inline-flex gap-1">
      <Button
        variant={mode === 'classic' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('classic')}
      >
        Classic
      </Button>
      <Button
        variant={mode === 'split' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('split')}
      >
        Split
      </Button>
      <Button
        variant={mode === 'merge' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onModeChange('merge')}
      >
        Merge
      </Button>
    </Card>
  );
}
