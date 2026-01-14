/**
 * Chess Rules - Movement patterns for each piece
 */

import type {
  SquareIndex,
  PieceSymbol,
  Color,
  Direction,
} from '@/lib/types';
import {
  getFile,
  getRank,
  getSquareFromFileRank,
  isOnBoard,
} from './utils';

// Movement Patterns

/** Get all geometrically possible target squares for a piece */
export function getPieceTargetSquares(
  piece: PieceSymbol,
  square: SquareIndex,
  color: Color
): SquareIndex[] {
  switch (piece) {
    case 'P':
      return getPawnTargets(square, color);
    case 'N':
      return getKnightTargets(square);
    case 'B':
      return getBishopTargets(square);
    case 'R':
      return getRookTargets(square);
    case 'Q':
      return getQueenTargets(square);
    case 'K':
      return getKingTargets(square);
    default:
      return [];
  }
}

/**
 * Pawn target squares (forward moves only, not captures)
 */
export function getPawnTargets(square: SquareIndex, color: Color): SquareIndex[] {
  const file = getFile(square);
  const rank = getRank(square);
  const targets: SquareIndex[] = [];
  const direction = color === 'white' ? 1 : -1;
  const startRank = color === 'white' ? 1 : 6;
  
  // One square forward
  const oneForward = getSquareFromFileRank(file, rank + direction);
  if (oneForward !== null) {
    targets.push(oneForward);
  }
  
  // Two squares forward from starting position
  if (rank === startRank) {
    const twoForward = getSquareFromFileRank(file, rank + 2 * direction);
    if (twoForward !== null) {
      targets.push(twoForward);
    }
  }
  
  return targets;
}

/**
 * Pawn capture squares (diagonal)
 */
export function getPawnCaptureSquares(square: SquareIndex, color: Color): SquareIndex[] {
  const file = getFile(square);
  const rank = getRank(square);
  const targets: SquareIndex[] = [];
  const direction = color === 'white' ? 1 : -1;
  
  // Left diagonal
  const leftCapture = getSquareFromFileRank(file - 1, rank + direction);
  if (leftCapture !== null) {
    targets.push(leftCapture);
  }
  
  // Right diagonal
  const rightCapture = getSquareFromFileRank(file + 1, rank + direction);
  if (rightCapture !== null) {
    targets.push(rightCapture);
  }
  
  return targets;
}

/**
 * Knight target squares (L-shaped moves)
 */
export function getKnightTargets(square: SquareIndex): SquareIndex[] {
  const file = getFile(square);
  const rank = getRank(square);
  const targets: SquareIndex[] = [];
  
  const offsets: [number, number][] = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2],
  ];
  
  for (const [fileOffset, rankOffset] of offsets) {
    const targetSquare = getSquareFromFileRank(file + fileOffset, rank + rankOffset);
    if (targetSquare !== null) {
      targets.push(targetSquare);
    }
  }
  
  return targets;
}

/**
 * Bishop target squares (diagonal sliding)
 */
export function getBishopTargets(square: SquareIndex): SquareIndex[] {
  return getSlidingTargets(square, [
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]);
}

/**
 * Rook target squares (horizontal/vertical sliding)
 */
export function getRookTargets(square: SquareIndex): SquareIndex[] {
  return getSlidingTargets(square, [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ]);
}

/**
 * Queen target squares (combination of rook and bishop)
 */
export function getQueenTargets(square: SquareIndex): SquareIndex[] {
  return getSlidingTargets(square, [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]);
}

/**
 * King target squares (one square in any direction)
 */
export function getKingTargets(square: SquareIndex): SquareIndex[] {
  const file = getFile(square);
  const rank = getRank(square);
  const targets: SquareIndex[] = [];
  
  for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
    for (let rankOffset = -1; rankOffset <= 1; rankOffset++) {
      if (fileOffset === 0 && rankOffset === 0) continue;
      
      const targetSquare = getSquareFromFileRank(file + fileOffset, rank + rankOffset);
      if (targetSquare !== null) {
        targets.push(targetSquare);
      }
    }
  }
  
  return targets;
}

/**
 * Get sliding piece targets in given directions
 */
function getSlidingTargets(square: SquareIndex, directions: [number, number][]): SquareIndex[] {
  const file = getFile(square);
  const rank = getRank(square);
  const targets: SquareIndex[] = [];
  
  for (const [fileDir, rankDir] of directions) {
    let currentFile = file + fileDir;
    let currentRank = rank + rankDir;
    
    while (isOnBoard(currentFile, currentRank)) {
      const targetSquare = getSquareFromFileRank(currentFile, currentRank);
      if (targetSquare !== null) {
        targets.push(targetSquare);
      }
      currentFile += fileDir;
      currentRank += rankDir;
    }
  }
  
  return targets;
}

// Attack Checks

/** Check if piece can attack target square (ignoring board state) */
export function canPieceAttackSquare(
  piece: PieceSymbol,
  fromSquare: SquareIndex,
  toSquare: SquareIndex,
  color: Color
): boolean {
  if (piece === 'P') {
    // Pawns attack diagonally
    const captureSquares = getPawnCaptureSquares(fromSquare, color);
    return captureSquares.includes(toSquare);
  }
  
  const targets = getPieceTargetSquares(piece, fromSquare, color);
  return targets.includes(toSquare);
}

