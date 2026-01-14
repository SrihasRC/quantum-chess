/**
 * Zustand Game Store - Single source of truth
 */

import { create } from 'zustand';
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
} from '@/lib/engine/state';
import {
  generateLegalMoves,
  validateMove,
} from '@/lib/engine/moves';
import {
  splitMove as quantumSplit,
  mergeMove as quantumMerge,
  classicalMove,
  measurePieceOnBoard,
} from '@/lib/engine/quantum';
import {
  indexToAlgebraic,
  formatMoveSimple,
  formatCaptureSimple,
  getFile,
  getRank,
} from '@/lib/engine/utils';

// Game Store Interface

interface GameStore extends GameState {
  // Actions
  selectPiece: (square: SquareIndex) => void;
  movePiece: (move: Move) => void;
  undoMove: () => void;
  newGame: () => void;
  resetSelection: () => void;
  
  // Helper methods
  canSelectSquare: (square: SquareIndex) => boolean;
  isSquareHighlighted: (square: SquareIndex) => boolean;
}

// Initial State

function createInitialGameState(): GameState {
  return {
    board: createInitialBoardState(),
    status: 'active',
    moveHistory: [],
    capturedPieces: [],
    entanglements: [],
    selectedSquare: null,
    legalMoves: [],
  };
}

// Zustand Store

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),
  
  // Select Piece
  
  selectPiece: (square: SquareIndex) => {
    const state = get();
    
    // If clicking on already selected square, deselect
    if (state.selectedSquare === square) {
      set({
        selectedSquare: null,
        legalMoves: [],
      });
      return;
    }
    
    // Check if there's a piece at this square belonging to current player
    const piece = getPieceAt(state.board, square);
    
    if (!piece || piece.color !== state.board.activeColor) {
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
    
    // Generate legal moves for this piece
    const legalMoves = generateLegalMoves(state.board, piece.id, square);
    
    set({
      selectedSquare: square,
      legalMoves,
    });
  },
  
  // Move Piece
  
  movePiece: (move: Move) => {
    const state = get();
    
    // Validate move
    const validation = validateMove(state.board, move);
    if (!validation.isLegal) {
      console.error('Illegal move:', validation.reason);
      return;
    }
    
    // Handle measurement if required
    if (validation.requiresMeasurement && validation.measurementSquare !== undefined) {
      // Perform measurement
      const { board: newBoard, measurement } = measurePieceOnBoard(
        state.board,
        move.pieceId,
        validation.measurementSquare
      );
      
      // Update board and check if move is still valid
      if (!measurement.result) {
        console.log('Measurement failed - piece not at source square');
        set({ board: newBoard });
        return;
      }
      
      set({ board: newBoard });
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
    
    set({
      board: newBoard,
      status: newStatus,
      moveHistory: [...state.moveHistory, historyEntry],
      selectedSquare: null,
      legalMoves: [],
    });
  },
  
  // Undo Move
  
  undoMove: () => {
    // TODO: Implement undo (requires storing board states)
    console.warn('Undo not yet implemented');
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

/** Execute normal move */
function executeNormalMove(board: BoardState, move: NormalMove): BoardState {
  let newBoard = cloneBoardState(board);
  
  const piece = getPieceById(newBoard, move.pieceId);
  if (!piece) return newBoard;
  
  // Create new superposition at target square
  const newSuperposition = classicalMove(piece, move.to);
  newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  
  // Update castling rights if king or rook moved
  if (piece.type === 'K') {
    newBoard = updateCastlingRights(newBoard, piece.color, {
      kingside: false,
      queenside: false,
    });
  }
  
  if (piece.type === 'R') {
    const file = getFile(move.from);
    const rank = getRank(move.from);
    
    if ((piece.color === 'white' && rank === 0) || (piece.color === 'black' && rank === 7)) {
      if (file === 0) {
        newBoard = updateCastlingRights(newBoard, piece.color, { queenside: false });
      } else if (file === 7) {
        newBoard = updateCastlingRights(newBoard, piece.color, { kingside: false });
      }
    }
  }
  
  // Handle pawn two-square move (set en passant target)
  if (piece.type === 'P' && Math.abs(move.to - move.from) === 16) {
    const direction = piece.color === 'white' ? 1 : -1;
    const epSquare = move.from + (8 * direction);
    newBoard = setEnPassantTarget(newBoard, {
      square: epSquare,
      pawnSquare: move.to,
      pawnId: piece.id,
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
  
  // Remove captured piece
  if (move.capturedPieceId) {
    const capturedPiece = getPieceById(newBoard, move.capturedPieceId);
    if (capturedPiece) {
      // Add to captured pieces list (in actual game store state)
      // For now, just remove from board
      newBoard = removePiece(newBoard, move.capturedPieceId);
    }
  }
  
  // Move capturing piece to target
  const newSuperposition = classicalMove(piece, move.to);
  newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  
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
  
  // Create superposition
  const newSuperposition = quantumSplit(
    piece,
    move.from,
    move.to1,
    move.to2,
    move.probability || 0.5
  );
  
  newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  
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
  
  // Merge superposition
  const newSuperposition = quantumMerge(piece, move.from1, move.from2, move.to);
  
  newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}
