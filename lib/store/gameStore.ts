/**
 * Zustand Game Store - Single source of truth
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import type {
  GameState,
  BoardState,
  Move,
  SquareIndex,
  GameStatus,
  MoveHistoryEntry,
  NormalMove,
  SplitMove,
  MergeMove,
  SuperpositionState,
} from '@/lib/types';
import {
  createInitialBoardState,
  cloneBoardState,
  getPieceById,
  updatePieceSuperposition,
  removePiece,
  switchTurn,
  updateCastlingRights,
  setEnPassantTarget,
  getKingProbability,
  getPieceAt,
  getPiecesAtSquare,
} from '@/lib/engine/state';
import {
  generateLegalMoves,
  validateMove,
} from '@/lib/engine/moves';
import {
  splitMove as quantumSplit,
  mergeMove as quantumMerge,
  classicalMove,
  moveProbability,
  measurePieceOnBoard,
  createMoveEntanglement,
  createSplitEntanglement,
  createMergeEntanglement,
  updatePiecesFromEntanglement,
  isPieceEntangled,
  collapseEntangledMeasurement,
  removeEntanglement,
} from '@/lib/engine/quantum';
import {
  indexToAlgebraic,
  formatMoveSimple,
  formatCaptureSimple,
  getFile,
  getRank,
  getSquaresBetween,
} from '@/lib/engine/utils';
import {
  isSlidingMove,
} from '@/lib/engine/rules';

// Game Store Interface

interface GameStore extends GameState {
  // Actions
  selectPiece: (square: SquareIndex) => void;
  movePiece: (move: Move) => void;
  undoMove: () => void;
  newGame: () => void;
  resetSelection: () => void;
  
  // Navigation actions
  goToMove: (index: number) => void;
  goToFirst: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToLast: () => void;
  
  // Helper methods
  canSelectSquare: (square: SquareIndex) => boolean;
  isSquareHighlighted: (square: SquareIndex) => boolean;
}

// Initial State

function createInitialGameState(): GameState {
  const initialBoard = createInitialBoardState();
  return {
    board: initialBoard,
    status: 'active',
    moveHistory: [],
    capturedPieces: [],
    entanglements: [],
    selectedSquare: null,
    legalMoves: [],
    boardStateHistory: [cloneBoardState(initialBoard)], // Store initial board state
    currentMoveIndex: -1, // -1 means at initial position, before any moves
  };
}

// Zustand Store

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),
  
  // Select Piece
  
  selectPiece: (square: SquareIndex) => {
    const state = get();
    
    // Prevent selection when viewing history (not at latest position)
    if (state.currentMoveIndex < state.moveHistory.length - 1) {
      toast.info('Viewing history', {
        description: 'Navigate to the latest move to continue playing',
      });
      return;
    }
    
    // If clicking on already selected square, deselect
    if (state.selectedSquare === square) {
      set({
        selectedSquare: null,
        legalMoves: [],
      });
      return;
    }
    
    // Check if there's a piece at this square
    const piece = getPieceAt(state.board, square);
    let pieceAtSquare = piece;
    
    // If no classical piece, check for superposed pieces of the current player
    if (!piece) {
      const superposedPieces = getPiecesAtSquare(state.board, square);
      const playerSuperposedPieces = superposedPieces.filter(p => p.color === state.board.activeColor);
      
      if (playerSuperposedPieces.length > 0) {
        // Found superposed piece(s) - select it WITHOUT measuring yet
        // Measurement will happen when attempting to move/capture
        pieceAtSquare = playerSuperposedPieces[0];
      }
    }
    
    if (!pieceAtSquare || pieceAtSquare.color !== state.board.activeColor) {
      // No piece or enemy piece - maybe it's a move destination?
      if (state.selectedSquare !== null) {
        // Try to execute move
        const move = state.legalMoves.find(m => {
          if (m.type === 'normal' || m.type === 'capture') {
            return m.to === square;
          }
          return false;
        });
        
        if (move) {
          get().movePiece(move);
          return;
        }
      }
      
      // Deselect
      set({
        selectedSquare: null,
        legalMoves: [],
      });
      return;
    }
    
    // Check if this is the same piece at a different superposition location
    if (state.selectedSquare !== null) {
      const selectedPiece = getPieceAt(state.board, state.selectedSquare);
      let selectedPieceId = selectedPiece?.id;
      
      // If no classical piece at selected square, check for superposed pieces
      if (!selectedPiece) {
        const superposedPieces = getPiecesAtSquare(state.board, state.selectedSquare);
        const playerPieces = superposedPieces.filter(p => p.color === state.board.activeColor);
        if (playerPieces.length > 0) {
          selectedPieceId = playerPieces[0].id;
        }
      }
      
      // If clicking on the same piece at different location, treat as move destination
      if (selectedPieceId === pieceAtSquare.id) {
        const move = state.legalMoves.find(m => {
          if (m.type === 'normal' || m.type === 'capture') {
            return m.to === square;
          }
          return false;
        });
        
        if (move) {
          get().movePiece(move);
          return;
        }
      }
    }
    
    // Generate legal moves for this piece
    const legalMoves = generateLegalMoves(state.board, pieceAtSquare.id, square);
    
    set({
      selectedSquare: square,
      legalMoves,
    });
  },
  
  // Move Piece
  
  movePiece: (move: Move) => {
    const state = get();
    
    // Prevent moves when viewing history (not at latest position)
    if (state.currentMoveIndex < state.moveHistory.length - 1) {
      toast.info('Viewing history', {
        description: 'Navigate to the latest move to continue playing',
      });
      return;
    }
    
    // Validate move
    const validation = validateMove(state.board, move);
    if (!validation.isLegal) {
      console.error('Illegal move:', validation.reason);
      return;
    }
    
    // For captures: Must measure source if in superposition (per paper section 7.3)
    // This prevents double occupancy and determines if capture executes
    if (move.type === 'capture') {
      const piece = getPieceById(state.board, move.pieceId);
      
      if (piece && piece.superposition[move.from] !== 1.0) {
        let currentBoard = state.board;
        const probAtSource = piece.superposition[move.from] || 0;
        const roll = Math.random();
        
        if (roll > probAtSource) {
          // Measurement failed - attacker not at source square
          console.log('Capture measurement failed - piece not at source square');
          toast.error('Measurement Failed', {
            description: `Your ${piece.type} was not found at ${indexToAlgebraic(move.from)} (${Math.round(probAtSource * 100)}% chance). Turn lost.`,
          });
          
          // Remove probability from source and renormalize
          const newSuperposition: Record<number, number> = {};
          for (const [square, prob] of Object.entries(piece.superposition)) {
            const sq = parseInt(square);
            if (sq !== move.from) {
              newSuperposition[sq] = prob;
            }
          }
          
          const totalProb = Object.values(newSuperposition).reduce((sum, p) => sum + p, 0);
          if (totalProb > 0) {
            for (const square in newSuperposition) {
              newSuperposition[square] = newSuperposition[square] / totalProb;
            }
            currentBoard = updatePieceSuperposition(currentBoard, move.pieceId, newSuperposition);
          } else {
            currentBoard = removePiece(currentBoard, move.pieceId);
          }
          
          // Switch turn since measurement counts as the move
          const finalBoard = switchTurn(currentBoard);
          set({ 
            board: finalBoard,
            selectedSquare: null,
            legalMoves: [],
          });
          return;
        }
        
        // Measurement succeeded - collapse attacker to 100% at source
        currentBoard = updatePieceSuperposition(currentBoard, move.pieceId, { [move.from]: 1.0 });
        set({ board: currentBoard });
      }
      
      // For PAWN captures only: Also measure target if in superposition
      // Pawn capture requires BOTH source and target to be occupied (paper section 7.3.1)
      if (piece && piece.type === 'pawn' && move.capturedPieceId) {
        let currentBoard = get().board;
        const targetPiece = getPieceById(currentBoard, move.capturedPieceId);
        
        if (targetPiece && targetPiece.superposition[move.to] !== 1.0) {
          const probAtTarget = targetPiece.superposition[move.to] || 0;
          const roll = Math.random();
          
          if (roll > probAtTarget) {
            // Measurement failed - target not at capture square
            console.log('Pawn capture measurement failed - target not at capture square');
            toast.info('Capture Failed', {
              description: `Target piece was not found at ${indexToAlgebraic(move.to)} (${Math.round(probAtTarget * 100)}% chance). Pawn moves to empty diagonal.`,
            });
            
            // Partial measurement: Remove probability from target square and renormalize
            const newSuperposition: Record<number, number> = {};
            for (const [square, prob] of Object.entries(targetPiece.superposition)) {
              const sq = parseInt(square);
              if (sq !== move.to) {
                newSuperposition[sq] = prob;
              }
            }
            
            const totalProb = Object.values(newSuperposition).reduce((sum, p) => sum + p, 0);
            if (totalProb > 0) {
              for (const square in newSuperposition) {
                newSuperposition[square] = newSuperposition[square] / totalProb;
              }
              currentBoard = updatePieceSuperposition(currentBoard, move.capturedPieceId, newSuperposition);
            } else {
              currentBoard = removePiece(currentBoard, move.capturedPieceId);
            }
            
            // Execute as normal move to empty square (pawn diagonal move to empty square is illegal)
            // In standard chess, pawn can't move diagonally without capture
            // So we just end the turn with the attacker collapsed
            const finalBoard = switchTurn(currentBoard);
            set({ 
              board: finalBoard,
              selectedSquare: null,
              legalMoves: [],
            });
            return;
          }
          
          // Measurement succeeded - collapse target to capture square
          currentBoard = updatePieceSuperposition(currentBoard, move.capturedPieceId, { [move.to]: 1.0 });
          set({ board: currentBoard });
        }
      }
    }
    
    // Execute move based on type
    let newBoard = cloneBoardState(get().board);
    let notation = '';
    
    switch (move.type) {
      case 'normal':
        newBoard = executeNormalMove(newBoard, move);
        notation = formatMoveSimple(move.from, move.to, getPieceById(newBoard, move.pieceId)!.type);
        break;
        
      case 'capture':
        newBoard = executeCaptureMove(newBoard, move);
        notation = formatCaptureSimple(move.from, move.to, getPieceById(newBoard, move.pieceId)!.type);
        break;
        
      case 'split':
        newBoard = executeSplitMove(newBoard, move);
        notation = `${getPieceById(newBoard, move.pieceId)!.type}${indexToAlgebraic(move.from)}→${indexToAlgebraic(move.to1)}|${indexToAlgebraic(move.to2)}`;
        break;
        
      case 'merge':
        newBoard = executeMergeMove(newBoard, move);
        notation = `${getPieceById(newBoard, move.pieceId)!.type}${indexToAlgebraic(move.from1)}+${indexToAlgebraic(move.from2)}→${indexToAlgebraic(move.to)}`;
        break;
        
      // TODO: Implement castling, en passant, promotion
      default:
        console.warn('Move type not yet implemented:', move.type);
        return;
    }
    
    // Switch turn
    newBoard = switchTurn(newBoard);
    
    // Check win condition
    const whiteKingProb = getKingProbability(newBoard, 'white');
    const blackKingProb = getKingProbability(newBoard, 'black');
    
    let newStatus: GameStatus = 'active';
    if (whiteKingProb === 0 && blackKingProb === 0) {
      newStatus = 'draw';
    } else if (whiteKingProb === 0) {
      newStatus = 'black-wins';
    } else if (blackKingProb === 0) {
      newStatus = 'white-wins';
    }
    
    // Add to move history
    const historyEntry: MoveHistoryEntry = {
      move,
      notation,
      timestamp: Date.now(),
    };
    
    // Update state with new board, history, and save board state
    const currentState = get();
    const newHistory = [...currentState.moveHistory, historyEntry];
    const newBoardHistory = [...currentState.boardStateHistory, cloneBoardState(newBoard)];
    
    set({
      board: newBoard,
      status: newStatus,
      moveHistory: newHistory,
      boardStateHistory: newBoardHistory,
      currentMoveIndex: newHistory.length - 1, // Set to latest move
      selectedSquare: null,
      legalMoves: [],
    });
  },
  
  // Undo Move
  
  undoMove: () => {
    const state = get();
    
    // Can only undo if we have moves and we're at the latest position
    if (state.moveHistory.length === 0 || state.currentMoveIndex < state.moveHistory.length - 1) {
      return;
    }
    
    // Go to previous move (which is currentMoveIndex - 1, or -1 if first move)
    const targetIndex = state.currentMoveIndex - 1;
    
    // Remove the last move from history
    const newHistory = state.moveHistory.slice(0, -1);
    const newBoardHistory = state.boardStateHistory.slice(0, -1);
    
    // Restore the board state
    const restoredBoard = targetIndex >= 0 
      ? cloneBoardState(newBoardHistory[targetIndex + 1]) // +1 because index 0 is initial state
      : cloneBoardState(newBoardHistory[0]); // back to initial state
    
    set({
      board: restoredBoard,
      moveHistory: newHistory,
      boardStateHistory: newBoardHistory,
      currentMoveIndex: targetIndex,
      selectedSquare: null,
      legalMoves: [],
    });
    
    toast.info('Move undone');
  },
  
  // Navigation Actions (Read-only time-travel)
  
  goToMove: (index: number) => {
    const state = get();
    
    // Validate index: -1 = initial position, 0 to moveHistory.length - 1 = after each move
    if (index < -1 || index >= state.moveHistory.length) {
      return;
    }
    
    // Restore board state at the requested index
    // boardStateHistory[0] = initial state
    // boardStateHistory[1] = after move 0
    // boardStateHistory[i+1] = after move i
    const restoredBoard = cloneBoardState(state.boardStateHistory[index + 1]);
    
    set({
      board: restoredBoard,
      currentMoveIndex: index,
      selectedSquare: null,
      legalMoves: [],
    });
  },
  
  goToFirst: () => {
    get().goToMove(-1); // Go to initial position
  },
  
  goToPrevious: () => {
    const state = get();
    if (state.currentMoveIndex > -1) {
      get().goToMove(state.currentMoveIndex - 1);
    }
  },
  
  goToNext: () => {
    const state = get();
    if (state.currentMoveIndex < state.moveHistory.length - 1) {
      get().goToMove(state.currentMoveIndex + 1);
    }
  },
  
  goToLast: () => {
    const state = get();
    if (state.moveHistory.length > 0) {
      get().goToMove(state.moveHistory.length - 1);
    }
  },
  
  // New Game
  
  newGame: () => {
    set(createInitialGameState());
  },
  
  // Reset Selection
  
  resetSelection: () => {
    set({
      selectedSquare: null,
      legalMoves: [],
    });
  },
  
  // Helper Methods
  
  canSelectSquare: (square: SquareIndex) => {
    const state = get();
    const piece = getPieceAt(state.board, square);
    return piece !== null && piece.color === state.board.activeColor;
  },
  
  isSquareHighlighted: (square: SquareIndex) => {
    const state = get();
    if (state.selectedSquare === square) return true;
    
    return state.legalMoves.some(move => {
      if (move.type === 'normal' || move.type === 'capture') {
        return move.to === square;
      }
      return false;
    });
  },
}));

// Move Execution Helpers

/**
 * Find blocking pieces in path and calculate blocking probability
 */
