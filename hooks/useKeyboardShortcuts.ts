'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store/gameStore';

/**
 * Keyboard shortcuts for game controls
 * - ESC: Deselect piece / cancel selection
 * - N: New game
 * - U: Undo move
 */
export function useKeyboardShortcuts() {
  const resetSelection = useGameStore((state) => state.resetSelection);
  const newGame = useGameStore((state) => state.newGame);
  const undoMove = useGameStore((state) => state.undoMove);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'Escape':
          resetSelection();
          break;
        case 'n':
        case 'N':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            newGame();
          }
          break;
        case 'u':
        case 'U':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            undoMove();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetSelection, newGame, undoMove]);
}
