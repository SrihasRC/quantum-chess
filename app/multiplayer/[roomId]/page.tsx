'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GameContainer } from '@/components/layout/GameContainer';
import { Chessboard } from '@/components/board/Chessboard';
import { MoveModSelector, type MoveMode } from '@/components/game/MoveModSelector';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Clock, Flag } from 'lucide-react';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGameStore } from '@/lib/store/gameStore';
import type { Move, SquareIndex } from '@/lib/types';
import { toast } from 'sonner';
import { useNavigationGuardStore } from '@/lib/store/navigationGuardStore';

export default function MultiplayerGameRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();
  const { gameRoom, playerColor, loading, error, makeMove, resignGame, endGame } = useMultiplayerGame(roomId);
  const [moveMode, setMoveMode] = useState<MoveMode>('classic');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const gameRoomRef = useRef(gameRoom);
  const setShouldBlockNavigation = useNavigationGuardStore((state) => state.setShouldBlockNavigation);
  const setOnNavigationAttempt = useNavigationGuardStore((state) => state.setOnNavigationAttempt);
  
  // Keep ref updated
  useEffect(() => {
    gameRoomRef.current = gameRoom;
  }, [gameRoom]);

  // Set navigation guard when game is active
  useEffect(() => {
    if (gameRoom) {
      const isActive = gameRoom.status === 'active';
      setShouldBlockNavigation(isActive);
      
      if (isActive) {
        setOnNavigationAttempt(() => {
          endGame();
        });
      } else {
        setOnNavigationAttempt(null);
      }
    }
    return () => {
      setShouldBlockNavigation(false);
      setOnNavigationAttempt(null);
    };
  }, [gameRoom, setShouldBlockNavigation, setOnNavigationAttempt, endGame]);
  
  // const board = useGameStore((state) => state.board);
  // const status = useGameStore((state) => state.status);
  // const moveHistory = useGameStore((state) => state.moveHistory);
  // const movePiece = useGameStore((state) => state.movePiece);
  // const resetSelection = useGameStore((state) => state.resetSelection);

  // Save/restore game state to isolate multiplayer from local mode
  useEffect(() => {
    // Save current game state when entering multiplayer
    const savedState = {
      board: useGameStore.getState().board,
      moveHistory: useGameStore.getState().moveHistory,
      currentMoveIndex: useGameStore.getState().currentMoveIndex,
      status: useGameStore.getState().status,
    };

    return () => {
      // Restore saved state when leaving multiplayer
      useGameStore.setState(savedState);
    };
  }, []);

  // Sync game state from multiplayer to local store
  useEffect(() => {
    if (gameRoom && gameRoom.game_state) {
      const updateData: any = {
        board: gameRoom.game_state,
        moveHistory: gameRoom.move_history || [],
        currentMoveIndex: (gameRoom.move_history?.length || 0) - 1,
        // Disable move navigation in multiplayer - we don't have intermediate board states
        boardStateHistory: [],
      };
      
      // Don't override the status if it's already a terminal state (white-wins, black-wins, draw)
      // This preserves the board state after the game ends
      const currentStatus = useGameStore.getState().status;
      const isTerminalState = currentStatus === 'white-wins' || currentStatus === 'black-wins' || currentStatus === 'draw';
      
      if (gameRoom.status === 'completed' && !isTerminalState) {
        // Game just ended, always show dialog for both win and loss
        if (gameRoom.winner === 'draw') {
          updateData.status = 'draw';
        } else if (gameRoom.winner === 'white') {
          updateData.status = 'white-wins';
        } else if (gameRoom.winner === 'black') {
          updateData.status = 'black-wins';
        }
        setShowGameOverDialog(true);
      } else if (gameRoom.status === 'active' && !isTerminalState) {
        // Only set to active if not in terminal state
        updateData.status = 'active';
      }
      // If already in terminal state, don't update status - keep the board as-is
      
      useGameStore.setState(updateData);
    }
  }, [gameRoom, playerColor]);

  // Intercept piece selection and moves to enforce turn-based play
  useEffect(() => {
    if (!gameRoom || !playerColor) return;

    const originalSelectPiece = useGameStore.getState().selectPiece;
    const originalMovePiece = useGameStore.getState().movePiece;
    
    // Override selectPiece to check turns and game status
    useGameStore.setState({
      selectPiece: (square: SquareIndex) => {
        // Don't allow moves if game is over
        if (gameRoom.status === 'completed') {
          toast.error("Game is over!");
          return;
        }
        
        // Check if it's player's turn before allowing selection
        if (gameRoom.current_player !== playerColor) {
          toast.error("Not your turn!");
          return;
        }
        originalSelectPiece(square);
      },
      
      movePiece: (move: Move) => {
        // Don't allow moves if game is over
        if (gameRoom.status === 'completed') {
          toast.error("Game is over!");
          return;
        }
        
        // Double-check turn before making move
        if (gameRoom.current_player !== playerColor) {
          toast.error("Not your turn!");
          return;
        }

        // Execute move locally first
        originalMovePiece(move);

        // Small delay to ensure state is fully updated
        setTimeout(() => {
          // Get updated state after move
          const newBoard = useGameStore.getState().board;
          const newMoveHistory = useGameStore.getState().moveHistory;
          const lastMoveEntry = newMoveHistory[newMoveHistory.length - 1];
          const gameStatus = useGameStore.getState().status;

          // Check if game ended (white-wins, black-wins, draw)
          const isGameOver = gameStatus === 'white-wins' || gameStatus === 'black-wins' || gameStatus === 'draw';

          // Sync to server with game status
          makeMove(move, newBoard, lastMoveEntry, isGameOver ? gameStatus : undefined);
        }, 100);
      },
    });

    return () => {
      // Restore original functions when leaving
      useGameStore.setState({ 
        selectPiece: originalSelectPiece,
        movePiece: originalMovePiece 
      });
    };
  }, [gameRoom, playerColor, makeMove]);

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = async () => {
    if (gameRoom && gameRoom.status === 'active') {
      await endGame();
    }
    router.push('/multiplayer');
  };

  const handleResign = () => {
    setShowResignDialog(true);
  };

  const confirmResign = async () => {
    await resignGame();
    setShowResignDialog(false);
  };

  // Cleanup on unmount - end game if still active
  useEffect(() => {
    return () => {
      // Use ref to get latest gameRoom state without re-running effect
      if (gameRoomRef.current && gameRoomRef.current.status === 'active') {
        endGame();
      }
    };
  }, []); // Empty deps - only cleanup on unmount

  // Prevent navigation away from page during active game
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameRoom && gameRoom.status === 'active') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // const handleRouteChange = () => {
    //   if (gameRoom && gameRoom.status === 'active') {
    //     const shouldLeave = window.confirm(
    //       'If you leave now, your opponent will be declared the winner. Are you sure you want to leave?'
    //     );
    //     if (!shouldLeave) {
    //       throw 'Route change aborted';
    //     } else {
    //       endGame('leave');
    //     }
    //   }
    // };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Note: Next.js 13+ App Router doesn't have router events like Pages Router
    // The beforeunload event will catch browser navigation, tab closes, etc.

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameRoom, endGame]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-semibold">Loading game...</div>
          <div className="text-sm text-muted-foreground">Connecting to game room</div>
        </div>
      </div>
    );
  }

  if (error || !gameRoom) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-semibold text-destructive">Error</div>
          <div className="mb-4 text-sm text-muted-foreground">{error || 'Game not found'}</div>
          <Button onClick={handleLeave}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  const isWaiting = gameRoom.status === 'waiting';
  const isGameOver = gameRoom.status === 'completed';
  const isMyTurn = gameRoom.current_player === playerColor;

  // Determine winner message
  let winnerMessage = '';
  let winReasonMessage = '';
  if (isGameOver) {
    if (gameRoom.winner === 'draw') {
      winnerMessage = 'Game Draw';
      winReasonMessage = 'The game ended in a draw';
    } else if (gameRoom.winner === playerColor) {
      winnerMessage = 'You Won!';
      // Determine reason
      if (gameRoom.winner_reason === 'checkmate') {
        winReasonMessage = 'Victory by checkmate!';
      } else if (gameRoom.winner_reason === 'resignation') {
        winReasonMessage = 'Opponent resigned';
      } else if (gameRoom.winner_reason === 'opponent_left') {
        winReasonMessage = 'Opponent left the game';
      } else {
        winReasonMessage = 'Congratulations!';
      }
    } else {
      winnerMessage = 'You Lost';
      // Determine reason
      if (gameRoom.winner_reason === 'checkmate') {
        winReasonMessage = 'Defeated by checkmate';
      } else if (gameRoom.winner_reason === 'resignation') {
        winReasonMessage = 'You resigned';
      } else if (gameRoom.winner_reason === 'opponent_left') {
        winReasonMessage = 'You left the game';
      } else {
        winReasonMessage = 'Better luck next time';
      }
    }
  }

  return (
    <GameContainer
      isMultiplayer={true}
      gameControls={
        <>
          {!isWaiting && !isGameOver && (
            <Button 
              onClick={handleResign} 
              variant="destructive" 
              size="sm"
              className="w-full"
            >
              <Flag className="mr-2 h-4 w-4" />
              Resign
            </Button>
          )}
          <Button 
            onClick={handleLeave} 
            variant="outline" 
            size="sm"
            className={!isWaiting && !isGameOver ? "w-full" : "w-full col-span-2"}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isGameOver ? 'Back to Lobby' : 'Leave Game'}
          </Button>
        </>
      }
    >
      {isWaiting ? (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <Users className="h-16 w-16 text-muted-foreground animate-pulse" />
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Waiting for opponent...</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share the game code with your friend to start playing
            </p>
            <div className="rounded-md border bg-muted px-4 py-2 font-mono text-sm">
              {roomId}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-3 sm:gap-4 md:flex-row md:gap-6 lg:gap-8">
          <div className="flex flex-col gap-2 shrink-0 md:w-auto">
            <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
            
            {/* Turn Indicator */}
            {!isGameOver && (
              <div className={`rounded-md border p-2 text-center text-sm w-full min-w-37.5 ${isMyTurn ? 'bg-primary/10 border-primary' : 'bg-muted'}`}>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  You are {playerColor}
                </div>
              </div>
            )}
          </div>
          
          <div className="w-auto">
            <Chessboard 
              mode={moveMode} 
              flipped={playerColor === 'black'} 
            />
          </div>
        </div>
      )}

      {/* Game Over Dialog */}
      <AlertDialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-2xl">
              {winnerMessage}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {winReasonMessage}
            </AlertDialogDescription>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Total moves: {gameRoom?.move_history?.length || 0}
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowGameOverDialog(false)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Game Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Game?</AlertDialogTitle>
            <AlertDialogDescription>
              {gameRoom?.status === 'active' 
                ? "If you leave now, your opponent will be declared the winner. Are you sure you want to leave?"
                : "Are you sure you want to leave?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resign Confirmation */}
      <AlertDialog open={showResignDialog} onOpenChange={setShowResignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resign Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resign? Your opponent will be declared the winner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Resign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GameContainer>
  );
}
