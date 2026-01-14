'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/store/gameStore';
import { Sparkles, GitMerge } from 'lucide-react';
import { useState } from 'react';

export function QuantumControls() {
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const [splitMode, setSplitMode] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);

  // Check if selected piece can perform quantum moves
  const canSplit = selectedSquare !== null && !splitMode && !mergeMode;
  const canMerge = selectedSquare !== null && !splitMode && !mergeMode;

  const handleSplitMode = () => {
    setSplitMode(true);
    setMergeMode(false);
  };

  const handleMergeMode = () => {
    setMergeMode(true);
    setSplitMode(false);
  };

  const cancelQuantumMode = () => {
    setSplitMode(false);
    setMergeMode(false);
  };

  if (!selectedSquare) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Quantum Moves
      </h3>

      <div className="space-y-2">
        {/* Split Move */}
        <div>
          <Button
            onClick={handleSplitMode}
            disabled={!canSplit || splitMode}
            variant={splitMode ? 'default' : 'outline'}
            className="w-full"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Split Move
            {splitMode && <Badge variant="secondary" className="ml-2">Active</Badge>}
          </Button>
          {splitMode && (
            <p className="text-xs text-muted-foreground mt-1">
              Click two squares to split piece into superposition
            </p>
          )}
        </div>

        {/* Merge Move */}
        <div>
          <Button
            onClick={handleMergeMode}
            disabled={!canMerge || mergeMode}
            variant={mergeMode ? 'default' : 'outline'}
            className="w-full"
            size="sm"
          >
            <GitMerge className="h-4 w-4 mr-2" />
            Merge Move
            {mergeMode && <Badge variant="secondary" className="ml-2">Active</Badge>}
          </Button>
          {mergeMode && (
            <p className="text-xs text-muted-foreground mt-1">
              Click location to merge superposed pieces
            </p>
          )}
        </div>

        {/* Cancel Button */}
        {(splitMode || mergeMode) && (
          <Button
            onClick={cancelQuantumMode}
            variant="ghost"
            className="w-full"
            size="sm"
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}
