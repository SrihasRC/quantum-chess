/**
 * Board State Management
 */

import type {
  BoardState,
  QuantumPiece,
  PieceSymbol,
  Color,
  SquareIndex,
  SuperpositionState,
  CastlingRights,
  EnPassantTarget,
} from '@/lib/types';
import { generatePieceId } from './utils';

// Initial Board Setup

/** Create initial board state (standard chess position) */
export function createInitialBoardState(): BoardState {
  const pieces: QuantumPiece[] = [];
  
  // White pieces
  pieces.push(createPiece('R', 'white', 0));  // a1
  pieces.push(createPiece('N', 'white', 1));  // b1
  pieces.push(createPiece('B', 'white', 2));  // c1
  pieces.push(createPiece('Q', 'white', 3));  // d1
  pieces.push(createPiece('K', 'white', 4));  // e1
  pieces.push(createPiece('B', 'white', 5));  // f1
  pieces.push(createPiece('N', 'white', 6));  // g1
  pieces.push(createPiece('R', 'white', 7));  // h1
  
  // White pawns
  for (let i = 0; i < 8; i++) {
    pieces.push(createPiece('P', 'white', 8 + i)); // a2-h2
  }
  
  // Black pawns
  for (let i = 0; i < 8; i++) {
    pieces.push(createPiece('P', 'black', 48 + i)); // a7-h7
  }
  
  // Black pieces
  pieces.push(createPiece('R', 'black', 56)); // a8
  pieces.push(createPiece('N', 'black', 57)); // b8
  pieces.push(createPiece('B', 'black', 58)); // c8
  pieces.push(createPiece('Q', 'black', 59)); // d8
  pieces.push(createPiece('K', 'black', 60)); // e8
  pieces.push(createPiece('B', 'black', 61)); // f8
  pieces.push(createPiece('N', 'black', 62)); // g8
  pieces.push(createPiece('R', 'black', 63)); // h8
  
  return {
    pieces,
    activeColor: 'white',
    castlingRights: {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true },
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

/**
 * Create a quantum piece with certain position (probability = 1.0)
 */
export function createPiece(
  type: PieceSymbol,
  color: Color,
  square: SquareIndex
): QuantumPiece {
  return {
    id: generatePieceId(),
    type,
    color,
    superposition: { [square]: 1.0 },
    isSuperposed: false,
  };
}

/**
 * Create a quantum piece in superposition
 */
export function createSuperposedPiece(
  type: PieceSymbol,
  color: Color,
  superposition: SuperpositionState
): QuantumPiece {
  return {
    id: generatePieceId(),
    type,
    color,
    superposition,
    isSuperposed: Object.keys(superposition).length > 1,
  };
}

// Board Queries

/** Get piece at square (if probability = 1.0) */
export function getPieceAt(board: BoardState, square: SquareIndex): QuantumPiece | null {
  for (const piece of board.pieces) {
    const prob = piece.superposition[square];
    if (prob === 1.0) {
      return piece;
    }
  }
  return null;
}

/**
 * Get all pieces that have some probability of being at a square
 */
export function getPiecesAtSquare(board: BoardState, square: SquareIndex): QuantumPiece[] {
  return board.pieces.filter(piece => piece.superposition[square] !== undefined);
}

/**
 * Get probability that a square is occupied by any piece
 */
export function getSquareOccupancyProbability(board: BoardState, square: SquareIndex): number {
  let totalProb = 0;
  for (const piece of board.pieces) {
    const prob = piece.superposition[square] || 0;
    totalProb += prob;
  }
  return totalProb;
}

/**
 * Check if a square is certainly empty (no piece has any probability there)
 */
export function isSquareCertainlyEmpty(board: BoardState, square: SquareIndex): boolean {
  return getSquareOccupancyProbability(board, square) === 0;
}

/**
 * Check if a square is certainly occupied (some piece has probability = 1.0)
 */
export function isSquareCertainlyOccupied(board: BoardState, square: SquareIndex): boolean {
  return getPieceAt(board, square) !== null;
}

/**
 * Check if a square has superpositioned pieces (0 < probability < 1)
 */
export function hasSuperpositionedPiece(board: BoardState, square: SquareIndex): boolean {
  const prob = getSquareOccupancyProbability(board, square);
  return prob > 0 && prob < 1;
}

/**
 * Get piece by ID
 */
export function getPieceById(board: BoardState, pieceId: string): QuantumPiece | null {
  return board.pieces.find(p => p.id === pieceId) || null;
}

/**
 * Get all pieces of a specific color
 */
export function getPiecesByColor(board: BoardState, color: Color): QuantumPiece[] {
  return board.pieces.filter(p => p.color === color);
}

/**
 * Get all pieces of a specific type and color
 */
export function getPiecesByTypeAndColor(
  board: BoardState,
  type: PieceSymbol,
  color: Color
): QuantumPiece[] {
  return board.pieces.filter(p => p.type === type && p.color === color);
}

/**
 * Get the king of a specific color
 */
export function getKing(board: BoardState, color: Color): QuantumPiece | null {
  const kings = getPiecesByTypeAndColor(board, 'K', color);
  return kings[0] || null;
}

/**
 * Get total probability that a king exists on the board
 * (Used for win condition - player loses when their king probability = 0)
 */
export function getKingProbability(board: BoardState, color: Color): number {
  const king = getKing(board, color);
  if (!king) return 0;
  
  return Object.values(king.superposition).reduce((sum, prob) => sum + prob, 0);
}

/**
 * Get all squares where a piece could be (with probabilities)
 */
export function getPieceSquares(piece: QuantumPiece): SquareIndex[] {
  return Object.keys(piece.superposition).map(sq => parseInt(sq));
}

/**
 * Get probability that a specific piece is at a specific square
 */
export function getPieceProbabilityAt(piece: QuantumPiece, square: SquareIndex): number {
  return piece.superposition[square] || 0;
}

// Board Mutations

/** Clone board state (deep copy) */
export function cloneBoardState(board: BoardState): BoardState {
  return {
    pieces: board.pieces.map(p => ({
      ...p,
      superposition: { ...p.superposition },
    })),
    activeColor: board.activeColor,
    castlingRights: {
      white: { ...board.castlingRights.white },
      black: { ...board.castlingRights.black },
    },
    enPassantTarget: board.enPassantTarget ? { ...board.enPassantTarget } : null,
    halfmoveClock: board.halfmoveClock,
    fullmoveNumber: board.fullmoveNumber,
  };
}

/**
 * Update a piece's superposition state
 */
export function updatePieceSuperposition(
  board: BoardState,
  pieceId: string,
  newSuperposition: SuperpositionState
): BoardState {
  const newBoard = cloneBoardState(board);
  const piece = newBoard.pieces.find(p => p.id === pieceId);
  
  if (!piece) {
    throw new Error(`Piece ${pieceId} not found`);
  }
  
  piece.superposition = { ...newSuperposition };
  piece.isSuperposed = Object.keys(newSuperposition).length > 1;
  
  return newBoard;
}

/**
 * Remove a piece from the board
 */
export function removePiece(board: BoardState, pieceId: string): BoardState {
  const newBoard = cloneBoardState(board);
  newBoard.pieces = newBoard.pieces.filter(p => p.id !== pieceId);
  return newBoard;
}

/**
 * Add a piece to the board
 */
export function addPiece(board: BoardState, piece: QuantumPiece): BoardState {
  const newBoard = cloneBoardState(board);
  newBoard.pieces.push({ ...piece, superposition: { ...piece.superposition } });
  return newBoard;
}

/**
 * Switch active color
 */
export function switchTurn(board: BoardState): BoardState {
  const newBoard = cloneBoardState(board);
  newBoard.activeColor = newBoard.activeColor === 'white' ? 'black' : 'white';
  if (newBoard.activeColor === 'white') {
    newBoard.fullmoveNumber++;
  }
  return newBoard;
}

/**
 * Update castling rights
 */
export function updateCastlingRights(
  board: BoardState,
  color: Color,
  rights: Partial<CastlingRights>
): BoardState {
  const newBoard = cloneBoardState(board);
  newBoard.castlingRights[color] = {
    ...newBoard.castlingRights[color],
    ...rights,
  };
  return newBoard;
}

/**
 * Set en passant target
 */
export function setEnPassantTarget(
  board: BoardState,
  target: EnPassantTarget | null
): BoardState {
  const newBoard = cloneBoardState(board);
  newBoard.enPassantTarget = target;
  return newBoard;
}

// Board Validation

/** Validate all pieces have valid probability distributions */
export function validateBoardState(board: BoardState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check each piece
  for (const piece of board.pieces) {
    const totalProb = Object.values(piece.superposition).reduce((sum, p) => sum + p, 0);
    
    if (Math.abs(totalProb - 1.0) > 1e-6) {
      errors.push(`Piece ${piece.id} has invalid probability sum: ${totalProb}`);
    }
    
    // Check for negative probabilities
    for (const [square, prob] of Object.entries(piece.superposition)) {
      if (prob < 0) {
        errors.push(`Piece ${piece.id} has negative probability at square ${square}`);
      }
      if (prob > 1) {
        errors.push(`Piece ${piece.id} has probability > 1 at square ${square}`);
      }
    }
  }
  
  // Check for double occupancy (simplified check)
  for (let square = 0; square < 64; square++) {
    const certainPieces = board.pieces.filter(p => p.superposition[square] === 1.0);
    if (certainPieces.length > 1) {
      errors.push(`Square ${square} has multiple pieces with probability 1.0`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Board Representation

/** Convert board to string (for debugging) */
export function boardToString(board: BoardState): string {
  const lines: string[] = [];
  
  for (let rank = 7; rank >= 0; rank--) {
    let line = `${rank + 1} `;
    for (let file = 0; file < 8; file++) {
      const square = rank * 8 + file;
      const piece = getPieceAt(board, square);
      if (piece) {
        const symbol = piece.color === 'white' ? piece.type : piece.type.toLowerCase();
        line += ` ${symbol} `;
      } else {
        line += ' . ';
      }
    }
    lines.push(line);
  }
  
  lines.push('   a  b  c  d  e  f  g  h');
  
  return lines.join('\n');
}
