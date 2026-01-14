/**
 * Move Generation and Validation
 */

import type {
  BoardState,
  Move,
  SquareIndex,
  QuantumPiece,
  MoveValidationResult,
  NormalMove,
  SplitMove,
  MergeMove,
  Color,
} from '@/lib/types';
import {
  getPieceAt,
  getPieceById,
  isSquareCertainlyEmpty,
  getPiecesByColor,
} from './state';
import {
  getPieceTargetSquares,
  getPawnCaptureSquares,
  isSlidingMove,
  isPawnPromotion,
  getCastlingTargets,
  getCastlingEmptySquares,
  getCastlingRookSquares,
} from './rules';
import {
  getSquaresBetween,
} from './utils';
import {
  wouldViolateDoubleOccupancy,
} from './quantum';

// Legal Move Generation

/** Generate all legal moves for piece at square */
export function generateLegalMoves(
  board: BoardState,
  pieceId: string,
  fromSquare: SquareIndex
): Move[] {
  const piece = getPieceById(board, pieceId);
  if (!piece) return [];
  
  // Check if piece is at this square with any probability
  if (!piece.superposition[fromSquare]) return [];
  
  const moves: Move[] = [];
  
  // For classical moves, piece must be certain at source
  if (piece.superposition[fromSquare] === 1.0) {
    // Normal moves and captures
    moves.push(...generateNormalMoves(board, piece, fromSquare));
    
    // Castling (if king)
    if (piece.type === 'K') {
      moves.push(...generateCastlingMoves(board, piece, fromSquare));
    }
    
    // En passant (if pawn)
    if (piece.type === 'P' && board.enPassantTarget) {
      const epMove = generateEnPassantMove(board, piece, fromSquare);
      if (epMove) moves.push(epMove);
    }
  }
  
  // Quantum moves (split and merge)
  if (piece.superposition[fromSquare] === 1.0) {
    moves.push(...generateSplitMoves(board, piece, fromSquare));
  }
  
  if (piece.isSuperposed) {
    moves.push(...generateMergeMoves(board, piece));
  }
  
  return moves;
}

/**
 * Generate normal moves (including captures) for a piece
 */
function generateNormalMoves(
  board: BoardState,
  piece: QuantumPiece,
  fromSquare: SquareIndex
): NormalMove[] {
  const moves: NormalMove[] = [];
  
  // Get all geometrically possible target squares
  const targets = getPieceTargetSquares(piece.type, fromSquare, piece.color);
  
  // For pawns, handle forward moves and captures separately
  if (piece.type === 'P') {
    // Forward moves (non-capturing)
    for (const target of targets) {
      if (isSquareCertainlyEmpty(board, target)) {
        // Check if two-square pawn move requires clear path
        if (Math.abs(target - fromSquare) === 16) {
          const between = getSquaresBetween(fromSquare, target);
          if (between.length > 0 && !isSquareCertainlyEmpty(board, between[0])) {
            continue; // Path blocked
          }
        }
        
        // Check for promotion
        if (isPawnPromotion(target, piece.color)) {
          // Promotion moves handled separately
          continue;
        }
        
        moves.push({
          type: 'normal',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
        });
      }
    }
    
    // Capture moves (diagonal)
    const captureSquares = getPawnCaptureSquares(fromSquare, piece.color);
    for (const target of captureSquares) {
      const targetPiece = getPieceAt(board, target);
      if (targetPiece && targetPiece.color !== piece.color) {
        moves.push({
          type: 'capture',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
          capturedPieceId: targetPiece.id,
        });
      }
    }
  } else {
    // Non-pawn pieces
    for (const target of targets) {
      // Check if path is clear for sliding pieces
      if (isSlidingMove(piece.type, fromSquare, target)) {
        const pathSquares = getSquaresBetween(fromSquare, target);
        let pathClear = true;
        
        for (const sq of pathSquares) {
          if (!isSquareCertainlyEmpty(board, sq)) {
            pathClear = false;
            break;
          }
        }
        
        if (!pathClear) continue;
      }
      
      // Check target square
      const targetPiece = getPieceAt(board, target);
      
      if (!targetPiece) {
        // Empty square - normal move
        moves.push({
          type: 'normal',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
        });
      } else if (targetPiece.color !== piece.color) {
        // Enemy piece - capture
        moves.push({
          type: 'capture',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
          capturedPieceId: targetPiece.id,
        });
      }
      // Friendly piece - skip
    }
  }
  
  return moves;
}

/**
 * Generate split moves for a piece
 * Piece must be certain at fromSquare
 */
