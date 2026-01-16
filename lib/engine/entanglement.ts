/**
 * Entanglement Logic - Joint Probability Implementation
 * Based on proper quantum-inspired joint state formulation
 */

import type {
  BoardState,
  SquareIndex,
  Entanglement,
  JointState,
  SuperpositionState,
} from '@/lib/types';
import {
  getPieceById,
  updatePieceSuperposition,
  cloneBoardState,
} from './state';

/**
 * Create joint state key from piece positions
 * Format: "pieceId1:square1,pieceId2:square2"
 */
export function createJointKey(positions: Map<string, SquareIndex>): string {
  const entries = Array.from(positions.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([id, sq]) => `${id}:${sq}`).join(',');
}

/**
 * Parse joint key back to positions
 */
export function parseJointKey(key: string): Map<string, SquareIndex> {
  const positions = new Map<string, SquareIndex>();
  const parts = key.split(',');
  for (const part of parts) {
    const [id, sqStr] = part.split(':');
    positions.set(id, parseInt(sqStr));
  }
  return positions;
}

/**
 * Create entanglement for classical move through superposition
 * A moves from source to dest, B may block at square x with probability p
 * 
 * Joint states:
 * - (A=dest, B≠x) with prob (1-p)
 * - (A=source, B=x) with prob p
 */
export function createMoveEntanglement(
  board: BoardState,
  movingPieceId: string,
  sourceSquare: SquareIndex,
  destSquare: SquareIndex,
  blockingPieceId: string,
  blockSquare: SquareIndex,
  blockProbability: number
): { board: BoardState; entanglement: Entanglement } {
  const newBoard = cloneBoardState(board);
  
  const movingPiece = getPieceById(board, movingPieceId);
  const blockingPiece = getPieceById(board, blockingPieceId);
  
  if (!movingPiece || !blockingPiece) {
    throw new Error('Pieces not found for entanglement');
  }
  
  const jointStates: JointState = {};
  
  // Branch 1: Move succeeds (blocker NOT at block square)
  const successProb = 1 - blockProbability;
  if (successProb > 0) {
    // Moving piece at destination
    // Blocking piece at each of its OTHER squares (not blockSquare)
    for (const [sq, prob] of Object.entries(blockingPiece.superposition)) {
      const square = parseInt(sq);
      if (square !== blockSquare) {
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, destSquare);
        positions.set(blockingPieceId, square);
        const key = createJointKey(positions);
        jointStates[key] = successProb * prob / (1 - blockProbability); // Conditional probability
      }
    }
  }
  
  // Branch 2: Move blocked (blocker at block square)
  if (blockProbability > 0) {
    const positions = new Map<string, SquareIndex>();
    positions.set(movingPieceId, sourceSquare);
    positions.set(blockingPieceId, blockSquare);
    const key = createJointKey(positions);
    jointStates[key] = blockProbability;
  }
  
  const entanglement: Entanglement = {
    pieceIds: [movingPieceId, blockingPieceId],
    jointStates,
    description: `${movingPiece.type} moving through ${blockingPiece.type} at square ${blockSquare}`,
  };
  
  newBoard.entanglements = [...(board.entanglements || []), entanglement];
  
  return { board: newBoard, entanglement };
}

/**
 * Create entanglement for split move through superposition
 * Creates 3-way split when one or both paths are blocked
 * 
 * Joint states:
 * - (A=target1, B≠x) with prob (1-p1) * split1
 * - (A=target2, B≠x) with prob (1-p2) * split2
 * - (A=source, B at blocker) with prob (p1*split1 + p2*split2)
 */
export function createSplitEntanglement(
  board: BoardState,
  movingPieceId: string,
  sourceSquare: SquareIndex,
  target1: SquareIndex,
  target2: SquareIndex,
  blockingPieceIds: string[],
  blockSquares: SquareIndex[],
  blockProbabilities: number[],
  splitRatio: number = 0.5
): { board: BoardState; entanglement: Entanglement | null } {
  if (blockingPieceIds.length === 0) {
    return { board, entanglement: null }; // No entanglement needed
  }
  
  const newBoard = cloneBoardState(board);
  const movingPiece = getPieceById(board, movingPieceId);
  if (!movingPiece) throw new Error('Moving piece not found');
  
  // For simplicity, handle single blocker first
  // TODO: Multi-blocker entanglement
  const blockingPieceId = blockingPieceIds[0];
  const blockSquare = blockSquares[0];
  const blockProb = blockProbabilities[0];
  
  const blockingPiece = getPieceById(board, blockingPieceId);
  if (!blockingPiece) throw new Error('Blocking piece not found');
  
  const jointStates: JointState = {};
  const split1 = splitRatio;
  const split2 = 1 - splitRatio;
  
  // Branch 1: Target 1 succeeds (blocker not at block square)
  const success1Prob = (1 - blockProb) * split1;
  if (success1Prob > 0) {
    for (const [sq, prob] of Object.entries(blockingPiece.superposition)) {
      const square = parseInt(sq);
      if (square !== blockSquare) {
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, target1);
        positions.set(blockingPieceId, square);
        const key = createJointKey(positions);
        jointStates[key] = success1Prob * prob / (1 - blockProb);
      }
    }
  }
  
  // Branch 2: Target 2 succeeds (if different blocker or clear)
  const success2Prob = split2; // Assuming target2 path is clear for now
  if (success2Prob > 0) {
    for (const [sq, prob] of Object.entries(blockingPiece.superposition)) {
      const square = parseInt(sq);
      const positions = new Map<string, SquareIndex>();
      positions.set(movingPieceId, target2);
      positions.set(blockingPieceId, square);
      const key = createJointKey(positions);
      jointStates[key] = (jointStates[key] || 0) + success2Prob * prob;
    }
  }
  
  // Branch 3: Blocked - stays at source
  const blockedProb = blockProb * split1;
  if (blockedProb > 0) {
    const positions = new Map<string, SquareIndex>();
    positions.set(movingPieceId, sourceSquare);
    positions.set(blockingPieceId, blockSquare);
    const key = createJointKey(positions);
    jointStates[key] = blockedProb;
  }
  
  const entanglement: Entanglement = {
    pieceIds: [movingPieceId, blockingPieceId],
    jointStates,
    description: `${movingPiece.type} splitting through ${blockingPiece.type}`,
  };
  
  newBoard.entanglements = [...(board.entanglements || []), entanglement];
  
  return { board: newBoard, entanglement };
}

