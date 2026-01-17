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
import { getSquaresBetween } from './utils';

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
 * Following the paper's Split Slide Unitary specification:
 * - Both paths clear: Full split (target1: split%, target2: (1-split)%)
 * - Path 1 blocked, path 2 clear: Full iSwap to target2
 * - Path 1 clear, path 2 blocked: Full iSwap to target1
 * - Both paths blocked: Identity (stay at source)
 * 
 * Joint states created based on path blocking probabilities
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
  
  // Determine which paths are blocked
  // If we have one blocker, it might block one or both paths
  // If we have two blockers, each blocks a different path
  let path1BlockProb = 0;
  let path2BlockProb = 0;
  const involvedPieces = new Set<string>([movingPieceId]);
  
  if (blockingPieceIds.length === 1) {
    // Single blocker - determine which path(s) it blocks
    const blockSquare = blockSquares[0];
    const blockProb = blockProbabilities[0];
    involvedPieces.add(blockingPieceIds[0]);
    
    // Check if blocker is in path 1 (source to target1)
    const path1 = getSquaresBetween(sourceSquare, target1);
    if (path1.includes(blockSquare)) {
      path1BlockProb = blockProb;
    }
    
    // Check if blocker is in path 2 (source to target2)
    const path2 = getSquaresBetween(sourceSquare, target2);
    if (path2.includes(blockSquare)) {
      path2BlockProb = blockProb;
    }
  } else {
    // Two blockers - assign to respective paths
    path1BlockProb = blockProbabilities[0];
    path2BlockProb = blockProbabilities[1];
    involvedPieces.add(blockingPieceIds[0]);
    involvedPieces.add(blockingPieceIds[1]);
  }
  
  const jointStates: JointState = {};
  
  // Get all involved pieces and their current superpositions
  const pieceStates = new Map<string, SuperpositionState>();
  for (const pieceId of involvedPieces) {
    const piece = getPieceById(board, pieceId);
    if (piece) pieceStates.set(pieceId, piece.superposition);
  }
  
  // Apply Split Slide Unitary logic based on path blocking
  if (blockingPieceIds.length === 1) {
    // Single blocker - enumerate all its positions
    const blockingPieceId = blockingPieceIds[0];
    const blockingPiece = getPieceById(board, blockingPieceId);
    if (!blockingPiece) throw new Error('Blocking piece not found');
    
    for (const [sq, blockerProb] of Object.entries(blockingPiece.superposition)) {
      const blockerSquare = parseInt(sq);
      const blockSquare = blockSquares[0];
      
      // Determine effective path blocking for this blocker position
      const path1Blocked = blockerSquare === blockSquare && path1BlockProb > 0;
      const path2Blocked = blockerSquare === blockSquare && path2BlockProb > 0;
      
      if (!path1Blocked && !path2Blocked) {
        // Both paths clear: Full split
        const positions1 = new Map<string, SquareIndex>();
        positions1.set(movingPieceId, target1);
        positions1.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions1)] = splitRatio * blockerProb;
        
        const positions2 = new Map<string, SquareIndex>();
        positions2.set(movingPieceId, target2);
        positions2.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions2)] = (1 - splitRatio) * blockerProb;
      } else if (path1Blocked && !path2Blocked) {
        // Path 1 blocked, path 2 clear: iSwap to target2
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, target2);
        positions.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions)] = blockerProb;
      } else if (!path1Blocked && path2Blocked) {
        // Path 1 clear, path 2 blocked: iSwap to target1
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, target1);
        positions.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions)] = blockerProb;
      } else {
        // Both paths blocked: Identity (stay at source)
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, sourceSquare);
        positions.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions)] = blockerProb;
      }
    }
  } else if (blockingPieceIds.length === 2) {
    // Two blockers - one per path
    const blocker1Id = blockingPieceIds[0];
    const blocker2Id = blockingPieceIds[1];
    const blocker1 = getPieceById(board, blocker1Id);
    const blocker2 = getPieceById(board, blocker2Id);
    if (!blocker1 || !blocker2) throw new Error('Blocking piece not found');
    
    // Enumerate all combinations of blocker positions
    for (const [sq1, prob1] of Object.entries(blocker1.superposition)) {
      const blocker1Square = parseInt(sq1);
      const path1Blocked = blocker1Square === blockSquares[0];
      
      for (const [sq2, prob2] of Object.entries(blocker2.superposition)) {
        const blocker2Square = parseInt(sq2);
        const path2Blocked = blocker2Square === blockSquares[1];
        const combinedProb = prob1 * prob2;
        
        if (!path1Blocked && !path2Blocked) {
          // Both paths clear: Full split
          const positions1 = new Map<string, SquareIndex>();
          positions1.set(movingPieceId, target1);
          positions1.set(blocker1Id, blocker1Square);
          positions1.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(positions1)] = splitRatio * combinedProb;
          
          const positions2 = new Map<string, SquareIndex>();
          positions2.set(movingPieceId, target2);
          positions2.set(blocker1Id, blocker1Square);
          positions2.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(positions2)] = (1 - splitRatio) * combinedProb;
        } else if (path1Blocked && !path2Blocked) {
          // Path 1 blocked, path 2 clear: iSwap to target2
          const positions = new Map<string, SquareIndex>();
          positions.set(movingPieceId, target2);
          positions.set(blocker1Id, blocker1Square);
          positions.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(positions)] = combinedProb;
        } else if (!path1Blocked && path2Blocked) {
          // Path 1 clear, path 2 blocked: iSwap to target1
          const positions = new Map<string, SquareIndex>();
          positions.set(movingPieceId, target1);
          positions.set(blocker1Id, blocker1Square);
          positions.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(positions)] = combinedProb;
        } else {
          // Both paths blocked: Identity (stay at source)
          const positions = new Map<string, SquareIndex>();
          positions.set(movingPieceId, sourceSquare);
          positions.set(blocker1Id, blocker1Square);
          positions.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(positions)] = combinedProb;
        }
      }
    }
  }
  
  const entanglement: Entanglement = {
    pieceIds: Array.from(involvedPieces),
    jointStates,
    description: `${movingPiece.type} splitting with path entanglement`,
  };
  
  newBoard.entanglements = [...(board.entanglements || []), entanglement];
  
  return { board: newBoard, entanglement };
}

