'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Square } from './Square';
import { Piece } from './Piece';
import PromotionDialog from './PromotionDialog';
import { useGameStore } from '@/lib/store/gameStore';
import { getPieceAt, getPiecesAtSquare } from '@/lib/engine/state';
import { validateMove } from '@/lib/engine/moves';
import { indexToAlgebraic } from '@/lib/engine/utils';
import { initSounds } from '@/lib/utils/sounds';
import type { SquareIndex } from '@/lib/types';
import type { MoveMode } from '@/components/game/MoveModSelector';

interface ChessboardProps {
  mode: MoveMode;
  flipped?: boolean;
}

export function Chessboard({ mode, flipped = false }: ChessboardProps) {
  const board = useGameStore((state) => state.board);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const currentMoveIndex = useGameStore((state) => state.currentMoveIndex);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const promotionPending = useGameStore((state) => state.promotionPending);
  const sandboxMode = useGameStore((state) => state.sandboxMode);
  const lastMove = useGameStore((state) => state.lastMove);
  const failedCaptureAnimation = useGameStore((state) => state.failedCaptureAnimation);
  const selectPiece = useGameStore((state) => state.selectPiece);
  const movePiece = useGameStore((state) => state.movePiece);
  const selectPromotionPiece = useGameStore((state) => state.selectPromotionPiece);
  const cancelPromotion = useGameStore((state) => state.cancelPromotion);
  
  // Initialize sounds once
  useEffect(() => {
    initSounds();
  }, []);
  
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
    // Prevent interaction when viewing history
    if (currentMoveIndex < moveHistory.length - 1) {
      toast.info('Viewing history', {
        description: 'Navigate to the latest move to continue playing',
      });
      return;
    }
    
    if (!splitSource) {
      // First click: select source (allow both classical and superposed pieces)
      let piece = getPieceAt(board, square);
      
      // If no classical piece, check for superposed pieces
      if (!piece) {
        const superposedPieces = getPiecesAtSquare(board, square);
        // In sandbox mode, allow any piece; in normal mode, filter by active color
        const relevantPieces = sandboxMode
          ? superposedPieces
          : superposedPieces.filter(p => p.color === board.activeColor);
        
        if (relevantPieces.length > 0) {
          piece = relevantPieces[0];
        }
      }
      
      // In sandbox mode, allow selecting any piece; in normal mode, only current player's pieces
      if (piece && (sandboxMode || piece.color === board.activeColor)) {
        setSplitSource(square);
        // Also select the piece to generate legal moves for highlighting
        selectPiece(square);
      }
    } else if (splitTargets.length < 2) {
      // Second and third clicks: select targets
      // Check if clicked square has a piece - if so, switch selection to that piece
      let pieceAtSquare = getPieceAt(board, square);
      
      if (!pieceAtSquare) {
        const superposedPieces = getPiecesAtSquare(board, square);
        const relevantPieces = sandboxMode
          ? superposedPieces
          : superposedPieces.filter(p => p.color === board.activeColor);
        
        if (relevantPieces.length > 0) {
          pieceAtSquare = relevantPieces[0];
        }
      }
      
      // If there's a piece and it belongs to the player, switch selection to it
      if (pieceAtSquare && (sandboxMode || pieceAtSquare.color === board.activeColor)) {
        // Reset split state and select the new piece
        setSplitSource(square);
        setSplitTargets([]);
        selectPiece(square);
        return;
      }
      
      // No piece at this square, treat it as a target for split move
      if (square !== splitSource && !splitTargets.includes(square)) {
        const newTargets = [...splitTargets, square];
        setSplitTargets(newTargets);
        
        // Execute split move if we have both targets
        if (newTargets.length === 2) {
          // Get piece at split source (could be classical or superposed)
          let piece = getPieceAt(board, splitSource);
          
          if (!piece) {
            const superposedPieces = getPiecesAtSquare(board, splitSource);
            // In sandbox mode, allow any piece; in normal mode, filter by active color
            const relevantPieces = sandboxMode
              ? superposedPieces
              : superposedPieces.filter(p => p.color === board.activeColor);
            
            if (relevantPieces.length > 0) {
              piece = relevantPieces[0];
            }
          }
          
          if (piece) {
            const splitMove = {
              type: 'split' as const,
              pieceId: piece.id,
              from: splitSource,
              to1: newTargets[0],
              to2: newTargets[1],
            };
            
            // Validate the move before executing (pass sandboxMode)
            const validation = validateMove(board, splitMove, sandboxMode);
            
            if (validation.isLegal) {
              movePiece(splitMove);
              
              // Show success toast
              toast.success('Split Move', {
                description: `Piece split into superposition: ${indexToAlgebraic(newTargets[0])} and ${indexToAlgebraic(newTargets[1])}`,
              });
              
              // Reset split state after successful move
              setSplitSource(null);
              setSplitTargets([]);
            } else {
              // Show error toast
              toast.error('Invalid Split Move', {
                description: validation.reason || 'Cannot split to those squares',
              });
              
              // Reset to allow reselection - clear targets but keep source
              setSplitTargets([]);
            }
          } else {
            // No piece found - reset state
            setSplitSource(null);
            setSplitTargets([]);
          }
        }
      }
    }
  };

  /** Handle click during merge move selection */
  const handleMergeModeClick = (square: SquareIndex) => {
    // Prevent interaction when viewing history
    if (currentMoveIndex < moveHistory.length - 1) {
      toast.info('Viewing history', {
        description: 'Navigate to the latest move to continue playing',
      });
      return;
    }
    
    if (mergeSources.length === 0) {
      // First click: select first source square (must be a piece, preferably superposed)
      const pieces = getPiecesAtSquare(board, square);
      const playerPieces = pieces.filter(p => p.color === board.activeColor);
      
      if (playerPieces.length > 0) {
        setMergeSources([square]);
        // Generate legal moves for this piece so we can show valid merge targets
        selectPiece(square);
      }
    } else if (mergeSources.length === 1) {
      // Check if clicking on already selected square - deselect
      if (square === mergeSources[0]) {
        setMergeSources([]);
        return;
      }
      
      // Second click: check if it's the same piece at different location
      const firstSquarePieces = getPiecesAtSquare(board, mergeSources[0]);
      const secondSquarePieces = getPiecesAtSquare(board, square);
      
      // Find common pieces between both squares
      const commonPiece = firstSquarePieces.find(p1 => 
        secondSquarePieces.some(p2 => p1.id === p2.id && p1.color === board.activeColor)
      );
      
      if (commonPiece) {
        // Same piece at both locations - add as second source
        setMergeSources([...mergeSources, square]);
        
        // Try direct merge to second location
        const directMerge = {
          type: 'merge' as const,
          pieceId: commonPiece.id,
          from1: mergeSources[0],
          from2: square,
          to: square,
        };
        
        const validation = validateMove(board, directMerge);
        if (validation.isLegal) {
          // Direct merge is valid - execute it
          movePiece(directMerge);
          
          toast.success('Direct Merge', {
            description: `Superposition combined at ${indexToAlgebraic(square)}`,
          });
          
          setMergeSources([]);
        }
        // If direct merge not valid, keep sources selected for 3-way merge
      } else {
        // Not the same piece - invalid selection
        toast.error('Invalid Selection', {
          description: 'Select two locations of the same piece',
        });
        setMergeSources([]);
      }
    } else if (mergeSources.length === 2) {
      // Check if clicking on already selected square - deselect
      if (square === mergeSources[0] || square === mergeSources[1]) {
        setMergeSources([]);
        setMergeTarget(null);
        return;
      }
      // Third click: select target for 3-way merge
      setMergeTarget(square);
      
      // Get the piece (could be classical or superposed)
      let piece = getPieceAt(board, mergeSources[0]);
      if (!piece) {
        const pieces = getPiecesAtSquare(board, mergeSources[0]);
        piece = pieces.find(p => p.color === board.activeColor) || null;
      }
      
      if (piece) {
        const mergeMove = {
          type: 'merge' as const,
          pieceId: piece.id,
          from1: mergeSources[0],
          from2: mergeSources[1],
          to: square,
        };
        
        // Validate before executing (pass sandboxMode)
        const validation = validateMove(board, mergeMove, sandboxMode);
        if (validation.isLegal) {
          movePiece(mergeMove);
          
          toast.success('Merge Move', {
            description: `Superposition merged from ${indexToAlgebraic(mergeSources[0])} and ${indexToAlgebraic(mergeSources[1])} to ${indexToAlgebraic(square)}`,
          });
        } else {
          toast.error('Invalid Merge', {
            description: validation.reason || 'Cannot merge to that location',
          });
        }
      }
      
      // Reset merge state (mode persists unless user changes it)
      setMergeSources([]);
      setMergeTarget(null);
    }
  };

  /** Check if square is a legal move destination */
  const isLegalMoveSquare = (square: SquareIndex): boolean => {
    // In split mode, show available split targets based on legal split moves
    if (splitMode && splitSource !== null) {
      const piece = getPieceAt(board, splitSource);
      if (!piece) {
        // Check for superposed pieces
        const pieces = getPiecesAtSquare(board, splitSource);
        const relevantPieces = sandboxMode
          ? pieces
          : pieces.filter(p => p.color === board.activeColor);
        
        if (relevantPieces.length === 0) return false;
      }
      
      // Show only valid split move targets (empty squares the piece can reach)
      // Split moves are separate from normal moves - they can only go to empty squares
      const splitMoves = legalMoves.filter(m => m.type === 'split' && m.from === splitSource);
      
      // Check if this square is a valid split target (appears in any split move as to1 or to2)
      const isValidSplitTarget = splitMoves.some(m => 
        m.type === 'split' && (m.to1 === square || m.to2 === square)
      );
      
      // Don't show already selected targets
      return isValidSplitTarget && !splitTargets.includes(square);
    }
    
    // In merge mode, highlight valid merge targets
    if (mergeMode) {
      if (mergeSources.length === 0) {
        // First selection: highlight only superposed pieces (pieces with multiple locations)
        const pieces = getPiecesAtSquare(board, square);
        const playerPieces = pieces.filter(p => p.color === board.activeColor);
        // Only highlight if piece is in superposition (has multiple locations)
        return playerPieces.some(p => Object.keys(p.superposition).length > 1);
      } else if (mergeSources.length === 1) {
        // Second selection: highlight other locations of the same piece
        const firstPieces = getPiecesAtSquare(board, mergeSources[0]);
        const firstPiece = firstPieces.find(p => p.color === board.activeColor);
        if (!firstPiece) return false;
        
        // Check if this square has the same piece
        const currentPieces = getPiecesAtSquare(board, square);
        return currentPieces.some(p => p.id === firstPiece.id) && square !== mergeSources[0];
      } else if (mergeSources.length === 2) {
        // Third selection: highlight common target squares both sources can reach (with path checking)
        const firstPieces = getPiecesAtSquare(board, mergeSources[0]);
        const firstPiece = firstPieces.find(p => p.color === board.activeColor);
        if (!firstPiece) return false;
        
        // Verify second source has the same piece
        const secondPieces = getPiecesAtSquare(board, mergeSources[1]);
        const secondPiece = secondPieces.find(p => p.id === firstPiece.id);
        if (!secondPiece) return false;
        
        // Get all possible merge moves for this piece from current board state
        const mergeMoves = legalMoves.filter(m => 
          m.type === 'merge' && 
          m.pieceId === firstPiece.id &&
          ((m.from1 === mergeSources[0] && m.from2 === mergeSources[1]) ||
           (m.from1 === mergeSources[1] && m.from2 === mergeSources[0]))
        );
        
        // Check if this square is a valid merge target
        return mergeMoves.some(m => m.type === 'merge' && m.to === square);
      }
      return false;
    }
    
    // Normal mode: check legal moves
    return legalMoves.some((move) => {
      if (move.type === 'normal' || move.type === 'capture') {
        return move.to === square;
      }
      if (move.type === 'castling') {
        return move.to === square;
      }
      if (move.type === 'promotion') {
        return move.to === square;
      }
      if (move.type === 'en-passant') {
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
    // If flipped, render from rank 0 to 7
    const rankStart = flipped ? 0 : 7;
    const rankEnd = flipped ? 7 : 0;
    const rankStep = flipped ? 1 : -1;
    
    for (let rank = rankStart; flipped ? rank <= rankEnd : rank >= rankEnd; rank += rankStep) {
      // If flipped, render files from 7 to 0, otherwise 0 to 7
      const fileStart = flipped ? 7 : 0;
      const fileEnd = flipped ? 0 : 7;
      const fileStep = flipped ? -1 : 1;
      
      for (let file = fileStart; flipped ? file >= fileEnd : file <= fileEnd; file += fileStep) {
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
        const isLastMoveFrom = lastMove?.from === index;
        const isLastMoveTo = lastMove?.to === index;
        const isFailedCaptureFrom = failedCaptureAnimation?.from === index;
        const isFailedCaptureTo = failedCaptureAnimation?.to === index;

        squares.push(
          <Square
            key={index}
            index={index}
            isLight={isLight}
            isSelected={isSelected}
            isLegalMove={isLegalMove}
            isLastMoveFrom={isLastMoveFrom}
            isLastMoveTo={isLastMoveTo}
            isFailedCaptureFrom={isFailedCaptureFrom}
            isFailedCaptureTo={isFailedCaptureTo}
            flipped={flipped}
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
    <>
      <div className="w-sm md:w-xl">
        <div className="aspect-square w-full overflow-hidden rounded-md border-2 shadow-lg sm:rounded-lg sm:border-4 sm:shadow-xl">
          <div className="grid h-full w-full grid-cols-8 grid-rows-8">
            {renderSquares()}
          </div>
        </div>
      </div>
      
      {promotionPending && (
        <PromotionDialog
          color={board.activeColor}
          onSelect={selectPromotionPiece}
          onCancel={cancelPromotion}
        />
      )}
    </>
  );
}
