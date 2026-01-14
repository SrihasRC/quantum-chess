'use client';

import { Square } from './Square';
import { Piece } from './Piece';
import { useGameStore } from '@/lib/store/gameStore';
import { getPieceAt } from '@/lib/engine/state';
import type { SquareIndex } from '@/lib/types';

export function Chessboard() {
  const board = useGameStore((state) => state.board);
  const selectedSquare = useGameStore((state) => state.selectedSquare);
  const legalMoves = useGameStore((state) => state.legalMoves);
  const selectPiece = useGameStore((state) => state.selectPiece);

  /** Check if square is a legal move destination */
  const isLegalMoveSquare = (square: SquareIndex): boolean => {
    return legalMoves.some((move) => {
      if (move.type === 'normal' || move.type === 'capture') {
        return move.to === square;
      }
      return false;
    });
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
        const isSelected = selectedSquare === index;
        const isLegalMove = isLegalMoveSquare(index);

        squares.push(
          <Square
            key={index}
            index={index}
            isLight={isLight}
            isSelected={isSelected}
            isLegalMove={isLegalMove}
            onClick={() => selectPiece(index)}
          >
            {piece && (
              <Piece
                type={piece.type}
                color={piece.color}
                probability={piece.superposition[index] || 1.0}
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
      <div className="aspect-square w-full overflow-hidden rounded-lg border-4 border-border shadow-xl">
        <div className="grid h-full w-full grid-cols-8 grid-rows-8">
          {renderSquares()}
        </div>
      </div>
    </div>
  );
}
