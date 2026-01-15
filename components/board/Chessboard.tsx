'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Square } from './Square';
import { Piece } from './Piece';
import { useGameStore } from '@/lib/store/gameStore';
import { getPieceAt } from '@/lib/engine/state';
import { indexToAlgebraic } from '@/lib/engine/utils';
import type { SquareIndex } from '@/lib/types';
import type { MoveMode } from '@/components/game/MoveModSelector';

interface ChessboardProps {
  mode: MoveMode;
}

export function Chessboard({ mode }: ChessboardProps) {
  const board = useGameStore((state) => state.board);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const selectPiece = useGameStore((state) => state.selectPiece);
  const movePiece = useGameStore((state) => state.movePiece);
  
  // Split move state
  const [splitSource, setSplitSource] = useState<SquareIndex | null>(null);
  const [splitTargets, setSplitTargets] = useState<SquareIndex[]>([]);
  
  // Merge move state
  const [mergeSources, setMergeSources] = useState<SquareIndex[]>([]);
  const [mergeTarget, setMergeTarget] = useState<SquareIndex | null>(null);

  // Determine active mode
  const splitMode = mode === 'split';
  const mergeMode = mode === 'merge';

  // Reset quantum move state when mode changes
  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      // Use setTimeout to defer state updates to avoid cascading renders
      setTimeout(() => {
        setSplitSource(null);
        setSplitTargets([]);
        setMergeSources([]);
        setMergeTarget(null);
      }, 0);
    }
  }, [mode]);

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
          // Reset split state (mode persists unless user changes it)
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
      
      // Reset merge state (mode persists unless user changes it)
      setMergeSources([]);
      setMergeTarget(null);
    }
  };

  /** Check if square is a legal move destination */
  const isLegalMoveSquare = (square: SquareIndex): boolean => {
    // In split mode, show available split targets based on legal moves
    if (splitMode && splitSource !== null) {
      const piece = getPieceAt(board, splitSource);
      if (!piece) return false;
      
      // Generate legal split moves for this piece
      const splitMoves = legalMoves.filter(m => m.type === 'split' && (m as { from: number }).from === splitSource);
      
      // If we don't have split moves calculated, show all valid move targets
      if (splitMoves.length === 0) {
        // Show legal normal move targets as potential split destinations
        const normalMoves = legalMoves.filter(m => 
          (m.type === 'normal' || m.type === 'capture') && (m as { from: number }).from === splitSource
        );
        return normalMoves.some(m => (m as { to: number }).to === square) && !splitTargets.includes(square);
      }
      
      // Check if this square is a valid split target
      return splitMoves.some(m => {
        const split = m as { to1: number; to2: number };
        return split.to1 === square || split.to2 === square;
      }) && !splitTargets.includes(square);
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
        const isLight = (rank + file) % 2 === 1;
        
        // Get piece at this square - for superposed pieces, getPieceAt might return null
        // So we also check all pieces for any probability at this square
        let piece = getPieceAt(board, index);
        let probability = 1.0;
        
        // If no certain piece, check for superposed pieces
        if (!piece) {
          for (const p of board.pieces) {
            const prob = p.superposition[index];
            if (prob && prob > 0) {
              piece = p;
              probability = prob;
              break; // Take first superposed piece at this location
            }
          }
        }
        
        const isSelected = isSquareHighlighted(index);
        const isLegalMove = isLegalMoveSquare(index);

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
                probability={probability}
              />
            )}
          </Square>
        );
      }
    }
    
    return squares;
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="aspect-square w-full overflow-hidden rounded-lg border-4 border-border shadow-xl">
        <div className="grid h-full w-full grid-cols-8 grid-rows-8">
          {renderSquares()}
        </div>
      </div>
    </div>
  );
}
