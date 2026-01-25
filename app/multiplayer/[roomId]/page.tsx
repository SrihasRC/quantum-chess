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

export default function MultiplayerGameRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();
  const { gameRoom, playerColor, loading, error, makeMove, resignGame, endGame } = useMultiplayerGame(roomId);
  const [moveMode, setMoveMode] = useState<MoveMode>('classic');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const gameRoomRef = useRef(gameRoom);
  
  // Keep ref updated
  useEffect(() => {
    gameRoomRef.current = gameRoom;
  }, [gameRoom]);
  
  const board = useGameStore((state) => state.board);
  const status = useGameStore((state) => state.status);
  const moveHistory = useGameStore((state) => state.moveHistory);
  const movePiece = useGameStore((state) => state.movePiece);
  const resetSelection = useGameStore((state) => state.resetSelection);

  // Sync game state from multiplayer to local store
  useEffect(() => {
    if (gameRoom && gameRoom.game_state) {
      useGameStore.setState({
        board: gameRoom.game_state,
        moveHistory: gameRoom.move_history || [],
        currentMoveIndex: (gameRoom.move_history?.length || 0) - 1,
        status: gameRoom.status === 'completed' ? 
          (gameRoom.winner === 'draw' ? 'draw' : gameRoom.winner === playerColor ? 'checkmate' : 'checkmate') 
          : 'active',
      });
    }
  }, [gameRoom, playerColor]);

  // Intercept piece selection and moves to enforce turn-based play
  useEffect(() => {
    if (!gameRoom || !playerColor || gameRoom.status !== 'active') return;

    const originalSelectPiece = useGameStore.getState().selectPiece;
    const originalMovePiece = useGameStore.getState().movePiece;
    
    // Override selectPiece to check turns
    useGameStore.setState({
      selectPiece: (square: SquareIndex) => {
        // Check if it's player's turn before allowing selection
        if (gameRoom.current_player !== playerColor) {
          toast.error("Not your turn!");
          return;
        }
        originalSelectPiece(square);
      },
      
      movePiece: (move: Move) => {
        // Double-check turn before making move
        if (gameRoom.current_player !== playerColor) {
          toast.error("Not your turn!");
          return;
        }

        // Execute move locally first
        originalMovePiece(move);

        // Get updated state after move
        const newBoard = useGameStore.getState().board;
        const newMoveHistory = useGameStore.getState().moveHistory;
        const lastMoveEntry = newMoveHistory[newMoveHistory.length - 1];
        const gameStatus = useGameStore.getState().status;

        // Sync to server with game status
        makeMove(move, newBoard, lastMoveEntry, gameStatus);
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
      await endGame('leave');
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
        endGame('disconnect');
      }
    };
  }, []); // Empty deps - only cleanup on unmount

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
  if (isGameOver) {
    if (gameRoom.winner === 'draw') {
      winnerMessage = 'Game Draw';
    } else if (gameRoom.winner === playerColor) {
      winnerMessage = 'You Won!';
    } else {
      winnerMessage = 'You Lost';
    }
  }

  return (
    <GameContainer
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
      ) : isGameOver ? (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">{winnerMessage}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {gameRoom.winner === 'draw' ? 'The game ended in a draw' : 
               gameRoom.winner === playerColor ? 'Congratulations!' : 'Better luck next time'}
            </p>
            <div className="text-xs text-muted-foreground">
              Total moves: {gameRoom.move_history.length}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-3 sm:gap-4 md:flex-row md:gap-6 lg:gap-8">
          <div className="flex w-full flex-col gap-2 shrink-0 md:w-auto">
            <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
            
            {/* Turn Indicator */}
            <div className={`rounded-md border p-2 text-center text-sm ${isMyTurn ? 'bg-primary/10 border-primary' : 'bg-muted'}`}>
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
          </div>
          
          <div className="w-auto">
            <Chessboard 
              mode={moveMode} 
              flipped={playerColor === 'black'} 
            />
          </div>
        </div>
      )}

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
