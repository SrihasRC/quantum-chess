/**
 * Engine Utilities
 * Coordinate conversion, probability calculations, etc.
 */

import type {
  SquareIndex,
  AlgebraicSquare,
  File,
  Rank,
  Coordinate,
  Color,
  PieceType,
  PieceSymbol,
  SuperpositionState,
} from '@/lib/types';

// Coordinate Conversion

const FILES: File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Convert square index (0-63) to algebraic notation (e.g., 0 -> 'a1')
 */
export function indexToAlgebraic(index: SquareIndex): AlgebraicSquare {
  if (index < 0 || index > 63) {
    throw new Error(`Invalid square index: ${index}`);
  }
  const file = FILES[index % 8];
  const rank = RANKS[Math.floor(index / 8)];
  return `${file}${rank}`;
}

/**
 * Convert algebraic notation to square index (e.g., 'e4' -> 28)
 */
export function algebraicToIndex(algebraic: AlgebraicSquare): SquareIndex {
  if (algebraic.length !== 2) {
    throw new Error(`Invalid algebraic notation: ${algebraic}`);
  }
  const file = algebraic[0] as File;
  const rank = parseInt(algebraic[1]) as Rank;
  
  const fileIndex = FILES.indexOf(file);
  const rankIndex = RANKS.indexOf(rank);
  
  if (fileIndex === -1 || rankIndex === -1) {
    throw new Error(`Invalid algebraic notation: ${algebraic}`);
  }
  
  return rankIndex * 8 + fileIndex;
}

/**
 * Convert square index to coordinate
 */
export function indexToCoordinate(index: SquareIndex): Coordinate {
  if (index < 0 || index > 63) {
    throw new Error(`Invalid square index: ${index}`);
  }
  return {
    file: FILES[index % 8],
    rank: RANKS[Math.floor(index / 8)],
  };
}

/**
 * Convert coordinate to square index
 */
export function coordinateToIndex(coord: Coordinate): SquareIndex {
  const fileIndex = FILES.indexOf(coord.file);
  const rankIndex = RANKS.indexOf(coord.rank);
  
  if (fileIndex === -1 || rankIndex === -1) {
    throw new Error(`Invalid coordinate: ${JSON.stringify(coord)}`);
  }
  
  return rankIndex * 8 + fileIndex;
}

/**
 * Get file index (0-7) from square index
 */
export function getFile(index: SquareIndex): number {
  return index % 8;
}

/**
 * Get rank index (0-7) from square index
 */
export function getRank(index: SquareIndex): number {
  return Math.floor(index / 8);
}

/**
 * Check if a square index is valid (0-63)
 */
export function isValidSquare(index: number): index is SquareIndex {
  return index >= 0 && index <= 63;
}

/**
 * Check if coordinates are on the board
 */
export function isOnBoard(file: number, rank: number): boolean {
  return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
}

/**
 * Get square from file and rank indices
 */
export function getSquareFromFileRank(file: number, rank: number): SquareIndex | null {
  if (!isOnBoard(file, rank)) return null;
  return rank * 8 + file;
}

// Piece Utilities

/**
 * Get the color of a piece type
 */
export function getPieceColor(pieceType: PieceType): Color {
  return pieceType === pieceType.toUpperCase() ? 'white' : 'black';
}

/**
 * Get piece symbol without color (uppercase)
 */
export function getPieceSymbol(pieceType: PieceType): PieceSymbol {
  return pieceType.toUpperCase() as PieceSymbol;
}

/**
 * Get piece type from symbol and color
 */
export function getPieceType(symbol: PieceSymbol, color: Color): PieceType {
  return (color === 'white' ? symbol.toUpperCase() : symbol.toLowerCase()) as PieceType;
}

/**
 * Get opposite color
 */