function getBlockingPiecesInPath(
  board: BoardState,
  pathSquares: SquareIndex[],
  movingPieceId: string
): { pieceId: string; square: SquareIndex; probability: number }[] {
  const blockers: { pieceId: string; square: SquareIndex; probability: number }[] = [];
  
  for (const square of pathSquares) {
    const piecesAtSquare = getPiecesAtSquare(board, square);
    for (const piece of piecesAtSquare) {
      if (piece.id !== movingPieceId) {
        const prob = piece.superposition[square] || 0;
        if (prob > 0) {
          blockers.push({ pieceId: piece.id, square, probability: prob });
        }
      }
    }
  }
  
  return blockers;
}

/** Execute normal move */
function executeNormalMove(board: BoardState, move: NormalMove): BoardState {
  let newBoard = cloneBoardState(board);
  
  const piece = getPieceById(newBoard, move.pieceId);
  if (!piece) return newBoard;
  
  // Check for path entanglement (if sliding piece)
  if (isSlidingMove(piece.type, move.from, move.to)) {
    const pathSquares = getSquaresBetween(move.from, move.to);
    if (pathSquares.length > 0) {
      const blockers = getBlockingPiecesInPath(newBoard, pathSquares, move.pieceId);
      
      // If there are blocking pieces with superposition, create entanglement
      if (blockers.length > 0) {
        // For simplicity, handle first blocker (multi-blocker is complex)
        const blocker = blockers[0];
        const result = createMoveEntanglement(
          newBoard,
          move.pieceId,
          move.from,
          move.to,
          blocker.pieceId,
          blocker.square,
          blocker.probability
        );
        
        newBoard = result.board;
        
        // Update piece superpositions from entanglement
        if (result.entanglement) {
          newBoard = updatePiecesFromEntanglement(newBoard, result.entanglement);
        }
      } else {
        // No blockers - move probability (maintain superposition)
        const updatedPiece = getPieceById(newBoard, move.pieceId);
        if (updatedPiece) {
          const newSuperposition = moveProbability(updatedPiece, move.from, move.to);
          newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
        }
      }
    } else {
      // No path (adjacent move) - move probability (maintain superposition)
      const newSuperposition = moveProbability(piece, move.from, move.to);
      newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
    }
  } else {
    // Non-sliding piece - move probability (maintain superposition)
    const newSuperposition = moveProbability(piece, move.from, move.to);
    newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  }
  
  // Get the piece again after all updates
  const finalPiece = getPieceById(newBoard, move.pieceId);
  if (!finalPiece) return newBoard;
  
  // Update castling rights if king or rook moved
  if (finalPiece.type === 'K') {
    newBoard = updateCastlingRights(newBoard, finalPiece.color, {
      kingside: false,
      queenside: false,
    });
  }
  
  if (finalPiece.type === 'R') {
    const file = getFile(move.from);
    const rank = getRank(move.from);
    
    if ((finalPiece.color === 'white' && rank === 0) || (finalPiece.color === 'black' && rank === 7)) {
      if (file === 0) {
        newBoard = updateCastlingRights(newBoard, finalPiece.color, { queenside: false });
      } else if (file === 7) {
        newBoard = updateCastlingRights(newBoard, finalPiece.color, { kingside: false });
      }
    }
  }
  
  // Handle pawn two-square move (set en passant target)
  if (finalPiece.type === 'P' && Math.abs(move.to - move.from) === 16) {
    const direction = finalPiece.color === 'white' ? 1 : -1;
    const epSquare = move.from + (8 * direction);
    newBoard = setEnPassantTarget(newBoard, {
      square: epSquare,
      pawnSquare: move.to,
      pawnId: finalPiece.id,
    });
  } else {
    newBoard = setEnPassantTarget(newBoard, null);
  }
  
  return newBoard;
}

