/**
 * Quantum-Inspired Logic
 * Uses classical probability, not real quantum mechanics
 */

import type {
  QuantumPiece,
  SuperpositionState,
  MeasurementResult,
  SquareIndex,
  BoardState,
  Entanglement,
} from '@/lib/types';
import {
  normalizeProbabilities,
  weightedRandomChoice,
} from './utils';
import {
  getPieceById,
  updatePieceSuperposition,
  cloneBoardState,
} from './state';

// Split Move - Create Superposition

/** Split piece into superposition (can work on already superposed pieces) */
export function splitMove(
  piece: QuantumPiece,
  fromSquare: SquareIndex,
  toSquare1: SquareIndex,
  toSquare2: SquareIndex,
  probability1: number = 0.5
): SuperpositionState {
  // Get probability at source square
  const sourceProb = piece.superposition[fromSquare] || 0;
  
  if (sourceProb === 0) {
    throw new Error('Cannot split piece from square where it has no probability');
  }
  
  if (probability1 <= 0 || probability1 >= 1) {
    throw new Error('Split probability must be between 0 and 1');
  }
  
  if (toSquare1 === toSquare2) {
    throw new Error('Cannot split to the same square twice');
  }
  
  // Create new superposition - remove from source and split to two targets
  const newSuperposition: SuperpositionState = { ...piece.superposition };
  
  // Remove probability from source square
  delete newSuperposition[fromSquare];
  
  // Add split probabilities to target squares
  // Each target gets a fraction of the original source probability
  const prob1 = sourceProb * probability1;
  const prob2 = sourceProb * (1 - probability1);
  
  newSuperposition[toSquare1] = (newSuperposition[toSquare1] || 0) + prob1;
  newSuperposition[toSquare2] = (newSuperposition[toSquare2] || 0) + prob2;
  
  return normalizeProbabilities(newSuperposition);
}

// Merge Move - Combine Superposition

/** Merge two superposed copies into one location */
export function mergeMove(
  piece: QuantumPiece,
  fromSquare1: SquareIndex,
  fromSquare2: SquareIndex,
  toSquare: SquareIndex
): SuperpositionState {
  const prob1 = piece.superposition[fromSquare1] || 0;
  const prob2 = piece.superposition[fromSquare2] || 0;
  
  if (prob1 === 0 || prob2 === 0) {
    throw new Error('Cannot merge from squares where piece does not exist');
  }
  
  // Create new superposition with merged probability at target
  const newSuperposition: SuperpositionState = {};
  
  // Copy other probabilities (pieces at other squares not involved in merge)
  for (const [square, prob] of Object.entries(piece.superposition)) {
    const sq = parseInt(square);
    if (sq !== fromSquare1 && sq !== fromSquare2) {
      newSuperposition[sq] = prob;
    }
  }
  
  // Add merged probability at target
  newSuperposition[toSquare] = prob1 + prob2;
  
  // Normalize (should already be normalized, but ensure it)
  return normalizeProbabilities(newSuperposition);
}

// Measurement - Quantum Collapse

/** Measure if piece is at square, collapse superposition */
export function measureAndCollapse(
  piece: QuantumPiece,
  questionSquare: SquareIndex
): MeasurementResult {
  const probabilityAtSquare = piece.superposition[questionSquare] || 0;
  
  if (probabilityAtSquare === 0) {
    // Piece definitely not at this square - no collapse needed
    return {
      pieceId: piece.id,
      questionSquare,
      result: false,
      probabilityBefore: 0,
    };
  }
  
  if (probabilityAtSquare === 1.0) {
    // Piece is certainly at this square - already collapsed
    return {
      pieceId: piece.id,
      questionSquare,
      result: true,
      probabilityBefore: 1.0,
      collapsedTo: questionSquare,
    };
  }
  
  // Perform weighted random measurement
  const collapsedSquare = weightedRandomChoice(piece.superposition);
  const result = collapsedSquare === questionSquare;
  
  return {
    pieceId: piece.id,
    questionSquare,
    result,
    probabilityBefore: probabilityAtSquare,
    collapsedTo: collapsedSquare,
  };
}

/**
 * Apply measurement result to piece (collapse superposition)
 */
export function applyMeasurement(
  piece: QuantumPiece,
  measurement: MeasurementResult
): QuantumPiece {
  if (!measurement.collapsedTo) {
    // No collapse needed
    return piece;
  }
  
  return {
    ...piece,
    superposition: { [measurement.collapsedTo]: 1.0 },
    isSuperposed: false,
  };
}

/**
 * Measure a piece on the board (updates board state)
 */
export function measurePieceOnBoard(
  board: BoardState,
  pieceId: string,
  questionSquare: SquareIndex
): { board: BoardState; measurement: MeasurementResult } {
  const piece = getPieceById(board, pieceId);
  if (!piece) {
    throw new Error(`Piece ${pieceId} not found`);
  }
  
  const measurement = measureAndCollapse(piece, questionSquare);
  
  if (measurement.collapsedTo) {
    const collapsedPiece = applyMeasurement(piece, measurement);
    const newBoard = updatePieceSuperposition(board, pieceId, collapsedPiece.superposition);
    return { board: newBoard, measurement };
  }
  
  return { board, measurement };
}