/**
 * Create entanglement for merge move through superposition
 * Following the paper's Merge Slide Unitary specification:
 * - Both paths clear: Full merge (target: 100%)
 * - Path 1 blocked, path 2 clear: iSwap† from s2 to target
 * - Path 1 clear, path 2 blocked: iSwap† from s1 to target
 * - Both paths blocked: Identity (pieces stay at sources)
 * 
 * Joint states created based on path blocking probabilities
 */
export function createMergeEntanglement(
  board: BoardState,
  movingPieceId: string,
  source1: SquareIndex,
  source2: SquareIndex,
  targetSquare: SquareIndex,
  blockingPieceIds: string[],
  blockSquares: SquareIndex[],
  blockProbabilities: number[]
): { board: BoardState; entanglement: Entanglement | null } {
  if (blockingPieceIds.length === 0) {
    return { board, entanglement: null }; // No entanglement needed
  }
  
  const newBoard = cloneBoardState(board);
  const movingPiece = getPieceById(board, movingPieceId);
  if (!movingPiece) throw new Error('Moving piece not found');
  
  // Get probabilities at source squares
  const prob1 = movingPiece.superposition[source1] || 0;
  const prob2 = movingPiece.superposition[source2] || 0;
  
  // Determine which paths are blocked
  let path1BlockProb = 0;
  let path2BlockProb = 0;
  const involvedPieces = new Set<string>([movingPieceId]);
  
  if (blockingPieceIds.length === 1) {
    // Single blocker - determine which path(s) it blocks
    const blockSquare = blockSquares[0];
    const blockProb = blockProbabilities[0];
    involvedPieces.add(blockingPieceIds[0]);
    
    // Check if blocker is in path 1 (source1 to target)
    const path1 = getSquaresBetween(source1, targetSquare);
    if (path1.includes(blockSquare)) {
      path1BlockProb = blockProb;
    }
    
    // Check if blocker is in path 2 (source2 to target)
    const path2 = getSquaresBetween(source2, targetSquare);
    if (path2.includes(blockSquare)) {
      path2BlockProb = blockProb;
    }
  } else {
    // Two blockers - assign to respective paths
    path1BlockProb = blockProbabilities[0];
    path2BlockProb = blockProbabilities[1];
    involvedPieces.add(blockingPieceIds[0]);
    involvedPieces.add(blockingPieceIds[1]);
  }
  
  const jointStates: JointState = {};
  
  // Apply Merge Slide Unitary logic based on path blocking
  if (blockingPieceIds.length === 1) {
    // Single blocker - enumerate all its positions
    const blockingPieceId = blockingPieceIds[0];
    const blockingPiece = getPieceById(board, blockingPieceId);
    if (!blockingPiece) throw new Error('Blocking piece not found');
    
    for (const [sq, blockerProb] of Object.entries(blockingPiece.superposition)) {
      const blockerSquare = parseInt(sq);
      const blockSquare = blockSquares[0];
      
      // Determine effective path blocking for this blocker position
      const path1Blocked = blockerSquare === blockSquare && path1BlockProb > 0;
      const path2Blocked = blockerSquare === blockSquare && path2BlockProb > 0;
      
      if (!path1Blocked && !path2Blocked) {
        // Both paths clear: Full merge to target
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, targetSquare);
        positions.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions)] = blockerProb;
      } else if (path1Blocked && !path2Blocked) {
        // Path 1 blocked, path 2 clear: Move from s2 to target
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, targetSquare);
        positions.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions)] = prob2 * blockerProb;
        
        // s1 stays at source1
        const positions1 = new Map<string, SquareIndex>();
        positions1.set(movingPieceId, source1);
        positions1.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions1)] = prob1 * blockerProb;
      } else if (!path1Blocked && path2Blocked) {
        // Path 1 clear, path 2 blocked: Move from s1 to target
        const positions = new Map<string, SquareIndex>();
        positions.set(movingPieceId, targetSquare);
        positions.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions)] = prob1 * blockerProb;
        
        // s2 stays at source2
        const positions2 = new Map<string, SquareIndex>();
        positions2.set(movingPieceId, source2);
        positions2.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions2)] = prob2 * blockerProb;
      } else {
        // Both paths blocked: Identity (stay at sources)
        const positions1 = new Map<string, SquareIndex>();
        positions1.set(movingPieceId, source1);
        positions1.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions1)] = prob1 * blockerProb;
        
        const positions2 = new Map<string, SquareIndex>();
        positions2.set(movingPieceId, source2);
        positions2.set(blockingPieceId, blockerSquare);
        jointStates[createJointKey(positions2)] = prob2 * blockerProb;
      }
    }
  } else if (blockingPieceIds.length === 2) {
    // Two blockers - one per path
    const blocker1Id = blockingPieceIds[0];
    const blocker2Id = blockingPieceIds[1];
    const blocker1 = getPieceById(board, blocker1Id);
    const blocker2 = getPieceById(board, blocker2Id);
    if (!blocker1 || !blocker2) throw new Error('Blocking piece not found');
    
    // Enumerate all combinations of blocker positions
    for (const [sq1, bprob1] of Object.entries(blocker1.superposition)) {
      const blocker1Square = parseInt(sq1);
      const path1Blocked = blocker1Square === blockSquares[0];
      
      for (const [sq2, bprob2] of Object.entries(blocker2.superposition)) {
        const blocker2Square = parseInt(sq2);
        const path2Blocked = blocker2Square === blockSquares[1];
        const combinedProb = bprob1 * bprob2;
        
        if (!path1Blocked && !path2Blocked) {
          // Both paths clear: Full merge to target
          const positions = new Map<string, SquareIndex>();
          positions.set(movingPieceId, targetSquare);
          positions.set(blocker1Id, blocker1Square);
          positions.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(positions)] = combinedProb;
        } else if (path1Blocked && !path2Blocked) {
          // Path 1 blocked, path 2 clear: Move from s2 to target, s1 stays
          const posTarget = new Map<string, SquareIndex>();
          posTarget.set(movingPieceId, targetSquare);
          posTarget.set(blocker1Id, blocker1Square);
          posTarget.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(posTarget)] = prob2 * combinedProb;
          
          const posSource1 = new Map<string, SquareIndex>();
          posSource1.set(movingPieceId, source1);
          posSource1.set(blocker1Id, blocker1Square);
          posSource1.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(posSource1)] = prob1 * combinedProb;
        } else if (!path1Blocked && path2Blocked) {
          // Path 1 clear, path 2 blocked: Move from s1 to target, s2 stays
          const posTarget = new Map<string, SquareIndex>();
          posTarget.set(movingPieceId, targetSquare);
          posTarget.set(blocker1Id, blocker1Square);
          posTarget.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(posTarget)] = prob1 * combinedProb;
          
          const posSource2 = new Map<string, SquareIndex>();
          posSource2.set(movingPieceId, source2);
          posSource2.set(blocker1Id, blocker1Square);
          posSource2.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(posSource2)] = prob2 * combinedProb;
        } else {
          // Both paths blocked: Identity (stay at sources)
          const posSource1 = new Map<string, SquareIndex>();
          posSource1.set(movingPieceId, source1);
          posSource1.set(blocker1Id, blocker1Square);
          posSource1.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(posSource1)] = prob1 * combinedProb;
          
          const posSource2 = new Map<string, SquareIndex>();
          posSource2.set(movingPieceId, source2);
          posSource2.set(blocker1Id, blocker1Square);
          posSource2.set(blocker2Id, blocker2Square);
          jointStates[createJointKey(posSource2)] = prob2 * combinedProb;
        }
      }
    }
  }
  
  const entanglement: Entanglement = {
    pieceIds: Array.from(involvedPieces),
    jointStates,
    description: `${movingPiece.type} merging with path entanglement`,
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
  
  console.log('Updating pieces from entanglement:', entanglement);
  
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
  
  console.log('Calculated marginal probabilities:', Array.from(pieceProbabilities.entries()));
  
  // Update each piece's superposition
  for (const [pieceId, superposition] of pieceProbabilities.entries()) {
    console.log(`Updating piece ${pieceId} with superposition:`, superposition);
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

/**
 * Get all entanglements involving a specific piece
 */
export function getEntanglementsInvolving(
  board: BoardState,
  pieceId: string
): Entanglement[] {
  if (!board.entanglements) return [];
  return board.entanglements.filter(e => e.pieceIds.includes(pieceId));
}

/**
 * Collapse entanglements when a piece is measured and found at a specific square
 * This updates all entangled pieces' probabilities based on the measurement outcome
 * 
 * @param board Current board state
 * @param measuredPieceId ID of piece that was measured
 * @param collapsedSquare Square where the piece was found (100% probability)
 * @returns Updated board with collapsed entanglements
 */
export function collapseEntanglements(
  board: BoardState,
  measuredPieceId: string,
  collapsedSquare: SquareIndex
): BoardState {
  let newBoard = cloneBoardState(board);
  
  console.log(`[collapseEntanglements] Called for piece ${measuredPieceId} at square ${collapsedSquare}`);
  
  if (!newBoard.entanglements || newBoard.entanglements.length === 0) {
    console.log('[collapseEntanglements] No entanglements found');
    return newBoard;
  }
  
  const affectedEntanglements = getEntanglementsInvolving(newBoard, measuredPieceId);
  
  console.log(`[collapseEntanglements] Found ${affectedEntanglements.length} affected entanglements:`, affectedEntanglements);
  
  if (affectedEntanglements.length === 0) {
    return newBoard;
  }
  
  // Process each affected entanglement
  for (const ent of affectedEntanglements) {
    console.log(`[collapseEntanglements] Processing entanglement:`, ent);
    
    // Filter joint states to only those consistent with the measurement
    const consistentStates: JointState = {};
    let totalProb = 0;
    
    for (const [key, prob] of Object.entries(ent.jointStates)) {
      const positions = parseJointKey(key);
      const measuredPos = positions.get(measuredPieceId);
      
      console.log(`[collapseEntanglements] Joint state ${key}: measured piece at ${measuredPos}, looking for ${collapsedSquare}`);
      
      if (measuredPos === collapsedSquare) {
        // This joint state is consistent with measurement
        consistentStates[key] = prob;
        totalProb += prob;
        console.log(`[collapseEntanglements] Joint state ${key} is consistent, prob=${prob}`);
      }
    }
    
    if (totalProb === 0) {
      // No consistent states - this shouldn't happen but handle gracefully
      console.warn(`No consistent states found for entanglement after measuring ${measuredPieceId} at ${collapsedSquare}`);
      continue;
    }
    
    // Renormalize the consistent states
    for (const key in consistentStates) {
      consistentStates[key] /= totalProb;
    }
    
    // Calculate marginal probabilities for each other piece in the entanglement
    for (const otherId of ent.pieceIds) {
      if (otherId === measuredPieceId) continue;
      
      const marginalProbs: SuperpositionState = {};
      
      for (const [key, prob] of Object.entries(consistentStates)) {
        const positions = parseJointKey(key);
        const square = positions.get(otherId);
        
        if (square !== undefined) {
          marginalProbs[square] = (marginalProbs[square] || 0) + prob;
        }
      }
      
      // Update the other piece's superposition with marginal probabilities
      newBoard = updatePieceSuperposition(newBoard, otherId, marginalProbs);
    }
    
    // Update or remove the entanglement
    if (Object.keys(consistentStates).length === 1) {
      // Fully collapsed - all pieces are certain, remove entanglement
      newBoard.entanglements = newBoard.entanglements.filter(e => 
        !(e.pieceIds.every(id => ent.pieceIds.includes(id)) && 
          ent.pieceIds.every(id => e.pieceIds.includes(id)))
      );
    } else {
      // Partially collapsed - update with consistent states
      const entIndex = newBoard.entanglements.findIndex(e =>
        e.pieceIds.every(id => ent.pieceIds.includes(id)) && 
        ent.pieceIds.every(id => e.pieceIds.includes(id))
      );
      
      if (entIndex !== -1) {
        newBoard.entanglements[entIndex] = {
          ...ent,
          jointStates: consistentStates,
          description: `${ent.description} [collapsed]`,
        };
      }
    }
    
    // Check for cascading collapses - if any other piece became certain (100% at one square),
    // recursively collapse its entanglements
    for (const otherId of ent.pieceIds) {
      if (otherId === measuredPieceId) continue;
      
      const otherPiece = getPieceById(newBoard, otherId);
      if (!otherPiece) continue;
      
      const squares = Object.keys(otherPiece.superposition);
      if (squares.length === 1 && otherPiece.superposition[parseInt(squares[0])] === 1.0) {
        // This piece also collapsed - recursively collapse its entanglements
        newBoard = collapseEntanglements(newBoard, otherId, parseInt(squares[0]));
      }
    }
  }
  
  return newBoard;
}
