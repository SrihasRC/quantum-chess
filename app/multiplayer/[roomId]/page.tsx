'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GameContainer } from '@/components/layout/GameContainer';
import { Chessboard } from '@/components/board/Chessboard';
import { MoveModSelector, type MoveMode } from '@/components/game/MoveModSelector';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Clock, Flag, Handshake } from 'lucide-react';
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
  const { 
    gameRoom, 
    playerColor, 
    loading, 
    error, 
    makeMove, 
    resignGame, 
    endGame, 
    setPlayerReady,
    offerDraw,
    acceptDraw,
    declineDraw,
  } = useMultiplayerGame(roomId);
  const resetSelection = useGameStore((state) => state.resetSelection);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const [moveMode, setMoveMode] = useState<MoveMode>('classic');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showDrawOfferDialog, setShowDrawOfferDialog] = useState(false);
  const [showDrawReceivedDialog, setShowDrawReceivedDialog] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [lastMoveCount, setLastMoveCount] = useState(0);
  const [hasSetReady, setHasSetReady] = useState(false);
  const [waitingForTurnSwitch, setWaitingForTurnSwitch] = useState(false);
  const gameRoomRef = useRef(gameRoom);
  const lastTurnRef = useRef<'white' | 'black' | null>(null);
  const setShouldBlockNavigation = useNavigationGuardStore((state) => state.setShouldBlockNavigation);
  const setOnNavigationAttempt = useNavigationGuardStore((state) => state.setOnNavigationAttempt);
  
  // Keep ref updated
  useEffect(() => {
    gameRoomRef.current = gameRoom;
  }, [gameRoom]);

  // Monitor turn changes and unlock moves when turn switches
  useEffect(() => {
    if (!gameRoom) return;
    
    console.log('[Turn Monitor] Current player:', gameRoom.current_player, 'Last turn:', lastTurnRef.current, 'Waiting:', waitingForTurnSwitch);
    
    // If we were waiting for a turn switch and it happened, unlock moves
    if (waitingForTurnSwitch && lastTurnRef.current !== null && gameRoom.current_player !== lastTurnRef.current) {
      console.log('[Turn Monitor] Turn switched! Unlocking moves');
      setWaitingForTurnSwitch(false);
    }
    
    lastTurnRef.current = gameRoom.current_player;
  }, [gameRoom?.current_player, waitingForTurnSwitch]);

  // Set player as ready when they enter the room (only once)
  useEffect(() => {
    if (gameRoom && playerColor && !hasSetReady) {
      setPlayerReady();
      setHasSetReady(true);
    }
  }, [gameRoom?.id, playerColor, hasSetReady, setPlayerReady]);

  // Reset selection when move mode changes
  useEffect(() => {
    resetSelection();
  }, [moveMode, resetSelection]);

  // Reset mode to classic after each move
  useEffect(() => {
    if (moveHistory.length > lastMoveCount) {
      setMoveMode('classic');
      setLastMoveCount(moveHistory.length);
    } else if (lastMoveCount === 0 && moveHistory.length > 0) {
      // Initialize lastMoveCount if this is the first sync
      setLastMoveCount(moveHistory.length);
    }
  }, [moveHistory.length, lastMoveCount]);

  // Set navigation guard when game is active
  useEffect(() => {
    if (gameRoom) {
      const isActive = gameRoom.status === 'active' || (gameRoom.creator_ready && gameRoom.opponent_ready);
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

  // Sync game state from multiplayer to local store
  useEffect(() => {
    if (gameRoom && gameRoom.game_state) {
      console.log('[Board Sync] Syncing from server:', {
        serverHistoryLength: gameRoom.move_history?.length,
        serverPieceCount: gameRoom.game_state.pieces?.length,
        localHistoryLength: useGameStore.getState().moveHistory.length,
        localPieceCount: useGameStore.getState().board.pieces?.length
      });
      
      const updateData: {
        board: typeof gameRoom.game_state;
        moveHistory: typeof gameRoom.move_history;
        currentMoveIndex: number;
        boardStateHistory: never[];
        status?: 'active' | 'white-wins' | 'black-wins' | 'draw';
      } = {
        board: gameRoom.game_state,
        moveHistory: gameRoom.move_history || [],
        currentMoveIndex: (gameRoom.move_history?.length || 0) - 1,
        boardStateHistory: [],
      };
      
      // Update status based on game state
      if (gameRoom.status === 'completed') {
        if (gameRoom.winner === 'draw') {
          updateData.status = 'draw';
        } else if (gameRoom.winner === 'white') {
          updateData.status = 'white-wins';
        } else if (gameRoom.winner === 'black') {
          updateData.status = 'black-wins';
        }
        
        // Show dialog on first transition to completed
        const currentStatus = useGameStore.getState().status;
        if (currentStatus === 'active') {
          setShowGameOverDialog(true);
        }
      } else {
        updateData.status = 'active';
      }
      
      useGameStore.setState(updateData);
      console.log('[Board Sync] Synced to local store');
    }
  }, [gameRoom]);


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
        
        // Don't allow moves if both players aren't ready yet
        if (!gameRoom.creator_ready || !gameRoom.opponent_ready) {
          toast.error("Waiting for opponent...");
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
        console.log('[Move Attempt] Move:', move, 'Player:', playerColor, 'Current turn:', gameRoom.current_player, 'Locked:', waitingForTurnSwitch);
        console.log('[Move Attempt] Local history:', useGameStore.getState().moveHistory.length, 'Server history:', gameRoom.move_history.length);
        
        // Don't allow moves if game is over
        if (gameRoom.status === 'completed') {
          toast.error("Game is over!");
          return;
        }
        
        // Don't allow moves if both players aren't ready yet
        if (!gameRoom.creator_ready || !gameRoom.opponent_ready) {
          toast.error("Waiting for opponent...");
          return;
        }
        
        // Block moves if we're waiting for turn to switch from previous move
        if (waitingForTurnSwitch) {
          console.log('[Move Blocked] Waiting for turn switch');
          toast.error("Please wait for opponent's turn...");
          return;
        }
        
        // Make sure our local state is synced with server before allowing move
        if (useGameStore.getState().moveHistory.length !== gameRoom.move_history.length) {
          console.log('[Move Blocked] Waiting for sync - local and server history mismatch');
          toast.error("Syncing game state...");
          return;
        }
        
        // Double-check turn before making move
        if (gameRoom.current_player !== playerColor) {
          console.log('[Move Rejected] Not your turn');
          toast.error("Not your turn!");
          return;
        }

        // Execute move locally first
        originalMovePiece(move);

        // Lock moves until subscription confirms turn switch
        console.log('[Move Executed] Locking moves until turn switches');
        setWaitingForTurnSwitch(true);

        // Small delay to ensure state is fully updated
        setTimeout(async () => {
          try {
            // Get updated state after move
            const newBoard = useGameStore.getState().board;
            const newMoveHistory = useGameStore.getState().moveHistory;
            const lastMoveEntry = newMoveHistory[newMoveHistory.length - 1];
            const gameStatus = useGameStore.getState().status;

            console.log('[Move Sync] About to send:', {
              boardPieceCount: newBoard.pieces?.length,
              historyLength: newMoveHistory.length,
              lastMove: lastMoveEntry
            });

            // Check if game ended (white-wins, black-wins, draw)
            const isGameOver = gameStatus === 'white-wins' || gameStatus === 'black-wins' || gameStatus === 'draw';

            console.log('[Move Sync] Syncing to server...');
            // Sync to server with game status
            await makeMove(move, newBoard, lastMoveEntry, isGameOver ? gameStatus : undefined);
            console.log('[Move Sync] Successfully synced to server');
          } catch (error) {
            console.error('[Move Sync] Failed to sync move:', error);
            toast.error('Move failed to sync. Please try again.');
            // Unlock moves on error
            setWaitingForTurnSwitch(false);
          }
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
  }, [gameRoom, playerColor, makeMove, waitingForTurnSwitch]);

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

  const handleOfferDraw = () => {
    setShowDrawOfferDialog(true);
  };

  const confirmOfferDraw = async () => {
    await offerDraw();
    setShowDrawOfferDialog(false);
  };

  const handleAcceptDraw = async () => {
    await acceptDraw();
    setShowDrawReceivedDialog(false);
  };

  const handleDeclineDraw = async () => {
    await declineDraw();
    setShowDrawReceivedDialog(false);
  };

  // Show draw offer dialog when opponent offers draw
  useEffect(() => {
    if (gameRoom?.draw_offered_by && gameRoom.draw_offered_by !== playerColor) {
      setShowDrawReceivedDialog(true);
    } else {
      setShowDrawReceivedDialog(false);
    }
  }, [gameRoom?.draw_offered_by, playerColor]);

  // Notify player when their draw offer is declined
  useEffect(() => {
    const prevDrawOfferedBy = gameRoomRef.current?.draw_offered_by;
    const currentDrawOfferedBy = gameRoom?.draw_offered_by;
    
    // If draw_offered_by changed from player's color to null, it was declined
    if (prevDrawOfferedBy === playerColor && currentDrawOfferedBy === null && gameRoom?.status === 'active') {
      toast.error('Draw Declined', {
        description: 'Your opponent declined the draw offer',
      });
    }
  }, [gameRoom?.draw_offered_by, gameRoom?.status, playerColor]);



  // Cleanup on unmount - end game if still active
  useEffect(() => {
    return () => {
      // Use ref to get latest gameRoom state without re-running effect
      if (gameRoomRef.current && gameRoomRef.current.status === 'active') {
        endGame();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isWaiting = gameRoom.status === 'waiting' || !gameRoom.creator_ready || !gameRoom.opponent_ready;
  const isGameOver = gameRoom.status === 'completed';
  const isMyTurn = gameRoom.current_player === playerColor;

  // Get player usernames
  const whiteUsername = gameRoom.creator_username || 'White';
  const blackUsername = gameRoom.opponent_username || 'Black';
  const myUsername = playerColor === 'white' ? whiteUsername : blackUsername;
  const opponentUsername = playerColor === 'white' ? blackUsername : whiteUsername;

  // Determine winner message
  let winnerMessage = '';
  let winReasonMessage = '';
  if (isGameOver) {
    if (gameRoom.winner === 'draw') {
      winnerMessage = 'Game Draw';
      if (gameRoom.winner_reason === 'draw_agreement') {
        winReasonMessage = 'Draw agreed by both players';
      } else {
        winReasonMessage = 'The game ended in a draw';
      }
    } else {
      const winnerUsername = gameRoom.winner === 'white' ? whiteUsername : blackUsername;
      winnerMessage = `${winnerUsername} Won!`;
      
      // Determine reason
      if (gameRoom.winner_reason === 'checkmate') {
        winReasonMessage = 'Victory by checkmate';
      } else if (gameRoom.winner_reason === 'resignation') {
        winReasonMessage = 'Won by resignation';
      } else if (gameRoom.winner_reason === 'opponent_left') {
        winReasonMessage = 'Opponent left the game';
      } else if (gameRoom.winner_reason === 'timeout') {
        winReasonMessage = 'Won by timeout';
      } else {
        winReasonMessage = 'Game completed';
      }
    }
  }

  return (
    <GameContainer
      isMultiplayer={true}
      gameControls={
        <>
          {!isWaiting && !isGameOver && (
            <>
              <Button 
                onClick={handleOfferDraw} 
                variant="outline" 
                size="sm"
                className="w-full"
                disabled={!!gameRoom.draw_offered_by}
              >
                <Handshake className="mr-2 h-4 w-4" />
                {gameRoom.draw_offered_by === playerColor ? 'Draw Offered' : 'Offer Draw'}
              </Button>
              <Button 
                onClick={handleResign} 
                variant="destructive" 
                size="sm"
                className="w-full"
              >
                <Flag className="mr-2 h-4 w-4" />
                Resign
              </Button>
            </>
          )}
          <Button 
            onClick={handleLeave} 
            variant="outline" 
            size="sm"
            className={!isWaiting && !isGameOver ? "w-full col-span-2" : "w-full col-span-2"}
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
            
            {/* Player Info */}
            <div className="rounded-md border p-2 text-sm w-full min-w-37.5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">You:</span>
                  <span className="font-medium">{myUsername}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Opponent:</span>
                  <span className="font-medium">{opponentUsername}</span>
                </div>
              </div>
            </div>
            
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

      {/* Offer Draw Confirmation */}
      <AlertDialog open={showDrawOfferDialog} onOpenChange={setShowDrawOfferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offer Draw?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to offer a draw to your opponent?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOfferDraw}>
              Offer Draw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draw Received Dialog */}
      <AlertDialog open={showDrawReceivedDialog} onOpenChange={setShowDrawReceivedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Draw Offered</AlertDialogTitle>
            <AlertDialogDescription>
              Your opponent has offered a draw. Do you accept?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeclineDraw}>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptDraw}>
              Accept Draw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GameContainer>
  );
}