// Entanglement - Piece Dependencies

/** Create entanglement between pieces */
export function entangleSquares(
  board: BoardState,
  pieceIds: string[],
  description: string
): BoardState {
  const newBoard = cloneBoardState(board);
  
  const entanglement: Entanglement = {
    pieceIds,
    description,
  };
  
  newBoard.entanglements = [...(board.entanglements || []), entanglement];
  
  return newBoard;
}

/**
 * Check if two pieces are entangled
 */
export function arePiecesEntangled(
  board: BoardState,
  pieceId1: string,
  pieceId2: string
): boolean {
  if (!board.entanglements) return false;
  
  return board.entanglements.some((e: Entanglement) => 
    e.pieceIds.includes(pieceId1) && e.pieceIds.includes(pieceId2)
  );
}

/**
 * Get all pieces entangled with a given piece
 */
export function getEntangledPieces(
  board: BoardState,
  pieceId: string
): string[] {
  if (!board.entanglements) return [];
  
  const entangledIds = new Set<string>();
  
  for (const entanglement of board.entanglements) {
    if (entanglement.pieceIds.includes(pieceId)) {
      entanglement.pieceIds.forEach((id: string) => {
        if (id !== pieceId) {
          entangledIds.add(id);
        }
      });
    }
  }
  
  return Array.from(entangledIds);
}

/**
 * Remove entanglements involving a specific piece
 * Called when piece is captured or fully collapsed
 */
export function removeEntanglement(
  board: BoardState,
  pieceId: string
): BoardState {
  const newBoard = cloneBoardState(board);
  
  if (!newBoard.entanglements) return newBoard;
  
  newBoard.entanglements = newBoard.entanglements.filter((e: Entanglement) => 
    !e.pieceIds.includes(pieceId)
  );
  
  return newBoard;
}

// Probability Helpers

/** Calculate probability that path is clear */
export function calculatePathClearProbability(
  board: BoardState,
  pathSquares: SquareIndex[]
): number {
  let probability = 1.0;
  
  for (const square of pathSquares) {
    // Get probability that square is occupied
    let occupancyProb = 0;
    for (const piece of board.pieces) {
      occupancyProb += piece.superposition[square] || 0;
    }
    
    // Probability path is clear through this square
    probability *= (1 - occupancyProb);
  }
  
  return probability;
}

/**
 * Calculate probability of successful capture
 * Both attacker and target must exist at their respective squares
 */
export function calculateCaptureProbability(
  attacker: QuantumPiece,
  attackerSquare: SquareIndex,
  target: QuantumPiece,
  targetSquare: SquareIndex
): number {
  const attackerProb = attacker.superposition[attackerSquare] || 0;
  const targetProb = target.superposition[targetSquare] || 0;
  
  return attackerProb * targetProb;
}

// Superposition Helpers

/** Check if piece needs measurement before move */
export function requiresMeasurement(piece: QuantumPiece, fromSquare: SquareIndex): boolean {
  return piece.superposition[fromSquare] !== 1.0;
}

/**
 * Get all squares where a piece has non-zero probability
 */
export function getOccupiedSquares(piece: QuantumPiece): SquareIndex[] {
  return Object.keys(piece.superposition)
    .map(s => parseInt(s))
    .filter(square => piece.superposition[square] > 0);
}

/**
 * Create a classical move (probability = 1.0 at target)
 */
export function classicalMove(
  piece: QuantumPiece,
  toSquare: SquareIndex
): SuperpositionState {
  return { [toSquare]: 1.0 };
}

/**
 * Update piece probability after partial removal
 * Used when one "copy" of a superposed piece is captured
 */
export function removeSquareFromSuperposition(
  superposition: SuperpositionState,
  removeSquare: SquareIndex
): SuperpositionState {
  const newSuperposition: SuperpositionState = {};
  
  for (const [square, prob] of Object.entries(superposition)) {
    const sq = parseInt(square);
    if (sq !== removeSquare) {
      newSuperposition[sq] = prob;
    }
  }
  
  // Renormalize remaining probabilities
  return normalizeProbabilities(newSuperposition);
}

/**
 * Check if move would violate No Double Occupancy rule
 * Returns true if moving would place two different pieces at same square
 */
export function wouldViolateDoubleOccupancy(
  board: BoardState,
  movingPieceId: string,
  targetSquare: SquareIndex
): boolean {
  // Check if any OTHER piece is certain at target square
  for (const piece of board.pieces) {
    if (piece.id === movingPieceId) continue;
    
    if (piece.superposition[targetSquare] === 1.0) {
      return true; // Another piece is definitely there
    }
  }
  
  return false;
}

/**
 * Get probability distribution for all pieces at a square
 * Used for UI display and validation
 */
export function getSquareProbabilityDistribution(
  board: BoardState,
  square: SquareIndex
): { pieceId: string; probability: number }[] {
  const distribution: { pieceId: string; probability: number }[] = [];
  
  for (const piece of board.pieces) {
    const prob = piece.superposition[square] || 0;
    if (prob > 0) {
      distribution.push({ pieceId: piece.id, probability: prob });
    }
  }
  
  return distribution;
}
