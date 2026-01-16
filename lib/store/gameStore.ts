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
  measurePieceOnBoard,
  createMoveEntanglement,
  createSplitEntanglement,
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
    
    // Handle measurement if required
    if (validation.requiresMeasurement && validation.measurementSquare !== undefined) {
      let currentBoard = state.board;
      
      // For captures, we might need to measure both attacker and target
      if (move.type === 'capture') {
        const piece = getPieceById(currentBoard, move.pieceId);
        
        // Measure attacker if in superposition at source
        if (piece && piece.superposition[move.from] !== 1.0) {
          // Check if piece is entangled
          if (isPieceEntangled(currentBoard, move.pieceId)) {
            const { board: newBoard } = collapseEntangledMeasurement(
              currentBoard,
              move.pieceId,
              move.from
            );
            
            // Check if piece collapsed to the source square
            const measuredPiece = getPieceById(newBoard, move.pieceId);
            if (!measuredPiece || measuredPiece.superposition[move.from] !== 1.0) {
              console.log('Measurement failed - attacker not at source square');
              toast.error('Measurement Failed', {
                description: `Your piece was not found at ${indexToAlgebraic(move.from)}. Turn lost.`,
              });
              // Switch turn since measurement counts as the move
              const finalBoard = switchTurn(newBoard);
              set({ 
                board: finalBoard,
                selectedSquare: null,
                legalMoves: [],
              });
              return;
            }
            currentBoard = newBoard;
          } else {
            // Not entangled - use regular measurement
            const { board: newBoard, measurement } = measurePieceOnBoard(
              currentBoard,
              move.pieceId,
              move.from
            );
            
            if (!measurement.result) {
              console.log('Measurement failed - attacker not at source square');
              toast.error('Measurement Failed', {
                description: `Your piece was not found at ${indexToAlgebraic(move.from)}. Turn lost.`,
              });
              // Switch turn since measurement counts as the move
              const finalBoard = switchTurn(newBoard);
              set({ 
                board: finalBoard,
                selectedSquare: null,
                legalMoves: [],
              });
              return;
            }
            currentBoard = newBoard;
          }
        }
        
        // Measure target if in superposition
        if (move.capturedPieceId) {
          const targetPiece = getPieceById(currentBoard, move.capturedPieceId);
          if (targetPiece && targetPiece.superposition[move.to] !== 1.0) {
            // Check if target is entangled
            if (isPieceEntangled(currentBoard, move.capturedPieceId)) {
              const { board: newBoard } = collapseEntangledMeasurement(
                currentBoard,
                move.capturedPieceId,
                move.to
              );
              
              // Check if target collapsed to the capture square
              const measuredTarget = getPieceById(newBoard, move.capturedPieceId);
              if (!measuredTarget || measuredTarget.superposition[move.to] !== 1.0) {
                console.log('Measurement failed - target not at capture square');
                toast.info('Capture Failed', {
                  description: `Target piece was not found at ${indexToAlgebraic(move.to)}. Moving to empty square.`,
                });
                
                // Target not there, but square is now empty - execute as normal move
                const moveAsNormal: NormalMove = {
                  type: 'normal',
                  pieceId: move.pieceId,
                  from: move.from,
                to: move.to,
              };
              
              const finalBoard = executeNormalMove(newBoard, moveAsNormal);
              const notation = formatMoveSimple(move.from, move.to, getPieceById(finalBoard, move.pieceId)!.type);
              
              // Switch turn and update state
              const nextBoard = switchTurn(finalBoard);
              set({ 
                board: nextBoard,
                selectedSquare: null,
                legalMoves: [],
                moveHistory: [
                  ...state.moveHistory,
                  {
                    move: moveAsNormal,
                    notation,
                    timestamp: Date.now(),
                  },
                ],
              });
              return;
              }
              currentBoard = newBoard;
            } else {
              // Not entangled - use regular measurement
              const { board: newBoard, measurement } = measurePieceOnBoard(
                currentBoard,
                move.capturedPieceId,
                move.to
              );
              
              if (!measurement.result) {
                console.log('Measurement failed - target not at capture square');
                toast.info('Capture Failed', {
                  description: `Target piece was not found at ${indexToAlgebraic(move.to)}. Moving to empty square.`,
                });
                
                // Target not there, but square is now empty - execute as normal move
                const moveAsNormal: NormalMove = {
                  type: 'normal',
                  pieceId: move.pieceId,
                  from: move.from,
                  to: move.to,
                };
                
                const finalBoard = executeNormalMove(newBoard, moveAsNormal);
                const notation = formatMoveSimple(move.from, move.to, getPieceById(finalBoard, move.pieceId)!.type);
                
                // Switch turn and update state
                const nextBoard = switchTurn(finalBoard);
                set({ 
                  board: nextBoard,
                  selectedSquare: null,
                  legalMoves: [],
                  moveHistory: [
                    ...state.moveHistory,
                    {
                      move: moveAsNormal,
                      notation,
                      timestamp: Date.now(),
                    },
                  ],
                });
                return;
              }
            
              currentBoard = newBoard;
            }
          }
        }
      } else {
        // Non-capture measurement (attacker in superposition)
        if (isPieceEntangled(currentBoard, move.pieceId)) {
          const { board: newBoard } = collapseEntangledMeasurement(
            currentBoard,
            move.pieceId,
            validation.measurementSquare
          );
          
          // Check if piece collapsed to the measurement square
          const measuredPiece = getPieceById(newBoard, move.pieceId);
          if (!measuredPiece || measuredPiece.superposition[validation.measurementSquare] !== 1.0) {
            console.log('Measurement failed - piece not at source square');
            toast.error('Measurement Failed', {
              description: `Your piece was not found at ${indexToAlgebraic(validation.measurementSquare)}. Turn lost.`,
            });
            // Switch turn since measurement counts as the move
            const finalBoard = switchTurn(newBoard);
            set({ 
              board: finalBoard,
              selectedSquare: null,
              legalMoves: [],
            });
            return;
          }
          currentBoard = newBoard;
        } else {
          // Not entangled - use regular measurement
          const { board: newBoard, measurement } = measurePieceOnBoard(
            currentBoard,
            move.pieceId,
            validation.measurementSquare
          );
          
          if (!measurement.result) {
            console.log('Measurement failed - piece not at source square');
            toast.error('Measurement Failed', {
              description: `Your piece was not found at ${indexToAlgebraic(validation.measurementSquare)}. Turn lost.`,
            });
            // Switch turn since measurement counts as the move
            const finalBoard = switchTurn(newBoard);
            set({ 
              board: finalBoard,
              selectedSquare: null,
              legalMoves: [],
            });
            return;
          }
          
          currentBoard = newBoard;
        }
      }
      
      set({ board: currentBoard });
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
        // No blockers - classical move
        const updatedPiece = getPieceById(newBoard, move.pieceId);
        if (updatedPiece) {
          const newSuperposition = classicalMove(updatedPiece, move.to);
          newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
        }
      }
    } else {
      // No path (adjacent move) - classical move
      const newSuperposition = classicalMove(piece, move.to);
      newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
    }
  } else {
    // Non-sliding piece - classical move
    const newSuperposition = classicalMove(piece, move.to);
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
      pawnId: updatedPiece.id,
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
        // No blockers - classical move to capture square
        const newSuperposition = classicalMove(piece, move.to);
        newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
      }
    } else {
      // No path - classical move to capture square
      const newSuperposition = classicalMove(piece, move.to);
      newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
    }
  } else {
    // Non-sliding piece - classical move to capture square
    const newSuperposition = classicalMove(piece, move.to);
    newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  }
  
  // Get updated piece after move
  const updatedPiece = getPieceById(newBoard, move.pieceId);
  if (!updatedPiece) return newBoard;
  
  // Handle captured piece - only remove from target square
  if (move.capturedPieceId) {
    const capturedPiece = getPieceById(newBoard, move.capturedPieceId);
    if (capturedPiece) {
      // Remove any entanglements involving captured piece
      if (isPieceEntangled(newBoard, move.capturedPieceId)) {
        newBoard = removeEntanglement(newBoard, move.capturedPieceId);
      }
      
      // Check if piece is certain at target (classical capture)
      if (capturedPiece.superposition[move.to] === 1.0) {
        // Remove entire piece (it's only at this square)
        newBoard = removePiece(newBoard, move.capturedPieceId);
      } else {
        // Piece is in superposition - remove only this square and renormalize
        const newSuperposition: Record<number, number> = {};
        for (const [square, prob] of Object.entries(capturedPiece.superposition)) {
          const sq = parseInt(square);
          if (sq !== move.to) {
            newSuperposition[sq] = prob;
          }
        }
        
        // Renormalize remaining probabilities
        const totalProb = Object.values(newSuperposition).reduce((sum, p) => sum + p, 0);
        if (totalProb > 0) {
          for (const square in newSuperposition) {
            newSuperposition[square] = newSuperposition[square] / totalProb;
          }
          newBoard = updatePieceSuperposition(newBoard, move.capturedPieceId, newSuperposition);
        } else {
          // All probability removed, piece is captured completely
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
    // Handle first blocker from each path
    const blocker1 = blockers1.length > 0 ? blockers1[0] : null;
    const blocker2 = blockers2.length > 0 ? blockers2[0] : null;
    
    const result = createSplitEntanglement(
      newBoard,
      move.pieceId,
      move.from,
      move.to1,
      move.to2,
      blocker1 ? { pieceId: blocker1.pieceId, square: blocker1.square, probability: blocker1.probability } : null,
      blocker2 ? { pieceId: blocker2.pieceId, square: blocker2.square, probability: blocker2.probability } : null,
      move.probability || 0.5
    );
    
    newBoard = result.board;
    
    // Update all pieces involved in entanglement
    if (result.entanglement) {
      newBoard = updatePiecesFromEntanglement(newBoard, result.entanglement);
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
  
  // Check for path entanglement (if sliding piece)
  if (isSlidingMove(piece.type, move.from1, move.to)) {
    const path1 = getSquaresBetween(move.from1, move.to);
    if (path1.length > 0) {
      newBoard = createPathEntanglement(
        newBoard,
        move.pieceId,
        path1,
        `${piece.type} merge from ${indexToAlgebraic(move.from1)} through path to ${indexToAlgebraic(move.to)}`
      );
    }
  }
  
  if (isSlidingMove(piece.type, move.from2, move.to)) {
    const path2 = getSquaresBetween(move.from2, move.to);
    if (path2.length > 0) {
      newBoard = createPathEntanglement(
        newBoard,
        move.pieceId,
        path2,
        `${piece.type} merge from ${indexToAlgebraic(move.from2)} through path to ${indexToAlgebraic(move.to)}`
      );
    }
  }
  
  // Merge superposition
  const updatedPiece = getPieceById(newBoard, move.pieceId);
  if (!updatedPiece) return newBoard;
  
  const newSuperposition = quantumMerge(updatedPiece, move.from1, move.from2, move.to);
  
  newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}
