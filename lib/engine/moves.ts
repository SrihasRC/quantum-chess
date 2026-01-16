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
  getPiecesAtSquare,
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
  indexToAlgebraic,
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
  
  // For classical moves, piece must be certain at source (will be measured if not)
  if (piece.superposition[fromSquare] > 0) {
    // Normal moves and captures (can be attempted even with superposed pieces)
    moves.push(...generateNormalMoves(board, piece, fromSquare));
    
    // Castling (if king and certain at source)
    if (piece.type === 'K' && piece.superposition[fromSquare] === 1.0) {
      moves.push(...generateCastlingMoves(board, piece, fromSquare));
    }
    
    // En passant (if pawn and certain at source)
    if (piece.type === 'P' && board.enPassantTarget && piece.superposition[fromSquare] === 1.0) {
      const epMove = generateEnPassantMove(board, piece, fromSquare);
      if (epMove) moves.push(epMove);
    }
  }
  
  // Quantum moves (split and merge)
  // Allow split even for superposed pieces
  if (piece.superposition[fromSquare] > 0) {
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
      // Check if target is empty or has the same pawn in superposition
      const targetPieces = getPiecesAtSquare(board, target);
      const samePawn = targetPieces.find(p => p.id === piece.id);
      const otherPieces = targetPieces.filter(p => p.id !== piece.id);
      
      if (otherPieces.length === 0) {
        // Square is empty or only has same pawn - can move
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
      
      // Check for classical enemy piece
      if (targetPiece && targetPiece.color !== piece.color) {
        moves.push({
          type: 'capture',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
          capturedPieceId: targetPiece.id,
        });
      } else {
        // Check for superposed enemy pieces
        const superposedPieces = getPiecesAtSquare(board, target);
        const enemyPieces = superposedPieces.filter(p => p.color !== piece.color);
        
        if (enemyPieces.length > 0) {
          // Can capture superposed piece (will trigger measurement)
          moves.push({
            type: 'capture',
            pieceId: piece.id,
            from: fromSquare,
            to: target,
            capturedPieceId: enemyPieces[0].id, // Take first enemy piece
          });
        }
      }
    }
  } else {
    // Non-pawn pieces
    for (const target of targets) {
      // Check if path is clear for sliding pieces
      if (isSlidingMove(piece.type, fromSquare, target)) {
        const pathSquares = getSquaresBetween(fromSquare, target);
        let pathBlocked = false;
        
        // Only block if square is CERTAINLY occupied (probability = 1.0)
        // Superpositioned pieces (0 < prob < 1) will create entanglement instead
        for (const sq of pathSquares) {
          const certainPiece = getPieceAt(board, sq);
          if (certainPiece) {
            // Square is certainly occupied - path blocked
            pathBlocked = true;
            break;
          }
        }
        
        if (pathBlocked) continue;
      }
      
      // Check target square
      const targetPiece = getPieceAt(board, target);
      
      if (!targetPiece) {
        // Check if there are superposed pieces at target
        const superposedPieces = getPiecesAtSquare(board, target);
        const enemyPieces = superposedPieces.filter(p => p.color !== piece.color);
        const samePiece = superposedPieces.find(p => p.id === piece.id);
        
        if (samePiece) {
          // Same piece exists in superposition at target - allow move (will combine probabilities)
          moves.push({
            type: 'normal',
            pieceId: piece.id,
            from: fromSquare,
            to: target,
          });
        } else if (enemyPieces.length > 0) {
          // Can capture superposed enemy piece (will trigger measurement)
          moves.push({
            type: 'capture',
            pieceId: piece.id,
            from: fromSquare,
            to: target,
            capturedPieceId: enemyPieces[0].id,
          });
        } else {
          // Empty square - normal move
          moves.push({
            type: 'normal',
            pieceId: piece.id,
            from: fromSquare,
            to: target,
          });
        }
      } else if (targetPiece.color !== piece.color) {
        // Enemy piece - capture
        moves.push({
          type: 'capture',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
          capturedPieceId: targetPiece.id,
        });
      } else if (targetPiece.id === piece.id) {
        // Same piece at target (in superposition) - allow move to combine probabilities
        moves.push({
          type: 'normal',
          pieceId: piece.id,
          from: fromSquare,
          to: target,
        });
      }
      // Different friendly piece - skip
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
      
      // Check if targets are occupied by OTHER pieces (not allowed)
      // But allow splitting to squares where THIS SAME piece already has superposition
      const target1Pieces = getPiecesAtSquare(board, target1).filter(p => p.id !== piece.id);
      const target2Pieces = getPiecesAtSquare(board, target2).filter(p => p.id !== piece.id);
      
      if (target1Pieces.length > 0) continue; // Occupied by other piece(s)
      if (target2Pieces.length > 0) continue; // Occupied by other piece(s)
      
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
        
        // Check paths are not certainly blocked (allow superposition - will create entanglement)
        if (isSlidingMove(piece.type, from1, target)) {
          const path1 = getSquaresBetween(from1, target);
          if (path1.some(sq => getPieceAt(board, sq) !== null)) continue;
        }
        
        if (isSlidingMove(piece.type, from2, target)) {
          const path2 = getSquaresBetween(from2, target);
          if (path2.some(sq => getPieceAt(board, sq) !== null)) continue;
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
  
  // For normal moves, superposition is allowed - entanglement will be created if needed
  // Measurement is only required for CAPTURES, not normal moves
  
  // For sliding pieces, check if path is clear
  if (isSlidingMove(piece.type, move.from, move.to)) {
    const pathSquares = getSquaresBetween(move.from, move.to);
    for (const sq of pathSquares) {
      // Only block if square is CERTAINLY occupied (prob = 1.0)
      // Superpositioned pieces (0 < prob < 1) will create entanglement
      const certainPiece = getPieceAt(board, sq);
      if (certainPiece) {
        return {
          isLegal: false,
          reason: 'Path is certainly blocked',
        };
      }
    }
  }
  
  // For captures, check if there's an enemy piece at target
  if (move.type === 'capture') {
    const targetPiece = getPieceAt(board, move.to);
    
    // Check for classical enemy piece
    if (targetPiece && targetPiece.color !== piece.color) {
      return { isLegal: true };
    }
    
    // Check for superposed enemy pieces
    const superposedPieces = getPiecesAtSquare(board, move.to);
    const enemyPieces = superposedPieces.filter(p => p.color !== piece.color);
    
    if (enemyPieces.length > 0) {
      // Capturing a superposed piece requires measurement
      return {
        isLegal: true,
        requiresMeasurement: true,
        measurementSquare: move.to,
      };
    }
    
    return {
      isLegal: false,
      reason: 'Cannot capture: no enemy piece at target',
    };
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
  
  // Check that both targets are legal moves for this piece type from the source square
  const validTargets = getPieceTargetSquares(piece.type, move.from, piece.color);
  
  if (!validTargets.includes(move.to1)) {
    return {
      isLegal: false,
      reason: `Target 1 (${indexToAlgebraic(move.to1)}) is not a legal move for ${piece.type} from ${indexToAlgebraic(move.from)}`,
    };
  }
  
  if (!validTargets.includes(move.to2)) {
    return {
      isLegal: false,
      reason: `Target 2 (${indexToAlgebraic(move.to2)}) is not a legal move for ${piece.type} from ${indexToAlgebraic(move.from)}`,
    };
  }
  
  // Targets must be empty OR contain the same piece (per paper's possibility equation)
  const target1Pieces = getPiecesAtSquare(board, move.to1).filter(p => p.id !== piece.id);
  const target2Pieces = getPiecesAtSquare(board, move.to2).filter(p => p.id !== piece.id);
  
  if (target1Pieces.length > 0) {
    return {
      isLegal: false,
      reason: 'Split target 1 is occupied by another piece',
    };
  }
  
  if (target2Pieces.length > 0) {
    return {
      isLegal: false,
      reason: 'Split target 2 is occupied by another piece',
    };
  }
  
  // For sliding pieces, check paths are not CERTAINLY blocked
  // Superpositioned pieces will create entanglement instead
  if (isSlidingMove(piece.type, move.from, move.to1)) {
    const path1 = getSquaresBetween(move.from, move.to1);
    const blocked1 = path1.some(sq => getPieceAt(board, sq) !== null);
    if (blocked1) {
      return {
        isLegal: false,
        reason: 'Path to target 1 is certainly blocked',
      };
    }
  }
  
  if (isSlidingMove(piece.type, move.from, move.to2)) {
    const path2 = getSquaresBetween(move.from, move.to2);
    const blocked2 = path2.some(sq => getPieceAt(board, sq) !== null);
    if (blocked2) {
      return {
        isLegal: false,
        reason: 'Path to target 2 is certainly blocked',
      };
    }
  }
  
  // Check piece has some probability at source square
  if (!piece.superposition[move.from] || piece.superposition[move.from] === 0) {
    return {
      isLegal: false,
      reason: 'Piece is not at the source square',
    };
  }
  
  // Split moves don't require measurement - they work on whatever probability exists
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
  
  // Target must be empty OR contain the same piece (per paper's possibility equation)
  const targetPieces = getPiecesAtSquare(board, move.to).filter(p => p.id !== piece.id);
  
  if (targetPieces.length > 0) {
    return {
      isLegal: false,
      reason: 'Merge target is occupied by another piece',
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