/**
 * Update piece superpositions based on entangled joint states
 * Call this after creating entanglement to sync piece probabilities
 */
export function updatePiecesFromEntanglement(
  board: BoardState,
  entanglement: Entanglement
): BoardState {
  let newBoard = cloneBoardState(board);
  
  // Calculate marginal probabilities for each piece from joint distribution
  const pieceProbabilities = new Map<string, SuperpositionState>();
  
  for (const pieceId of entanglement.pieceIds) {
    pieceProbabilities.set(pieceId, {});
  }
  
  // Sum over joint states to get marginals
  for (const [jointKey, prob] of Object.entries(entanglement.jointStates)) {
    const positions = parseJointKey(jointKey);
    
    for (const [pieceId, square] of positions.entries()) {
      const superpos = pieceProbabilities.get(pieceId)!;
      superpos[square] = (superpos[square] || 0) + prob;
    }
  }
  
  // Update each piece's superposition
  for (const [pieceId, superposition] of pieceProbabilities.entries()) {
    newBoard = updatePieceSuperposition(newBoard, pieceId, superposition);
  }
  
  return newBoard;
}

/**
 * Check if a piece is involved in any entanglement
 */
export function isPieceEntangled(board: BoardState, pieceId: string): boolean {
  if (!board.entanglements) return false;
  return board.entanglements.some(e => e.pieceIds.includes(pieceId));
}

/**
 * Get entanglement involving a specific piece
 */
export function getEntanglementForPiece(
  board: BoardState,
  pieceId: string
): Entanglement | null {
  if (!board.entanglements) return null;
  return board.entanglements.find(e => e.pieceIds.includes(pieceId)) || null;
}

/**
 * Collapse entangled pieces when one is measured
 * This is the critical measurement logic for entangled systems
 */
export function collapseEntangledMeasurement(
  board: BoardState,
  pieceId: string,
  measuredSquare: SquareIndex,
  measurementSucceeded: boolean
): BoardState {
  const entanglement = getEntanglementForPiece(board, pieceId);
  if (!entanglement) return board; // Not entangled
  
  let newBoard = cloneBoardState(board);
  
  // Filter joint states based on measurement outcome
  const newJointStates: JointState = {};
  let totalProb = 0;
  
  for (const [jointKey, prob] of Object.entries(entanglement.jointStates)) {
    const positions = parseJointKey(jointKey);
    const pieceSquare = positions.get(pieceId);
    
    const isCompatible = measurementSucceeded 
      ? pieceSquare === measuredSquare
      : pieceSquare !== measuredSquare;
    
    if (isCompatible) {
      newJointStates[jointKey] = prob;
      totalProb += prob;
    }
  }
  
  // Renormalize
  if (totalProb > 0) {
    for (const key in newJointStates) {
      newJointStates[key] /= totalProb;
    }
  }
  
  // Update the entanglement
  const updatedEntanglement: Entanglement = {
    ...entanglement,
    jointStates: newJointStates,
  };
  
  newBoard.entanglements = (board.entanglements || []).map(e =>
    e === entanglement ? updatedEntanglement : e
  );
  
  // Update all piece superpositions from new joint distribution
  newBoard = updatePiecesFromEntanglement(newBoard, updatedEntanglement);
  
  return newBoard;
}

/**
 * Remove entanglements involving a captured piece
 */
export function removeEntanglement(
  board: BoardState,
  pieceId: string
): BoardState {
  const newBoard = cloneBoardState(board);
  
  if (!newBoard.entanglements) return newBoard;
  
  newBoard.entanglements = newBoard.entanglements.filter(
    e => !e.pieceIds.includes(pieceId)
  );
  
  return newBoard;
}