// Castling

/** Get castling target squares */
export function getCastlingTargets(kingSquare: SquareIndex, color: Color): {
  kingside?: SquareIndex;
  queenside?: SquareIndex;
} {
  const rank = color === 'white' ? 0 : 7;
  const expectedKingSquare = rank * 8 + 4; // e1 or e8
  
  if (kingSquare !== expectedKingSquare) {
    return {}; // King has moved
  }
  
  return {
    kingside: rank * 8 + 6,  // g1 or g8
    queenside: rank * 8 + 2, // c1 or c8
  };
}

/**
 * Get rook positions for castling
 */
export function getCastlingRookSquares(color: Color): {
  kingside: { from: SquareIndex; to: SquareIndex };
  queenside: { from: SquareIndex; to: SquareIndex };
} {
  const rank = color === 'white' ? 0 : 7;
  
  return {
    kingside: {
      from: rank * 8 + 7, // h1 or h8
      to: rank * 8 + 5,   // f1 or f8
    },
    queenside: {
      from: rank * 8 + 0, // a1 or a8
      to: rank * 8 + 3,   // d1 or d8
    },
  };
}

/**
 * Get squares that must be empty for castling
 */
export function getCastlingEmptySquares(side: 'kingside' | 'queenside', color: Color): SquareIndex[] {
  const rank = color === 'white' ? 0 : 7;
  
  if (side === 'kingside') {
    return [rank * 8 + 5, rank * 8 + 6]; // f1-g1 or f8-g8
  } else {
    return [rank * 8 + 1, rank * 8 + 2, rank * 8 + 3]; // b1-d1 or b8-d8
  }
}

/**
 * Get squares that king passes through during castling (for attack check)
 */
export function getCastlingKingPath(side: 'kingside' | 'queenside', color: Color): SquareIndex[] {
  const rank = color === 'white' ? 0 : 7;
  
  if (side === 'kingside') {
    return [rank * 8 + 4, rank * 8 + 5, rank * 8 + 6]; // e1-f1-g1 or e8-f8-g8
  } else {
    return [rank * 8 + 4, rank * 8 + 3, rank * 8 + 2]; // e1-d1-c1 or e8-d8-c8
  }
}

// Pawn Promotion

/** Check if pawn move results in promotion */
export function isPawnPromotion(toSquare: SquareIndex, color: Color): boolean {
  const rank = getRank(toSquare);
  return (color === 'white' && rank === 7) || (color === 'black' && rank === 0);
}

/**
 * Get promotion rank for color
 */
export function getPromotionRank(color: Color): number {
  return color === 'white' ? 7 : 0;
}

/**
 * Valid promotion pieces
 */
export const PROMOTION_PIECES: PieceSymbol[] = ['Q', 'R', 'B', 'N'];

// Direction Helpers

/** Get direction vector from one square to another (null if not straight line) */
export function getDirection(from: SquareIndex, to: SquareIndex): Direction | null {
  const fromFile = getFile(from);
  const fromRank = getRank(from);
  const toFile = getFile(to);
  const toRank = getRank(to);
  
  const fileDiff = toFile - fromFile;
  const rankDiff = toRank - fromRank;
  
  // Not on a line
  if (fileDiff !== 0 && rankDiff !== 0 && Math.abs(fileDiff) !== Math.abs(rankDiff)) {
    return null;
  }
  
  return {
    fileOffset: fileDiff === 0 ? 0 : fileDiff / Math.abs(fileDiff),
    rankOffset: rankDiff === 0 ? 0 : rankDiff / Math.abs(rankDiff),
  };
}

/**
 * Check if a move is a sliding move (requires path checking)
 */
export function isSlidingMove(piece: PieceSymbol, from: SquareIndex, to: SquareIndex): boolean {
  const slidingPieces: PieceSymbol[] = ['B', 'R', 'Q'];
  if (!slidingPieces.includes(piece)) return false;
  
  const fromFile = getFile(from);
  const fromRank = getRank(from);
  const toFile = getFile(to);
  const toRank = getRank(to);
  
  const fileDiff = Math.abs(toFile - fromFile);
  const rankDiff = Math.abs(toRank - fromRank);
  
  return fileDiff > 1 || rankDiff > 1;
}

// Material Value

/** Get material value (standard chess values) */
export function getPieceValue(piece: PieceSymbol): number {
  switch (piece) {
    case 'P': return 1;
    case 'N': return 3;
    case 'B': return 3;
    case 'R': return 5;
    case 'Q': return 9;
    case 'K': return 0; // King is priceless
    default: return 0;
  }
}

/**
 * Calculate material advantage
 */
export function calculateMaterialAdvantage(
  whitePieces: PieceSymbol[],
  blackPieces: PieceSymbol[]
): number {
  const whiteValue = whitePieces.reduce((sum, p) => sum + getPieceValue(p), 0);
  const blackValue = blackPieces.reduce((sum, p) => sum + getPieceValue(p), 0);
  return whiteValue - blackValue;
}