/**
 * Execute a capture move
 */
function executeCaptureMove(board: BoardState, move: NormalMove): BoardState {
  let newBoard = cloneBoardState(board);
  
  const piece = getPieceById(newBoard, move.pieceId);
  if (!piece) return newBoard;
  
  // Check for path entanglement (if sliding piece)
  if (isSlidingMove(piece.type, move.from, move.to)) {
    const pathSquares = getSquaresBetween(move.from, move.to);
    if (pathSquares.length > 0) {
      const blockers = getBlockingPiecesInPath(newBoard, pathSquares, move.pieceId);
      
      if (blockers.length > 0) {
        const blocker = blockers[0];
        const result = createMoveEntanglement(
          newBoard,
          move.pieceId,
          move.from,
          move.to,
          blocker.pieceId,
          blocker.square,
          blocker.probability
        );
        
        newBoard = result.board;
        
        if (result.entanglement) {
          newBoard = updatePiecesFromEntanglement(newBoard, result.entanglement);
        }
      } else {
        // No blockers - unitary capture: move probability amplitude from->to
        // This preserves superposition structure (no collapse)
        const newSuperposition: Record<number, number> = { ...piece.superposition };
        const probAtSource = newSuperposition[move.from] || 0;
        delete newSuperposition[move.from];
        newSuperposition[move.to] = (newSuperposition[move.to] || 0) + probAtSource;
        newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
      }
    } else {
      // No path - unitary capture: move probability amplitude from->to
      const newSuperposition: Record<number, number> = { ...piece.superposition };
      const probAtSource = newSuperposition[move.from] || 0;
      delete newSuperposition[move.from];
      newSuperposition[move.to] = (newSuperposition[move.to] || 0) + probAtSource;
      newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
    }
  } else {
    // Non-sliding piece - unitary capture: move probability amplitude from->to
    const newSuperposition: Record<number, number> = { ...piece.superposition };
    const probAtSource = newSuperposition[move.from] || 0;
    delete newSuperposition[move.from];
    newSuperposition[move.to] = (newSuperposition[move.to] || 0) + probAtSource;
    newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  }
  
  // Get updated piece after move
  const updatedPiece = getPieceById(newBoard, move.pieceId);
  if (!updatedPiece) return newBoard;
  
  // Handle captured piece - per paper section 7.3, capture is unitary
  // The captured piece is moved to "captured ancilla" without measurement
  if (move.capturedPieceId) {
    const capturedPiece = getPieceById(newBoard, move.capturedPieceId);
    if (capturedPiece) {
      // Remove any entanglements involving captured piece
      if (isPieceEntangled(newBoard, move.capturedPieceId)) {
        newBoard = removeEntanglement(newBoard, move.capturedPieceId);
      }
      
      // Unitary capture: Remove the probability amplitude at target square
      // This simulates U_jump(s,t) followed by U_jump(t,c) from the paper
      // In classical probability simulation, we simply remove the captured piece
      // at the target location (it moves to captured ancilla space)
      
      if (capturedPiece.superposition[move.to] === 1.0) {
        // Piece is certain at target - full capture
        newBoard = removePiece(newBoard, move.capturedPieceId);
      } else {
        // Piece is in superposition at target - partial capture
        // Remove probability at target square WITHOUT measuring or renormalizing
        // This preserves quantum coherence - unitary operation per paper
        const newSuperposition: Record<number, number> = {};
        let hasRemainingProb = false;
        
        for (const [square, prob] of Object.entries(capturedPiece.superposition)) {
          const sq = parseInt(square);
          if (sq !== move.to) {
            newSuperposition[sq] = prob;
            hasRemainingProb = true;
          }
        }
        
        // Do NOT renormalize - this is unitary removal of amplitude
        if (hasRemainingProb) {
          newBoard = updatePieceSuperposition(newBoard, move.capturedPieceId, newSuperposition);
        } else {
          // All probability removed, piece is fully captured
          newBoard = removePiece(newBoard, move.capturedPieceId);
        }
      }
    }
  }
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  // Update castling rights if rook was captured
  if (move.capturedPieceId) {
    const capturedPiece = getPieceById(board, move.capturedPieceId);
    if (capturedPiece && capturedPiece.type === 'R') {
      const file = getFile(move.to);
      const rank = getRank(move.to);
      
      if ((capturedPiece.color === 'white' && rank === 0) || (capturedPiece.color === 'black' && rank === 7)) {
        if (file === 0) {
          newBoard = updateCastlingRights(newBoard, capturedPiece.color, { queenside: false });
        } else if (file === 7) {
          newBoard = updateCastlingRights(newBoard, capturedPiece.color, { kingside: false });
        }
      }
    }
  }
  
  return newBoard;
}

