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
  PromotionMove,
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
  moveProbability,
  createMoveEntanglement,
  createSplitEntanglement,
  createMergeEntanglement,
  updatePiecesFromEntanglement,
  isPieceEntangled,
  removeEntanglement,
  collapseEntanglements,
  collapseEntangledMeasurement,
  parseJointKey,
  createJointKey,
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
  // Promotion state
  promotionPending: {
    from: SquareIndex;
    to: SquareIndex;
    pieceId: string;
    capturedPieceId?: string;
  } | null;
  
  // Actions
  selectPiece: (square: SquareIndex) => void;
  movePiece: (move: Move) => void;
  selectPromotionPiece: (piece: 'Q' | 'R' | 'B' | 'N') => void;
  cancelPromotion: () => void;
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
    sandboxMode: false,
  };
}

// Zustand Store

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),
  promotionPending: null,
  
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
    
    // If no classical piece, check for superposed pieces
    if (!piece) {
      const superposedPieces = getPiecesAtSquare(state.board, square);
      // In sandbox mode, allow any piece; in normal mode, filter by active color
      const relevantPieces = state.sandboxMode 
        ? superposedPieces 
        : superposedPieces.filter(p => p.color === state.board.activeColor);
      
      if (relevantPieces.length > 0) {
        // Found superposed piece(s) - select it WITHOUT measuring yet
        // Measurement will happen when attempting to move/capture
        pieceAtSquare = relevantPieces[0];
      }
    }
    
    // First, check if this is a move destination (including captures and promotions) for currently selected piece
    if (state.selectedSquare !== null) {
      const move = state.legalMoves.find(m => {
        if (m.type === 'normal' || m.type === 'capture' || m.type === 'promotion') {
          return m.to === square;
        }
        return false;
      });
      
      if (move) {
        // For promotion moves, handle measurement if needed and show dialog
        if (move.type === 'promotion') {
          // For capture promotions with superposed pawn, measure before showing dialog
          if (move.capturedPieceId) {
            const piece = getPieceById(state.board, move.pieceId);
            
            // If pawn is in superposition, measure before showing promotion dialog
            if (piece && piece.superposition[move.from] !== 1.0) {
              const probAtSource = piece.superposition[move.from] || 0;
              const roll = Math.random();
              
              if (roll > probAtSource) {
                // Measurement failed - pawn not at source square
                toast.error('Measurement Failed', {
                  description: `Your ${piece.type} was not found at ${indexToAlgebraic(move.from)} (${Math.round(probAtSource * 100)}% chance). Turn lost.`,
                });
                
                // Remove probability from source and renormalize
                let currentBoard = state.board;
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
                  
                  // Update entanglements based on measurement outcome
                  if (isPieceEntangled(currentBoard, move.pieceId)) {
                    console.log(`Pawn ${move.pieceId} is entangled, updating all entangled pieces based on measurement failure`);
                    
                    // Identify entangled positions
                    const entanglement = currentBoard.entanglements?.find(e => e.pieceIds.includes(move.pieceId));
                    const entangledPositions = new Set<number>();
                    if (entanglement) {
                      for (const key of Object.keys(entanglement.jointStates)) {
                        const positions = parseJointKey(key);
                        const pos = positions.get(move.pieceId);
                        if (pos !== undefined) {
                          entangledPositions.add(pos);
                        }
                      }
                    }
                    
                    // Calculate entangled fraction
                    let entangledProbTotal = 0;
                    const nonEntangledPositions: Record<number, number> = {};
                    for (const [sq, prob] of Object.entries(newSuperposition)) {
                      const square = parseInt(sq);
                      if (entangledPositions.has(square)) {
                        entangledProbTotal += prob;
                      } else {
                        nonEntangledPositions[square] = prob;
                      }
                    }
                    
                    // Collapse entanglement
                    currentBoard = collapseEntangledMeasurement(currentBoard, move.pieceId, move.from, false);
                    
                    // Scale and combine
                    const updatedPiece = getPieceById(currentBoard, move.pieceId);
                    if (updatedPiece) {
                      const combinedSuperposition: Record<number, number> = {};
                      
                      // Scale entangled marginals
                      for (const [sq, prob] of Object.entries(updatedPiece.superposition)) {
                        const square = parseInt(sq);
                        combinedSuperposition[square] = prob * entangledProbTotal;
                      }
                      
                      // Add non-entangled
                      for (const [sq, prob] of Object.entries(nonEntangledPositions)) {
                        const square = parseInt(sq);
                        combinedSuperposition[square] = (combinedSuperposition[square] || 0) + prob;
                      }
                      
                      currentBoard = updatePieceSuperposition(currentBoard, move.pieceId, combinedSuperposition);
                    }
                  }
                } else {
                  currentBoard = removePiece(currentBoard, move.pieceId);
                }
                
                // Switch turn since measurement counts as the move (unless in sandbox mode)
                const finalBoard = state.sandboxMode ? currentBoard : switchTurn(currentBoard);
                set({ 
                  board: finalBoard,
                  selectedSquare: null,
                  legalMoves: [],
                });
                return;
              }
              
              // Measurement succeeded - collapse pawn to source
              let currentBoard = state.board;
              currentBoard = updatePieceSuperposition(currentBoard, move.pieceId, { [move.from]: 1.0 });
              currentBoard = collapseEntanglements(currentBoard, move.pieceId, move.from);
              set({ board: currentBoard });
            }
          }
          
          // Show promotion dialog for all promotions
          set({
            promotionPending: {
              from: move.from,
              to: move.to,
              pieceId: move.pieceId,
              capturedPieceId: move.capturedPieceId,
            },
            selectedSquare: null,
            legalMoves: [],
          });
        } else {
          get().movePiece(move);
        }
        return;
      }
    }
    
    // In sandbox mode, allow selecting any piece regardless of turn
    // In normal mode, only allow selecting own pieces
    if (!pieceAtSquare || (!state.sandboxMode && pieceAtSquare.color !== state.board.activeColor)) {
      // No piece or enemy piece (and not a valid move destination)
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
        // In sandbox mode, get any piece; in normal mode, filter by active color
        const relevantPieces = state.sandboxMode 
          ? superposedPieces 
          : superposedPieces.filter(p => p.color === state.board.activeColor);
        if (relevantPieces.length > 0) {
          selectedPieceId = relevantPieces[0].id;
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
    const validation = validateMove(state.board, move, state.sandboxMode);
    if (!validation.isLegal) {
      console.error('Illegal move:', validation.reason);
      return;
    }
    
    // For captures: Must measure source if in superposition (per paper section 7.3)
    // This prevents double occupancy and determines if capture executes
    // For promotions: Only measure if it's a CAPTURE promotion (capturedPieceId exists)
    // Non-capturing promotions are unitary moves (no measurement needed)
    const needsMeasurement = move.type === 'capture' || 
                             (move.type === 'promotion' && move.capturedPieceId);
    
    if (needsMeasurement) {
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
            
            // Update entanglements based on measurement outcome
            if (isPieceEntangled(currentBoard, move.pieceId)) {
              console.log(`Piece ${move.pieceId} is entangled, updating all entangled pieces based on measurement failure`);
              
              // Identify which positions are part of the entanglement
              const entanglement = currentBoard.entanglements?.find(e => e.pieceIds.includes(move.pieceId));
              const entangledPositions = new Set<number>();
              if (entanglement) {
                for (const key of Object.keys(entanglement.jointStates)) {
                  const positions = parseJointKey(key);
                  const pos = positions.get(move.pieceId);
                  if (pos !== undefined) {
                    entangledPositions.add(pos);
                  }
                }
              }
              
              // Calculate what fraction of the piece's probability is entangled
              let entangledProbTotal = 0;
              const nonEntangledPositions: Record<number, number> = {};
              for (const [sq, prob] of Object.entries(newSuperposition)) {
                const square = parseInt(sq);
                if (entangledPositions.has(square)) {
                  entangledProbTotal += prob;
                } else {
                  nonEntangledPositions[square] = prob;
                }
              }
              
              console.log(`Entangled fraction: ${entangledProbTotal}, non-entangled:`, nonEntangledPositions);
              
              // Collapse entanglement (updates all entangled pieces, returns normalized marginals)
              currentBoard = collapseEntangledMeasurement(currentBoard, move.pieceId, move.from, false);
              
              // Scale the entangled marginals and add back non-entangled positions
              const updatedPiece = getPieceById(currentBoard, move.pieceId);
              if (updatedPiece) {
                const combinedSuperposition: Record<number, number> = {};
                
                // Scale entangled marginals by the fraction that was entangled
                for (const [sq, prob] of Object.entries(updatedPiece.superposition)) {
                  const square = parseInt(sq);
                  combinedSuperposition[square] = prob * entangledProbTotal;
                }
                
                // Add back non-entangled positions
                for (const [sq, prob] of Object.entries(nonEntangledPositions)) {
                  const square = parseInt(sq);
                  combinedSuperposition[square] = (combinedSuperposition[square] || 0) + prob;
                }
                
                currentBoard = updatePieceSuperposition(currentBoard, move.pieceId, combinedSuperposition);
              }
              
              console.log('After entanglement update, all pieces:', currentBoard.pieces.map(p => ({ id: p.id, superposition: p.superposition })));
            }
          } else {
            currentBoard = removePiece(currentBoard, move.pieceId);
          }
          
          // Switch turn since measurement counts as the move (unless in sandbox mode)
          const finalBoard = state.sandboxMode ? currentBoard : switchTurn(currentBoard);
          set({ 
            board: finalBoard,
            selectedSquare: null,
            legalMoves: [],
          });
          return;
        }
        
        // Measurement succeeded - collapse attacker to 100% at source
        currentBoard = updatePieceSuperposition(currentBoard, move.pieceId, { [move.from]: 1.0 });
        
        // Collapse any entanglements involving the measured piece
        currentBoard = collapseEntanglements(currentBoard, move.pieceId, move.from);
        
        set({ board: currentBoard });
      }
      
      // For PAWN captures only: Also measure target if in superposition
      // Pawn capture requires BOTH source and target to be occupied (paper section 7.3.1)
      // This applies to both regular captures and promotion captures
      const currentBoardForPawn = get().board;
      const pawnPiece = getPieceById(currentBoardForPawn, move.pieceId);
      // Use includes to avoid TypeScript type narrowing issues
      const isPawnCapture = pawnPiece && (['P', 'p'] as const).includes(pawnPiece.type as 'P' | 'p');
      
      if (isPawnCapture && move.capturedPieceId) {
        let currentBoard = currentBoardForPawn;
        const targetPiece = getPieceById(currentBoard, move.capturedPieceId);
        
        if (targetPiece && targetPiece.superposition[move.to] !== 1.0) {
          const probAtTarget = targetPiece.superposition[move.to] || 0;
          const roll = Math.random();
          
          if (roll > probAtTarget) {
            // Measurement failed - target not at capture square
            console.log('Pawn capture measurement failed - target not at capture square');
            toast.info('Capture Failed', {
              description: `Target piece was not found at ${indexToAlgebraic(move.to)} (${Math.round(probAtTarget * 100)}% chance). Pawn remains in place.`,
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
              
              // Update entanglements based on measurement outcome
              if (move.capturedPieceId && isPieceEntangled(currentBoard, move.capturedPieceId)) {
                console.log(`Target piece ${move.capturedPieceId} is entangled, updating all entangled pieces based on measurement failure`);
                
                // Identify entangled positions
                const entanglement = currentBoard.entanglements?.find(e => e.pieceIds.includes(move.capturedPieceId!));
                const entangledPositions = new Set<number>();
                if (entanglement) {
                  for (const key of Object.keys(entanglement.jointStates)) {
                    const positions = parseJointKey(key);
                    const pos = positions.get(move.capturedPieceId!);
                    if (pos !== undefined) {
                      entangledPositions.add(pos);
                    }
                  }
                }
                
                // Calculate entangled fraction
                let entangledProbTotal = 0;
                const nonEntangledPositions: Record<number, number> = {};
                for (const [sq, prob] of Object.entries(newSuperposition)) {
                  const square = parseInt(sq);
                  if (entangledPositions.has(square)) {
                    entangledProbTotal += prob;
                  } else {
                    nonEntangledPositions[square] = prob;
                  }
                }
                
                // Collapse entanglement
                currentBoard = collapseEntangledMeasurement(currentBoard, move.capturedPieceId, move.to, false);
                
                // Scale and combine
                const updatedPiece = getPieceById(currentBoard, move.capturedPieceId);
                if (updatedPiece) {
                  const combinedSuperposition: Record<number, number> = {};
                  
                  // Scale entangled marginals
                  for (const [sq, prob] of Object.entries(updatedPiece.superposition)) {
                    const square = parseInt(sq);
                    combinedSuperposition[square] = prob * entangledProbTotal;
                  }
                  
                  // Add non-entangled
                  for (const [sq, prob] of Object.entries(nonEntangledPositions)) {
                    const square = parseInt(sq);
                    combinedSuperposition[square] = (combinedSuperposition[square] || 0) + prob;
                  }
                  
                  currentBoard = updatePieceSuperposition(currentBoard, move.capturedPieceId, combinedSuperposition);
                }
              }
            } else {
              currentBoard = removePiece(currentBoard, move.capturedPieceId);
            }
            
            // Pawn can't move diagonally without a capture
            // Pawn stays at its current position (already collapsed to source from earlier measurement)
            const finalBoard = state.sandboxMode ? currentBoard : switchTurn(currentBoard);
            set({ 
              board: finalBoard,
              selectedSquare: null,
              legalMoves: [],
            });
            return;
          }
          
          // Measurement succeeded - collapse target to capture square
          currentBoard = updatePieceSuperposition(currentBoard, move.capturedPieceId, { [move.to]: 1.0 });
          
          // Collapse any entanglements involving the measured target piece
          currentBoard = collapseEntanglements(currentBoard, move.capturedPieceId, move.to);
          
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
        
      case 'promotion':
        newBoard = executePromotionMove(newBoard, move);
        notation = `${indexToAlgebraic(move.from)}${indexToAlgebraic(move.to)}${move.promoteTo}${move.capturedPieceId ? 'x' : ''}`;
        break;
        
      // TODO: Implement castling, en passant
      default:
        console.warn('Move type not yet implemented:', move.type);
        return;
    }
    
    // Switch turn (unless in sandbox mode)
    newBoard = state.sandboxMode ? newBoard : switchTurn(newBoard);
    
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
      promotionPending: null,
    });
  },
  
  // Promotion Actions
  
  selectPromotionPiece: (piece: 'Q' | 'R' | 'B' | 'N') => {
    const state = get();
    if (!state.promotionPending) return;
    
    const move: PromotionMove = {
      type: 'promotion',
      pieceId: state.promotionPending.pieceId,
      from: state.promotionPending.from,
      to: state.promotionPending.to,
      promoteTo: piece,
      capturedPieceId: state.promotionPending.capturedPieceId,
    };
    
    set({ promotionPending: null });
    get().movePiece(move);
  },
  
  cancelPromotion: () => {
    set({ promotionPending: null });
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
      if (move.type === 'normal' || move.type === 'capture' || move.type === 'promotion') {
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
        // TODO: Edge case - if moving piece is ALREADY entangled, this creates multi-piece entanglement
        if (isPieceEntangled(newBoard, move.pieceId)) {
          console.warn('[executeNormalMove] Creating new entanglement while piece already entangled - multi-piece entanglement not fully supported');
        }
        
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
          
          // Update existing entanglements if piece was already entangled
          if (isPieceEntangled(newBoard, move.pieceId)) {
            newBoard = updateEntanglementsAfterMove(newBoard, move.pieceId, move.from, move.to);
          }
        }
      }
    } else {
      // No path (adjacent move) - move probability (maintain superposition)
      const newSuperposition = moveProbability(piece, move.from, move.to);
      newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
      
      // Update existing entanglements if piece was already entangled
      if (isPieceEntangled(newBoard, move.pieceId)) {
        newBoard = updateEntanglementsAfterMove(newBoard, move.pieceId, move.from, move.to);
      }
    }
  } else {
    // Non-sliding piece - move probability (maintain superposition)
    const newSuperposition = moveProbability(piece, move.from, move.to);
    newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
    
    // Update existing entanglements if piece was already entangled
    if (isPieceEntangled(newBoard, move.pieceId)) {
      newBoard = updateEntanglementsAfterMove(newBoard, move.pieceId, move.from, move.to);
    }
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
  
  // Check for path blockers (if sliding piece)
  if (isSlidingMove(piece.type, move.from, move.to)) {
    const pathSquares = getSquaresBetween(move.from, move.to);
    if (pathSquares.length > 0) {
      const blockers = getBlockingPiecesInPath(newBoard, pathSquares, move.pieceId);
      
      if (blockers.length > 0) {
        // For captures through superposed blockers, we must MEASURE the blocker
        // Cannot create entanglement because target square is already occupied
        // If blocker is present → move fails (return unchanged board)
        // If blocker is absent → proceed with capture
        const blocker = blockers[0];
        const blockingSquare = blocker.square;
        const blockerPiece = getPieceById(newBoard, blocker.pieceId);
        
        if (!blockerPiece) return newBoard;
        
        // Measure if the blocker is at the blocking square
        const probBlockerPresent = blockerPiece.superposition[blockingSquare] || 0;
        
        // Perform measurement
        const measurementResult = Math.random() < probBlockerPresent;
        
        if (measurementResult) {
          // Blocker is present - capture fails, path is blocked
          // Collapse blocker to the blocking square
          newBoard = updatePieceSuperposition(newBoard, blocker.pieceId, {
            [blockingSquare]: 1.0,
          });
          
          // Move fails - return board with only the blocker measurement
          return newBoard;
        } else {
          // Blocker is absent - remove probability from blocking square
          // and renormalize the blocker's other positions
          const newBlockerSuperposition: Record<number, number> = {};
          let totalRemainingProb = 0;
          
          for (const [square, prob] of Object.entries(blockerPiece.superposition)) {
            const sq = parseInt(square);
            if (sq !== blockingSquare) {
              newBlockerSuperposition[sq] = prob;
              totalRemainingProb += prob;
            }
          }
          
          // Renormalize remaining positions
          if (totalRemainingProb > 0) {
            for (const sq in newBlockerSuperposition) {
              newBlockerSuperposition[sq] /= totalRemainingProb;
            }
            newBoard = updatePieceSuperposition(newBoard, blocker.pieceId, newBlockerSuperposition);
          } else {
            // Blocker had no other positions - remove it
            newBoard = removePiece(newBoard, blocker.pieceId);
          }
          
          // Continue with unitary capture below
        }
      }
      
      // No blockers or blocker measured absent - unitary capture: move probability amplitude from->to
      // This preserves superposition structure (no collapse)
      // Get the updated piece after potential blocker measurement
      const movingPiece = getPieceById(newBoard, move.pieceId);
      if (movingPiece) {
        const newSuperposition: Record<number, number> = { ...movingPiece.superposition };
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
      // TODO: Properly handle capture of entangled pieces
      // For now, simply remove entanglements involving the captured piece
      // A complete implementation would need to update remaining pieces' probabilities
      if (isPieceEntangled(newBoard, move.capturedPieceId)) {
        console.warn('[executeCaptureMove] Capturing entangled piece - removing entanglement (simplified)');
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
  
  // Check if this piece is already entangled before splitting
  const existingEntanglements = newBoard.entanglements?.filter(e => 
    e.pieceIds.includes(move.pieceId)
  ) || [];
  
  console.log(`[executeSplitMove] Piece ${move.pieceId} has ${existingEntanglements.length} existing entanglements`);
  
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
    // TODO: Edge case - if splitting piece is ALREADY entangled, this creates multi-piece entanglement
    if (isPieceEntangled(newBoard, move.pieceId)) {
      console.warn('[executeSplitMove] Creating new entanglement while piece already entangled - multi-piece entanglement not fully supported');
    }
    
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
    
    // Get the probability amplitude at the source square
    const sourceProb = piece.superposition[move.from] || 0;
    
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
      
      // Special handling: Only preserve the MOVING PIECE's other positions
      // The blocker pieces are fully enumerated in the joint distribution,
      // so their positions should NOT be preserved separately
      const originalPiece = getPieceById(board, move.pieceId);
      const otherPositions: Record<number, number> = {};
      if (originalPiece) {
        for (const [sq, prob] of Object.entries(originalPiece.superposition)) {
          const square = parseInt(sq);
          if (square !== move.from) {
            otherPositions[square] = prob;
          }
        }
      }
      
      // Then update piece probabilities from joint distribution
      newBoard = updatePiecesFromEntanglement(newBoard, result.entanglement);
      
      // Scale the moving piece's entangled positions by sourceProb
      // (blocker pieces keep full probability from marginalization)
      const updatedPiece = getPieceById(newBoard, move.pieceId);
      if (updatedPiece) {
        const scaledSuperposition: Record<number, number> = {};
        for (const [sq, prob] of Object.entries(updatedPiece.superposition)) {
          const square = parseInt(sq);
          scaledSuperposition[square] = prob * sourceProb;
        }
        
        // Add back the other positions that weren't part of the split
        for (const [sq, prob] of Object.entries(otherPositions)) {
          const square = parseInt(sq);
          scaledSuperposition[square] = (scaledSuperposition[square] || 0) + prob;
        }
        
        newBoard = updatePieceSuperposition(newBoard, move.pieceId, scaledSuperposition);
      }
      
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
  
  // Update existing entanglements if the piece was already entangled
  if (existingEntanglements.length > 0) {
    console.log('[executeSplitMove] Updating existing entanglements after split');
    newBoard = updateEntanglementsAfterSplit(
      newBoard,
      move.pieceId,
      move.from,
      move.to1,
      move.to2,
      move.probability || 0.5
    );
  }
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}

/**
 * Update entanglements when a piece involved in entanglement undergoes a split
 */
function updateEntanglementsAfterSplit(
  board: BoardState,
  splitPieceId: string,
  fromSquare: SquareIndex,
  to1: SquareIndex,
  to2: SquareIndex,
  splitRatio: number
): BoardState {
  const newBoard = cloneBoardState(board);
  
  if (!newBoard.entanglements) return newBoard;
  
  // Find entanglements involving the split piece
  const affectedEntanglements = newBoard.entanglements.filter(e => 
    e.pieceIds.includes(splitPieceId)
  );
  
  if (affectedEntanglements.length === 0) return newBoard;
  
  console.log('[updateEntanglementsAfterSplit] Found entanglements to update:', affectedEntanglements);
  
  for (const ent of affectedEntanglements) {
    // Create new joint states by splitting each old joint state
    const newJointStates: Record<string, number> = {};
    
    for (const [oldKey, oldProb] of Object.entries(ent.jointStates)) {
      const positions = parseJointKey(oldKey);
      const splitPiecePos = positions.get(splitPieceId);
      
      if (splitPiecePos === fromSquare) {
        // This joint state had the piece at the split source
        // Split it into two new joint states
        
        // State 1: piece goes to to1
        const positions1 = new Map(positions);
        positions1.set(splitPieceId, to1);
        const key1 = createJointKey(positions1);
        newJointStates[key1] = (newJointStates[key1] || 0) + oldProb * splitRatio;
        
        // State 2: piece goes to to2
        const positions2 = new Map(positions);
        positions2.set(splitPieceId, to2);
        const key2 = createJointKey(positions2);
        newJointStates[key2] = (newJointStates[key2] || 0) + oldProb * (1 - splitRatio);
      } else {
        // This joint state had the piece elsewhere - keep it
        newJointStates[oldKey] = oldProb;
      }
    }
    
    console.log('[updateEntanglementsAfterSplit] Updated joint states:', newJointStates);
    
    // Update the entanglement in the board
    const entIndex = newBoard.entanglements.findIndex(e =>
      e.pieceIds.every(id => ent.pieceIds.includes(id)) &&
      ent.pieceIds.every(id => e.pieceIds.includes(id))
    );
    
    if (entIndex !== -1) {
      newBoard.entanglements[entIndex] = {
        ...ent,
        jointStates: newJointStates,
        description: `${ent.description} [after split]`,
      };
    }
  }
  
  return newBoard;
}

/**
 * Update entanglements when a piece moves from one square to another
 * Similar to split but simpler - just update the square in joint states
 */
function updateEntanglementsAfterMove(
  board: BoardState,
  movedPieceId: string,
  fromSquare: SquareIndex,
  toSquare: SquareIndex
): BoardState {
  const newBoard = cloneBoardState(board);
  
  if (!newBoard.entanglements) return newBoard;
  
  const affectedEntanglements = newBoard.entanglements.filter(e =>
    e.pieceIds.includes(movedPieceId)
  );
  
  if (affectedEntanglements.length === 0) return newBoard;
  
  console.log('[updateEntanglementsAfterMove] Updating entanglements for move', fromSquare, '→', toSquare);
  
  for (const ent of affectedEntanglements) {
    const newJointStates: Record<string, number> = {};
    
    for (const [oldKey, prob] of Object.entries(ent.jointStates)) {
      const positions = parseJointKey(oldKey);
      const piecePos = positions.get(movedPieceId);
      
      if (piecePos === fromSquare) {
        // Update position in this joint state
        positions.set(movedPieceId, toSquare);
        const newKey = createJointKey(positions);
        newJointStates[newKey] = prob;
      } else {
        // Keep as is
        newJointStates[oldKey] = prob;
      }
    }
    
    // Update the entanglement
    const entIndex = newBoard.entanglements.findIndex(e =>
      e.pieceIds.every(id => ent.pieceIds.includes(id)) &&
      ent.pieceIds.every(id => e.pieceIds.includes(id))
    );
    
    if (entIndex !== -1) {
      newBoard.entanglements[entIndex] = {
        ...ent,
        jointStates: newJointStates,
      };
    }
  }
  
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
    
    // Update existing entanglements if piece was already entangled
    if (isPieceEntangled(newBoard, move.pieceId)) {
      newBoard = updateEntanglementsAfterMerge(newBoard, move.pieceId, move.from1, move.from2, move.to);
    }
  }
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}

/**
 * Update entanglements when a piece merges from two squares to one
 */
function updateEntanglementsAfterMerge(
  board: BoardState,
  mergedPieceId: string,
  from1: SquareIndex,
  from2: SquareIndex,
  to: SquareIndex
): BoardState {
  const newBoard = cloneBoardState(board);
  
  if (!newBoard.entanglements) return newBoard;
  
  const affectedEntanglements = newBoard.entanglements.filter(e =>
    e.pieceIds.includes(mergedPieceId)
  );
  
  if (affectedEntanglements.length === 0) return newBoard;
  
  console.log('[updateEntanglementsAfterMerge] Updating entanglements for merge');
  
  for (const ent of affectedEntanglements) {
    const newJointStates: Record<string, number> = {};
    
    for (const [oldKey, prob] of Object.entries(ent.jointStates)) {
      const positions = parseJointKey(oldKey);
      const piecePos = positions.get(mergedPieceId);
      
      if (piecePos === from1 || piecePos === from2) {
        // Both source positions merge to target
        positions.set(mergedPieceId, to);
        const newKey = createJointKey(positions);
        newJointStates[newKey] = (newJointStates[newKey] || 0) + prob;
      } else {
        // Keep as is
        newJointStates[oldKey] = (newJointStates[oldKey] || 0) + prob;
      }
    }
    
    // Update the entanglement
    const entIndex = newBoard.entanglements.findIndex(e =>
      e.pieceIds.every(id => ent.pieceIds.includes(id)) &&
      ent.pieceIds.every(id => e.pieceIds.includes(id))
    );
    
    if (entIndex !== -1) {
      newBoard.entanglements[entIndex] = {
        ...ent,
        jointStates: newJointStates,
      };
    }
  }
  
  return newBoard;
}

/**
 * Execute a promotion move
 */
function executePromotionMove(board: BoardState, move: PromotionMove): BoardState {
  let newBoard = cloneBoardState(board);
  
  const piece = getPieceById(newBoard, move.pieceId);
  if (!piece) return newBoard;
  
  // If capturing during promotion, handle like capture move
  if (move.capturedPieceId) {
    const capturedPiece = getPieceById(newBoard, move.capturedPieceId);
    if (capturedPiece) {
      // Remove captured piece at target square (unitary capture)
      if (capturedPiece.superposition[move.to] === 1.0) {
        newBoard = removePiece(newBoard, move.capturedPieceId);
      } else {
        // Partial capture - remove probability at target
        const newSuperposition: Record<number, number> = {};
        let hasRemainingProb = false;
        
        for (const [square, prob] of Object.entries(capturedPiece.superposition)) {
          const sq = parseInt(square);
          if (sq !== move.to) {
            newSuperposition[sq] = prob;
            hasRemainingProb = true;
          }
        }
        
        if (hasRemainingProb) {
          newBoard = updatePieceSuperposition(newBoard, move.capturedPieceId, newSuperposition);
        } else {
          newBoard = removePiece(newBoard, move.capturedPieceId);
        }
      }
    }
  }
  
  // Move the pawn to promotion square (similar to normal move)
  const newSuperposition = moveProbability(piece, move.from, move.to);
  newBoard = updatePieceSuperposition(newBoard, move.pieceId, newSuperposition);
  
  // Update existing entanglements if piece was already entangled
  if (isPieceEntangled(newBoard, move.pieceId)) {
    newBoard = updateEntanglementsAfterMove(newBoard, move.pieceId, move.from, move.to);
  }
  
  // Change the piece type to the promoted piece
  // Find the piece in the board and update its type
  const pieceIndex = newBoard.pieces.findIndex(p => p.id === move.pieceId);
  if (pieceIndex !== -1) {
    newBoard.pieces[pieceIndex] = {
      ...newBoard.pieces[pieceIndex],
      type: move.promoteTo,
    };
  }
  
  // Clear en passant
  newBoard = setEnPassantTarget(newBoard, null);
  
  return newBoard;
}