function generateSplitMoves(
  board: BoardState,
  piece: QuantumPiece,
  fromSquare: SquareIndex
): SplitMove[] {
  const moves: SplitMove[] = [];
  
  // Get all valid target squares
  const targets = getPieceTargetSquares(piece.type, fromSquare, piece.color);
  
  // Generate all pairs of targets
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const target1 = targets[i];
      const target2 = targets[j];
      
      // Both targets must be empty (split cannot capture)
      if (!isSquareCertainlyEmpty(board, target1)) continue;
      if (!isSquareCertainlyEmpty(board, target2)) continue;
      
      // For sliding pieces, check paths
      if (isSlidingMove(piece.type, fromSquare, target1)) {
        const path1 = getSquaresBetween(fromSquare, target1);
        if (path1.some(sq => !isSquareCertainlyEmpty(board, sq))) continue;
      }
      
      if (isSlidingMove(piece.type, fromSquare, target2)) {
        const path2 = getSquaresBetween(fromSquare, target2);
        if (path2.some(sq => !isSquareCertainlyEmpty(board, sq))) continue;
      }
      
      moves.push({
        type: 'split',
        pieceId: piece.id,
        from: fromSquare,
        to1: target1,
        to2: target2,
        probability: 0.5,
      });
    }
  }
  
  return moves;
}

/** Generate merge moves for superposed piece */
function generateMergeMoves(
  board: BoardState,
  piece: QuantumPiece
): MergeMove[] {
  const moves: MergeMove[] = [];
  
  // Get all squares where this piece exists
  const occupiedSquares = Object.keys(piece.superposition)
    .map(s => parseInt(s))
    .filter(sq => piece.superposition[sq] > 0);
  
  if (occupiedSquares.length < 2) return moves; // Need at least 2 locations
  
  // For each pair of source squares
  for (let i = 0; i < occupiedSquares.length; i++) {
    for (let j = i + 1; j < occupiedSquares.length; j++) {
      const from1 = occupiedSquares[i];
      const from2 = occupiedSquares[j];
      
      // Get targets reachable from both squares
      const targets1 = getPieceTargetSquares(piece.type, from1, piece.color);
      const targets2 = getPieceTargetSquares(piece.type, from2, piece.color);
      
      // Find common targets
      const commonTargets = targets1.filter(t => targets2.includes(t));
      
      for (const target of commonTargets) {
        // Target must be empty (merge cannot capture)
        if (!isSquareCertainlyEmpty(board, target)) continue;
        
        // Check paths for sliding pieces
        if (isSlidingMove(piece.type, from1, target)) {
          const path1 = getSquaresBetween(from1, target);
          if (path1.some(sq => !isSquareCertainlyEmpty(board, sq))) continue;
        }
        
        if (isSlidingMove(piece.type, from2, target)) {
          const path2 = getSquaresBetween(from2, target);
          if (path2.some(sq => !isSquareCertainlyEmpty(board, sq))) continue;
        }
        
        moves.push({
          type: 'merge',
          pieceId: piece.id,
          from1,
          from2,
          to: target,
        });
      }
    }
  }
  
  return moves;
}

/**
 * Generate castling moves for king
 */
function generateCastlingMoves(
  board: BoardState,
  king: QuantumPiece,
  fromSquare: SquareIndex
): Move[] {
  const moves: Move[] = [];
  const color = king.color;
  const rights = board.castlingRights[color];
  
  if (!rights.kingside && !rights.queenside) return moves;
  
  const castlingTargets = getCastlingTargets(fromSquare, color);
  const rookSquares = getCastlingRookSquares(color);
  
  // Kingside castling
  if (rights.kingside && castlingTargets.kingside) {
    const emptySquares = getCastlingEmptySquares('kingside', color);
    if (emptySquares.every(sq => isSquareCertainlyEmpty(board, sq))) {
      // Check if rook is in place
      const rook = getPieceAt(board, rookSquares.kingside.from);
      if (rook && rook.type === 'R' && rook.color === color) {
        moves.push({
          type: 'castling',
          pieceId: king.id,
          from: fromSquare,
          to: castlingTargets.kingside,
          rookFrom: rookSquares.kingside.from,
          rookTo: rookSquares.kingside.to,
          side: 'kingside',
        });
      }
    }
  }
  
  // Queenside castling
  if (rights.queenside && castlingTargets.queenside) {
    const emptySquares = getCastlingEmptySquares('queenside', color);
    if (emptySquares.every(sq => isSquareCertainlyEmpty(board, sq))) {
      // Check if rook is in place
      const rook = getPieceAt(board, rookSquares.queenside.from);
      if (rook && rook.type === 'R' && rook.color === color) {
        moves.push({
          type: 'castling',
          pieceId: king.id,
          from: fromSquare,
          to: castlingTargets.queenside,
          rookFrom: rookSquares.queenside.from,
          rookTo: rookSquares.queenside.to,
          side: 'queenside',
        });
      }
    }
  }
  
  return moves;
}

/**
 * Generate en passant move if available
 */