/**
 * Execute a split move
 */
function executeSplitMove(board: BoardState, move: SplitMove): BoardState {
  let newBoard = cloneBoardState(board);
  
  const piece = getPieceById(newBoard, move.pieceId);
  if (!piece) return newBoard;
  
  // Check for blocking pieces in paths
  let blockers1: { pieceId: string; square: SquareIndex; probability: number }[] = [];
  let blockers2: { pieceId: string; square: SquareIndex; probability: number }[] = [];
  
  // Check path 1 for blockers
  if (isSlidingMove(piece.type, move.from, move.to1)) {
    const path1 = getSquaresBetween(move.from, move.to1);
    if (path1.length > 0) {
      blockers1 = getBlockingPiecesInPath(newBoard, path1, move.pieceId);
    }
  }
  
  // Check path 2 for blockers
  if (isSlidingMove(piece.type, move.from, move.to2)) {
    const path2 = getSquaresBetween(move.from, move.to2);
    if (path2.length > 0) {
      blockers2 = getBlockingPiecesInPath(newBoard, path2, move.pieceId);
    }
  }
  
  // If there are blockers in either path, create 3-way entanglement
  if (blockers1.length > 0 || blockers2.length > 0) {
    // Collect blocker data for the function call
    const blockingPieceIds: string[] = [];
    const blockSquares: SquareIndex[] = [];
    const blockProbabilities: number[] = [];
    
    // Add blocker from path 1 if exists
    if (blockers1.length > 0) {
      blockingPieceIds.push(blockers1[0].pieceId);
      blockSquares.push(blockers1[0].square);
      blockProbabilities.push(blockers1[0].probability);
    }
    
    // Add blocker from path 2 if exists
    if (blockers2.length > 0) {
      blockingPieceIds.push(blockers2[0].pieceId);
      blockSquares.push(blockers2[0].square);
      blockProbabilities.push(blockers2[0].probability);
    }
    
    console.log('Creating split entanglement with blockers:', blockingPieceIds);
    
    const result = createSplitEntanglement(
      newBoard,
      move.pieceId,
      move.from,
      move.to1,
      move.to2,
      blockingPieceIds,
      blockSquares,
      blockProbabilities,
      move.probability || 0.5
    );
    
    console.log('Split entanglement result:', result.entanglement);
    
    if (result.entanglement) {
      // Update board from entanglement first
      newBoard = result.board;
      // Then update piece probabilities from joint distribution
      newBoard = updatePiecesFromEntanglement(newBoard, result.entanglement);
      console.log('Updated board after entanglement:', newBoard.pieces.find(p => p.id === move.pieceId));
    } else {
      newBoard = result.board;
    }
  } else {
    // No blockers - standard quantum split
    const newSuperposition = quantumSplit(
      piece,
      move.from,
      move.to1,
      move.to2,
      move.probability || 0.5
    );
    newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  }
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}