export function oppositeColor(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

/**
 * Check if piece is a pawn
 */
export function isPawn(pieceType: PieceType): boolean {
  return pieceType.toLowerCase() === 'p';
}

/**
 * Check if piece is a knight
 */
export function isKnight(pieceType: PieceType): boolean {
  return pieceType.toLowerCase() === 'n';
}

/**
 * Check if piece is a bishop
 */
export function isBishop(pieceType: PieceType): boolean {
  return pieceType.toLowerCase() === 'b';
}

/**
 * Check if piece is a rook
 */
export function isRook(pieceType: PieceType): boolean {
  return pieceType.toLowerCase() === 'r';
}

/**
 * Check if piece is a queen
 */
export function isQueen(pieceType: PieceType): boolean {
  return pieceType.toLowerCase() === 'q';
}

/**
 * Check if piece is a king
 */
export function isKing(pieceType: PieceType): boolean {
  return pieceType.toLowerCase() === 'k';
}

/**
 * Check if piece is a sliding piece (bishop, rook, or queen)
 */
export function isSlidingPiece(pieceType: PieceType): boolean {
  const symbol = pieceType.toLowerCase();
  return symbol === 'b' || symbol === 'r' || symbol === 'q';
}

// Probability Utilities

/**
 * Normalize probabilities to sum to 1.0
 */
export function normalizeProbabilities(superposition: SuperpositionState): SuperpositionState {
  const sum = Object.values(superposition).reduce((acc, p) => acc + p, 0);
  
  if (sum === 0) {
    throw new Error('Cannot normalize probabilities that sum to zero');
  }
  
  if (Math.abs(sum - 1.0) < 1e-10) {
    return superposition; // already normalized
  }
  
  const normalized: SuperpositionState = {};
  for (const [square, prob] of Object.entries(superposition)) {
    normalized[parseInt(square)] = prob / sum;
  }
  
  return normalized;
}

/**
 * Check if probabilities sum to 1.0 (within tolerance)
 */
export function isProbabilityValid(superposition: SuperpositionState): boolean {
  const sum = Object.values(superposition).reduce((acc, p) => acc + p, 0);
  return Math.abs(sum - 1.0) < 1e-10;
}

/**
 * Get total probability for a piece
 */
export function getTotalProbability(superposition: SuperpositionState): number {
  return Object.values(superposition).reduce((acc, p) => acc + p, 0);
}

/**
 * Check if a piece is in superposition (exists in multiple squares)
 */
export function isInSuperposition(superposition: SuperpositionState): boolean {
  const squares = Object.keys(superposition);
  return squares.length > 1;
}

/**
 * Get the square with highest probability for a piece
 */
export function getMostLikelySquare(superposition: SuperpositionState): SquareIndex | null {
  let maxProb = -1;
  let maxSquare: SquareIndex | null = null;
  
  for (const [square, prob] of Object.entries(superposition)) {
    if (prob > maxProb) {
      maxProb = prob;
      maxSquare = parseInt(square);
    }
  }
  
  return maxSquare;
}

/**
 * Perform weighted random selection based on probabilities
 * Used for quantum measurement/collapse
 */
export function weightedRandomChoice(superposition: SuperpositionState): SquareIndex {
  const total = getTotalProbability(superposition);
  let random = Math.random() * total;
  
  for (const [square, prob] of Object.entries(superposition)) {
    random -= prob;
    if (random <= 0) {
      return parseInt(square);
    }
  }
  
  // Fallback (shouldn't reach here if probabilities are valid)
  const squares = Object.keys(superposition);
  return parseInt(squares[squares.length - 1]);
}

// Board Utilities

/**
 * Get all squares between two squares (exclusive)
 * Returns empty array if squares are not on same rank, file, or diagonal
 */
export function getSquaresBetween(from: SquareIndex, to: SquareIndex): SquareIndex[] {
  const fromFile = getFile(from);
  const fromRank = getRank(from);
  const toFile = getFile(to);
  const toRank = getRank(to);
  
  const fileDiff = toFile - fromFile;
  const rankDiff = toRank - fromRank;
  
  // Not on same line
  if (fileDiff !== 0 && rankDiff !== 0 && Math.abs(fileDiff) !== Math.abs(rankDiff)) {
    return [];
  }
  
  const squares: SquareIndex[] = [];
  const steps = Math.max(Math.abs(fileDiff), Math.abs(rankDiff));
  const fileStep = fileDiff === 0 ? 0 : fileDiff / Math.abs(fileDiff);
  const rankStep = rankDiff === 0 ? 0 : rankDiff / Math.abs(rankDiff);
  
  for (let i = 1; i < steps; i++) {
    const file = fromFile + i * fileStep;
    const rank = fromRank + i * rankStep;
    const square = getSquareFromFileRank(file, rank);
    if (square !== null) {
      squares.push(square);
    }
  }
  
  return squares;
}

/**
 * Calculate Manhattan distance between two squares
 */
export function getManhattanDistance(from: SquareIndex, to: SquareIndex): number {
  const fileDist = Math.abs(getFile(from) - getFile(to));
  const rankDist = Math.abs(getRank(from) - getRank(to));
  return fileDist + rankDist;
}

/**
 * Calculate Chebyshev distance (king distance) between two squares
 */
export function getChebyshevDistance(from: SquareIndex, to: SquareIndex): number {
  const fileDist = Math.abs(getFile(from) - getFile(to));
  const rankDist = Math.abs(getRank(from) - getRank(to));
  return Math.max(fileDist, rankDist);
}

/**
 * Check if two squares are on the same file
 */
export function isSameFile(sq1: SquareIndex, sq2: SquareIndex): boolean {
  return getFile(sq1) === getFile(sq2);
}

/**
 * Check if two squares are on the same rank
 */
export function isSameRank(sq1: SquareIndex, sq2: SquareIndex): boolean {
  return getRank(sq1) === getRank(sq2);
}

/**
 * Check if two squares are on the same diagonal
 */
export function isSameDiagonal(sq1: SquareIndex, sq2: SquareIndex): boolean {
  const fileDiff = Math.abs(getFile(sq1) - getFile(sq2));
  const rankDiff = Math.abs(getRank(sq1) - getRank(sq2));
  return fileDiff === rankDiff && fileDiff > 0;
}

// Move Notation

/**
 * Convert move to simple human-readable notation
 */
export function formatMoveSimple(from: SquareIndex, to: SquareIndex, piece: PieceSymbol): string {
  return `${piece}${indexToAlgebraic(from)}-${indexToAlgebraic(to)}`;
}

/**
 * Convert move to capture notation
 */
export function formatCaptureSimple(from: SquareIndex, to: SquareIndex, piece: PieceSymbol): string {
  return `${piece}${indexToAlgebraic(from)}x${indexToAlgebraic(to)}`;
}

// Random Utilities

/**
 * Generate a random piece ID
 */
export function generatePieceId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