function generateEnPassantMove(
  board: BoardState,
  pawn: QuantumPiece,
  fromSquare: SquareIndex
): Move | null {
  if (!board.enPassantTarget) return null;
  
  const captureSquares = getPawnCaptureSquares(fromSquare, pawn.color);
  
  if (captureSquares.includes(board.enPassantTarget.square)) {
    return {
      type: 'en-passant',
      pieceId: pawn.id,
      from: fromSquare,
      to: board.enPassantTarget.square,
      capturedPawnSquare: board.enPassantTarget.pawnSquare,
      capturedPieceId: board.enPassantTarget.pawnId,
    };
  }
  
  return null;
}

// Move Validation

/** Validate if move is legal */
export function validateMove(board: BoardState, move: Move): MoveValidationResult {
  const piece = getPieceById(board, move.pieceId);
  
  if (!piece) {
    return {
      isLegal: false,
      reason: 'Piece not found',
    };
  }
  
  // Check if it's the correct player's turn
  if (piece.color !== board.activeColor) {
    return {
      isLegal: false,
      reason: 'Not your turn',
    };
  }
  
  // Type-specific validation
  switch (move.type) {
    case 'normal':
    case 'capture':
      return validateNormalMove(board, move);
    case 'split':
      return validateSplitMove(board, move);
    case 'merge':
      return validateMergeMove(board, move);
    case 'castling':
      return { isLegal: true }; // Simplified for now
    case 'en-passant':
      return { isLegal: true }; // Simplified for now
    case 'promotion':
      return { isLegal: true }; // Simplified for now
    default:
      return {
        isLegal: false,
        reason: 'Unknown move type',
      };
  }
}

/**
 * Validate normal/capture move
 */
function validateNormalMove(
  board: BoardState,
  move: NormalMove
): MoveValidationResult {
  const piece = getPieceById(board, move.pieceId)!;
  
  // Piece must be certain at source
  if (piece.superposition[move.from] !== 1.0) {
    return {
      isLegal: false,
      reason: 'Piece is in superposition, measurement required',
      requiresMeasurement: true,
      measurementSquare: move.from,
    };
  }
  
  // For captures, check if there's an enemy piece at target
  if (move.type === 'capture') {
    const targetPiece = getPieceAt(board, move.to);
    if (!targetPiece || targetPiece.color === piece.color) {
      return {
        isLegal: false,
        reason: 'Cannot capture: no enemy piece at target',
      };
    }
  } else {
    // For non-capture moves, check if move would violate double occupancy
    if (wouldViolateDoubleOccupancy(board, move.pieceId, move.to)) {
      return {
        isLegal: false,
        reason: 'Would violate No Double Occupancy rule',
      };
    }
  }
  
  return { isLegal: true };
}

/**
 * Validate split move
 */
function validateSplitMove(
  board: BoardState,
  move: SplitMove
): MoveValidationResult {
  const piece = getPieceById(board, move.pieceId)!;
  
  // Piece must be certain at source
  if (piece.superposition[move.from] !== 1.0) {
    return {
      isLegal: false,
      reason: 'Cannot split piece in superposition',
    };
  }
  
  // Targets must be empty
  if (!isSquareCertainlyEmpty(board, move.to1) || !isSquareCertainlyEmpty(board, move.to2)) {
    return {
      isLegal: false,
      reason: 'Split targets must be empty',
    };
  }
  
  return { isLegal: true };
}

/**
 * Validate merge move
 */
function validateMergeMove(
  board: BoardState,
  move: MergeMove
): MoveValidationResult {
  const piece = getPieceById(board, move.pieceId)!;
  
  // Check piece exists at both source squares
  if (!piece.superposition[move.from1] || !piece.superposition[move.from2]) {
    return {
      isLegal: false,
      reason: 'Piece must exist at both source squares',
    };
  }
  
  // Target must be empty
  if (!isSquareCertainlyEmpty(board, move.to)) {
    return {
      isLegal: false,
      reason: 'Merge target must be empty',
    };
  }
  
  return { isLegal: true };
}

// Helper Functions

/** Get all legal moves for current player */
export function getAllLegalMoves(board: BoardState): Move[] {
  const pieces = getPiecesByColor(board, board.activeColor);
  const allMoves: Move[] = [];
  
  for (const piece of pieces) {
    const squares = Object.keys(piece.superposition).map(s => parseInt(s));
    for (const square of squares) {
      const moves = generateLegalMoves(board, piece.id, square);
      allMoves.push(...moves);
    }
  }
  
  return allMoves;
}

/**
 * Check if player has any legal moves (for stalemate detection)
 */
export function hasLegalMoves(board: BoardState, color: Color): boolean {
  const pieces = getPiecesByColor(board, color);
  
  for (const piece of pieces) {
    const squares = Object.keys(piece.superposition).map(s => parseInt(s));
    for (const square of squares) {
      const moves = generateLegalMoves(board, piece.id, square);
      if (moves.length > 0) return true;
    }
  }
  
  return false;
}