/**
 * Execute a merge move
 */
function executeMergeMove(board: BoardState, move: MergeMove): BoardState {
  let newBoard = cloneBoardState(board);
  
  const piece = getPieceById(newBoard, move.pieceId);
  if (!piece) return newBoard;
  
  // Check for blocking pieces in paths (similar to split move)
  let blockers1: { pieceId: string; square: SquareIndex; probability: number }[] = [];
  let blockers2: { pieceId: string; square: SquareIndex; probability: number }[] = [];
  
  // Check path 1 (from source1 to target) for blockers
  if (isSlidingMove(piece.type, move.from1, move.to)) {
    const path1 = getSquaresBetween(move.from1, move.to);
    if (path1.length > 0) {
      blockers1 = getBlockingPiecesInPath(newBoard, path1, move.pieceId);
    }
  }
  
  // Check path 2 (from source2 to target) for blockers
  if (isSlidingMove(piece.type, move.from2, move.to)) {
    const path2 = getSquaresBetween(move.from2, move.to);
    if (path2.length > 0) {
      blockers2 = getBlockingPiecesInPath(newBoard, path2, move.pieceId);
    }
  }
  
  // If there are blockers in either path, create merge entanglement
  if (blockers1.length > 0 || blockers2.length > 0) {
    // Collect blocker data
    const blockingPieceIds: string[] = [];
    const blockSquares: SquareIndex[] = [];
    const blockProbabilities: number[] = [];
    
    // Add blocker from path 1 if exists
    if (blockers1.length > 0) {
      blockingPieceIds.push(blockers1[0].pieceId);
      blockSquares.push(blockers1[0].square);
      blockProbabilities.push(blockers1[0].probability);
    }
    
    // Add blocker from path 2 if exists
    if (blockers2.length > 0) {
      blockingPieceIds.push(blockers2[0].pieceId);
      blockSquares.push(blockers2[0].square);
      blockProbabilities.push(blockers2[0].probability);
    }
    
    console.log('Creating merge entanglement with blockers:', blockingPieceIds);
    
    const result = createMergeEntanglement(
      newBoard,
      move.pieceId,
      move.from1,
      move.from2,
      move.to,
      blockingPieceIds,
      blockSquares,
      blockProbabilities
    );
    
    console.log('Merge entanglement result:', result.entanglement);
    
    if (result.entanglement) {
      // Update board from entanglement first
      newBoard = result.board;
      // Then update piece probabilities from joint distribution
      newBoard = updatePiecesFromEntanglement(newBoard, result.entanglement);
      console.log('Updated board after merge entanglement:', newBoard.pieces.find(p => p.id === move.pieceId));
    } else {
      newBoard = result.board;
    }
  } else {
    // No blockers - standard quantum merge
    const newSuperposition = quantumMerge(piece, move.from1, move.from2, move.to);
    newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  }
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}
