'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Square } from './Square';
import { Piece } from './Piece';
import { useGameStore } from '@/lib/store/gameStore';
import { getPieceAt, getPieceById } from '@/lib/engine/state';
import { indexToAlgebraic } from '@/lib/engine/utils';
import type { SquareIndex } from '@/lib/types';

// Custom event for quantum mode activation
export const QUANTUM_MODE_EVENT = 'quantum-mode-change';

export function Chessboard() {
  const board = useGameStore((state) => state.board);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const selectPiece = useGameStore((state) => state.selectPiece);
  const movePiece = useGameStore((state) => state.movePiece);
  
  // Split move state
  const [splitMode, setSplitMode] = useState(false);
  const [splitSource, setSplitSource] = useState<SquareIndex | null>(null);
  const [splitTargets, setSplitTargets] = useState<SquareIndex[]>([]);
  
  // Merge move state
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSources, setMergeSources] = useState<SquareIndex[]>([]);
  const [mergeTarget, setMergeTarget] = useState<SquareIndex | null>(null);

  /** Enable split move mode (called from QuantumControls) */
  const enableSplitMode = useCallback(() => {
    setSplitMode(true);
    setMergeMode(false);
    setSplitSource(null);
    setSplitTargets([]);
  }, []);

  /** Enable merge move mode (called from QuantumControls) */
  const enableMergeMode = useCallback(() => {
    setMergeMode(true);
    setSplitMode(false);
    setMergeSources([]);
    setMergeTarget(null);
  }, []);

  /** Cancel quantum move mode */
  const cancelQuantumMode = useCallback(() => {
    setSplitMode(false);
    setMergeMode(false);
    setSplitSource(null);
    setSplitTargets([]);
    setMergeSources([]);
    setMergeTarget(null);
  }, []);

  // Listen for quantum mode events from QuantumControls
  useEffect(() => {
    const handleQuantumMode = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode: 'split' | 'merge' | 'cancel' }>;
      const { mode } = customEvent.detail;
      
      if (mode === 'split') {
        enableSplitMode();
      } else if (mode === 'merge') {
        enableMergeMode();
      } else if (mode === 'cancel') {
        cancelQuantumMode();
      }
    };

    window.addEventListener(QUANTUM_MODE_EVENT, handleQuantumMode);
    return () => window.removeEventListener(QUANTUM_MODE_EVENT, handleQuantumMode);
  }, [cancelQuantumMode, enableMergeMode, enableSplitMode]);

  // Listen for ESC key to cancel quantum mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (splitMode || mergeMode)) {
        cancelQuantumMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [splitMode, mergeMode, cancelQuantumMode]);

  /** Handle square click with support for split/merge modes */
  const handleSquareClick = (square: SquareIndex) => {
    if (splitMode) {
      handleSplitModeClick(square);
    } else if (mergeMode) {
      handleMergeModeClick(square);
    } else {
      selectPiece(square);
    }
  };

  /** Handle click during split move selection */
  const handleSplitModeClick = (square: SquareIndex) => {
    if (!splitSource) {
      // First click: select source
      const piece = getPieceAt(board, square);
      if (piece && piece.color === board.activeColor) {
        setSplitSource(square);
      }
    } else if (splitTargets.length < 2) {
      // Second and third clicks: select targets
      if (square !== splitSource && !splitTargets.includes(square)) {
        const newTargets = [...splitTargets, square];
        setSplitTargets(newTargets);
        
        // Execute split move if we have both targets
        if (newTargets.length === 2) {
          const piece = getPieceAt(board, splitSource);
          if (piece) {
            movePiece({
              type: 'split',
              pieceId: piece.id,
              from: splitSource,
              to1: newTargets[0],
              to2: newTargets[1],
            });
            
            // Show toast notification
            toast.success('Split Move', {
              description: `Piece split into superposition: ${indexToAlgebraic(newTargets[0])} and ${indexToAlgebraic(newTargets[1])}`,
            });
          }
          // Reset split mode
          setSplitMode(false);
          setSplitSource(null);
          setSplitTargets([]);
        }
      }
    }
  };

  /** Handle click during merge move selection */
  const handleMergeModeClick = (square: SquareIndex) => {
    if (mergeSources.length < 2) {
      // First two clicks: select source squares
      const piece = getPieceAt(board, square);
      if (piece && piece.color === board.activeColor && !mergeSources.includes(square)) {
        setMergeSources([...mergeSources, square]);
      }
    } else if (!mergeTarget) {
      // Third click: select target
      setMergeTarget(square);
      
      // Execute merge move
      const piece1 = getPieceAt(board, mergeSources[0]);
      const piece2 = getPieceAt(board, mergeSources[1]);
      
      // Check if both pieces are the same piece in superposition
      if (piece1 && piece2 && piece1.id === piece2.id) {
        movePiece({
          type: 'merge',
          pieceId: piece1.id,
          from1: mergeSources[0],
          from2: mergeSources[1],
          to: square,
        });
        
        // Show toast notification
        toast.success('Merge Move', {
          description: `Superposition merged from ${indexToAlgebraic(mergeSources[0])} and ${indexToAlgebraic(mergeSources[1])} to ${indexToAlgebraic(square)}`,
        });
      }
      
      // Reset merge mode
      setMergeMode(false);
      setMergeSources([]);
      setMergeTarget(null);
    }
  };

  /** Check if square is a legal move destination */
  const isLegalMoveSquare = (square: SquareIndex): boolean => {
    // In split mode, show available targets
    if (splitMode && splitSource !== null) {
      return square !== splitSource && !splitTargets.includes(square);
    }
    
    // In merge mode, highlight mergeable pieces or target
    if (mergeMode) {
      if (mergeSources.length < 2) {
        const piece = getPieceAt(board, square);
        return piece !== null && piece.color === board.activeColor && piece.isSuperposed;
      }
      return true; // Any square can be merge target
    }
    
    // Normal mode: check legal moves
    return legalMoves.some((move) => {
      if (move.type === 'normal' || move.type === 'capture') {
        return move.to === square;
      }
      return false;
    });
  };

  /** Check if square should be highlighted */
  const isSquareHighlighted = (square: SquareIndex): boolean => {
    if (splitMode && (square === splitSource || splitTargets.includes(square))) {
      return true;
    }
    if (mergeMode && (mergeSources.includes(square) || square === mergeTarget)) {
      return true;
    }
    return selectedSquare === square;
  };

  /** Render all 64 squares (rank 7 to 0, file 0 to 7) */
  const renderSquares = () => {
    const squares = [];
    
    // Render from rank 7 (8th rank) down to rank 0 (1st rank)
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const index = rank * 8 + file;
        const isLight = (rank + file) % 2 === 0;
        const piece = getPieceAt(board, index);
        const isSelected = isSquareHighlighted(index);
        const isLegalMove = isLegalMoveSquare(index);

        // Get full quantum piece data for probability overlay
        const quantumPiece = piece ? getPieceById(board, piece.id) : undefined;

        squares.push(
          <Square
            key={index}
            index={index}
            isLight={isLight}
            isSelected={isSelected}
            isLegalMove={isLegalMove}
            onClick={() => handleSquareClick(index)}
          >
            {piece && (
              <Piece
                type={piece.type}
                color={piece.color}
                probability={piece.superposition[index] || 1.0}
                quantumPiece={quantumPiece || undefined}
              />
            )}
          </Square>
        );
      }
    }
    
    return squares;
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Mode indicator */}
      {(splitMode || mergeMode) && (
        <div className="mb-4 rounded-lg border-2 border-primary bg-primary/10 p-3 text-center">
          <p className="font-semibold text-primary">
            {splitMode && `Split Mode: ${splitSource ? `Select ${2 - splitTargets.length} target square(s)` : 'Select piece to split'}`}
            {mergeMode && `Merge Mode: ${mergeSources.length < 2 ? `Select ${2 - mergeSources.length} superposed piece(s)` : 'Select target square'}`}
          </p>
          <button
            onClick={cancelQuantumMode}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel (ESC)
          </button>
        </div>
      )}
      
      <div className="aspect-square w-full overflow-hidden rounded-lg border-4 border-border shadow-xl">
        <div className="grid h-full w-full grid-cols-8 grid-rows-8">
          {renderSquares()}
        </div>
      </div>
    </div>
  );
}
