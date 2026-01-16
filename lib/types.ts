/**
 * Type Definitions
 * Quantum-inspired game types (not real quantum simulation)
 */

// Piece Types

/**
 * Chess piece types
 * Uppercase = White pieces, Lowercase = Black pieces
 */
export type PieceType = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

/**
 * Piece symbols without color
 */
export type PieceSymbol = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

/**
 * Player colors
 */
export type Color = 'white' | 'black';

/**
 * Piece with color information
 */
export interface Piece {
  type: PieceSymbol;
  color: Color;
}

// Board & Coordinates

/**
 * Square index (0-63)
 * 0 = a1, 1 = b1, ..., 7 = h1
 * 8 = a2, 9 = b2, ..., 15 = h2
 * ...
 * 56 = a8, 57 = b8, ..., 63 = h8
 */
export type SquareIndex = number;

/**
 * Algebraic notation for squares (e.g., 'e4', 'a1')
 */
export type AlgebraicSquare = string;

/**
 * File (column) letter
 */
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

/**
 * Rank (row) number
 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Coordinate representation of a square
 */
export interface Coordinate {
  file: File;
  rank: Rank;
}

// Quantum State

/**
 * Superposition state for a single piece
 * Maps square indices to probabilities
 * INVARIANT: Sum of all probabilities must equal 1.0
 */
export interface SuperpositionState {
  [squareIndex: number]: number; // probability at each square
}

/**
 * Unique identifier for a piece instance
 * Needed because multiple pieces of same type/color may exist
 */
export type PieceId = string;

/**
 * A piece with quantum state information
 */
export interface QuantumPiece {
  id: PieceId;
  type: PieceSymbol;
  color: Color;
  superposition: SuperpositionState; // squares where this piece exists with probabilities
  isSuperposed: boolean; // true if piece exists in multiple squares
}

/**
 * Joint state for entangled pieces
 * Maps piece positions to joint probability
 * Example: {"piece1:e4,piece2:d5": 0.6, "piece1:e2,piece2:d5": 0.4}
 */
export interface JointState {
  [jointKey: string]: number; // "pieceId:square,pieceId:square" -> probability
}

/**
 * Entanglement relationship between pieces
 * When pieces are entangled, measuring one affects the other
 * Stores joint probability distribution, not independent probabilities
 */
export interface Entanglement {
  pieceIds: PieceId[]; // pieces that are entangled
  jointStates: JointState; // joint probability distribution
  description: string; // human-readable description of the entanglement
}

// Move Types

/**
 * Types of moves possible in quantum chess
 */
export type MoveType = 'normal' | 'capture' | 'split' | 'merge' | 'castling' | 'en-passant' | 'promotion';

/**
 * Base move interface
 */
export interface BaseMove {
  type: MoveType;
  pieceId: PieceId;
  from: SquareIndex;
}

/**
 * Normal move (including captures)
 */
export interface NormalMove extends BaseMove {
  type: 'normal' | 'capture';
  to: SquareIndex;
  capturedPieceId?: PieceId; // if capture
}

/**
 * Split move - creates superposition
 */
export interface SplitMove extends BaseMove {
  type: 'split';
  to1: SquareIndex;
  to2: SquareIndex;
  probability?: number; // default 0.5 for each target
}

/**
 * Merge move - combines superposed copies
 */
export interface MergeMove {
  type: 'merge';
  pieceId: PieceId;
  from1: SquareIndex;
  from2: SquareIndex;
  to: SquareIndex;
}

/**
 * Castling move
 */
export interface CastlingMove extends BaseMove {
  type: 'castling';
  to: SquareIndex;
  rookFrom: SquareIndex;
  rookTo: SquareIndex;
  side: 'kingside' | 'queenside';
}

/**
 * En passant capture
 */
export interface EnPassantMove extends BaseMove {
  type: 'en-passant';
  to: SquareIndex;
  capturedPawnSquare: SquareIndex;
  capturedPieceId: PieceId;
}

/**
 * Pawn promotion
 */
export interface PromotionMove extends BaseMove {
  type: 'promotion';
  to: SquareIndex;
  promoteTo: PieceSymbol; // Q, R, B, or N
  capturedPieceId?: PieceId; // if capturing during promotion
}

/**
 * Union type for all possible moves
 */
export type Move = NormalMove | SplitMove | MergeMove | CastlingMove | EnPassantMove | PromotionMove;

/**
 * Move with additional metadata for history
 */
export interface MoveHistoryEntry {
  move: Move;
  notation: string; // human-readable move notation
  timestamp: number;
  boardStateBeforeMove?: string; // FEN-like string (optional for undo)
  measurementOccurred?: boolean;
  measurementResult?: MeasurementResult;
}

// Measurement

/**
 * Result of a quantum measurement
 */
export interface MeasurementResult {
  pieceId: PieceId;
  questionSquare: SquareIndex; // "Is the piece at this square?"
  result: boolean; // true = piece found at square, false = not found
  probabilityBefore: number; // probability at questioned square before measurement
  collapsedTo?: SquareIndex; // where the piece actually collapsed (if result = true, same as questionSquare)
}

// Game State

/**
 * Castling rights for a player
 */
export interface CastlingRights {
  kingside: boolean;
  queenside: boolean;
}

/**
 * En passant target square information
 */
export interface EnPassantTarget {
  square: SquareIndex; // square where en passant capture can occur
  pawnSquare: SquareIndex; // square where the capturable pawn is
  pawnId: PieceId; // ID of the capturable pawn
}

/**
 * Game status
 */
export type GameStatus = 'active' | 'white-wins' | 'black-wins' | 'draw';

/**
 * Complete board state
 */
export interface BoardState {
  pieces: QuantumPiece[];
  activeColor: Color;
  castlingRights: {
    white: CastlingRights;
    black: CastlingRights;
  };
  enPassantTarget: EnPassantTarget | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  entanglements?: Entanglement[];
}

/**
 * Complete game state
 */
export interface GameState {
  board: BoardState;
  status: GameStatus;
  moveHistory: MoveHistoryEntry[];
  capturedPieces: QuantumPiece[];
  entanglements: Entanglement[];
  selectedSquare: SquareIndex | null; // currently selected square
  legalMoves: Move[]; // legal moves for selected piece
  boardStateHistory: BoardState[]; // history of board states for navigation
  currentMoveIndex: number; // -1 = before any moves, 0 = after first move, etc.
}

// UI State

/**
 * Square highlight type
 */
export type SquareHighlight = 'selected' | 'legal-move' | 'last-move' | 'check' | 'quantum';

/**
 * Visual state for a square
 */
export interface SquareVisualState {
  highlight?: SquareHighlight;
  showProbability?: boolean;
  probability?: number;
}

// Configuration

/**
 * Game settings/options
 */
export interface GameOptions {
  showProbabilities: boolean; // show probability percentages
  animationSpeed: number; // 0.5 = slow, 1 = normal, 2 = fast
  allowUndo: boolean;
  quantumMovesEnabled: boolean; // allow split/merge moves
}

// Helper Types

/**
 * Direction vectors for piece movement
 */
export interface Direction {
  fileOffset: number; // -1, 0, or 1
  rankOffset: number; // -1, 0, or 1
}

/**
 * Result of move validation
 */
export interface MoveValidationResult {
  isLegal: boolean;
  reason?: string; // why move is illegal (if applicable)
  requiresMeasurement?: boolean; // if measurement needed before move
  measurementSquare?: SquareIndex; // which square to measure
}

/**
 * Classical board representation (for compatibility)
 * 64 element array, null for empty squares
 */
export type ClassicalBoard = (PieceType | null)[];
