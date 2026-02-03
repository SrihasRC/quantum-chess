'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { updatePlayerStats } from '@/lib/supabase/stats';
import type { GameRoom } from '@/lib/supabase/types';
import type { Move, BoardState, MoveHistoryEntry } from '@/lib/types';
import { createInitialBoardState } from '@/lib/engine/state';
import { toast } from 'sonner';

export function useMultiplayerGame(roomId: string | null) {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const gameRoomRef = useRef<GameRoom | null>(null);
  const [playerId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('playerId');
      if (!id) {
        id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('playerId', id);
      }
      return id;
    }
    return '';
  });
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    gameRoomRef.current = gameRoom;
  }, [gameRoom]);

  // Create a new game room
  const createGame = useCallback(async (username?: string) => {
    try {
      const initialBoard = createInitialBoardState();
      const { data, error} = (await supabase
        .from('game_rooms')
        .insert({
          creator_id: playerId,
          creator_username: username || null,
          status: 'waiting',
          current_player: 'white',
          game_state: initialBoard,
          move_history: [],
        } as never)
        .select()
        .single()) as { data: GameRoom | null; error: unknown };

      if (error) throw error;
      if (!data) throw new Error('Failed to create game');

      toast.success('Game Created', {
        description: `Game ID: ${data.id.substring(0, 8)}`,
      });

      return data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to create game', {
        description: errorMessage,
      });
      throw err;
    }
  }, [playerId]);

  // Join an existing game
  const joinGame = useCallback(async (gameId: string, username?: string) => {
    try {
      // First, fetch the game to check if it's available
      const { data: game, error: fetchError } = (await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single()) as { data: GameRoom | null; error: unknown };

      if (fetchError) throw new Error('Game not found');
      if (!game) throw new Error('Game not found');
      
      if (game.status !== 'waiting') throw new Error('Game already started or completed');
      if (game.opponent_id) throw new Error('Game is full');

      // Update game with opponent (but don't set to active yet)
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          opponent_id: playerId,
          opponent_username: username || null,
        } as never)
        .eq('id', gameId);

      if (updateError) throw updateError;

      toast.success('Joined Game', {
        description: 'You are playing as Black',
      });

      return gameId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to join game', {
        description: errorMessage,
      });
      throw err;
    }
  }, [playerId]);

  // Set player as ready when they enter the room
  const setPlayerReady = useCallback(async () => {
    if (!gameRoom || !playerColor) return;

    try {
      const updateData: any = {};
      
      if (playerColor === 'white') {
        updateData.creator_ready = true;
      } else {
        updateData.opponent_ready = true;
      }

      // Check if both players will be ready after this update
      const bothReady = playerColor === 'white' 
        ? gameRoom.opponent_ready 
        : gameRoom.creator_ready;

      // If both players are ready, set status to active and start timer
      if (bothReady) {
        updateData.status = 'active';
        updateData.last_move_time = Date.now();
        // Initialize timer for both players if not set
        if (!gameRoom.white_time_remaining) {
          updateData.white_time_remaining = 300;
        }
        if (!gameRoom.black_time_remaining) {
          updateData.black_time_remaining = 300;
        }
      }

      const { error } = await supabase
        .from('game_rooms')
        .update(updateData as never)
        .eq('id', gameRoom.id);

      if (error) {
        console.error('Failed to set player ready:', error);
        throw error;
      }
    } catch (err) {
      console.error('Failed to set player ready - full error:', err);
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error('Failed to set ready status', {
        description: errorMessage,
      });
    }
  }, [gameRoom, playerColor]);

  // Make a move
  const makeMove = useCallback(async (move: Move, newBoardState: BoardState, moveEntry: MoveHistoryEntry, gameStatus?: string) => {
    // Use ref to get the latest gameRoom state (avoiding stale closures)
    const currentGameRoom = gameRoomRef.current;
    if (!currentGameRoom) return;

    // Don't check turn here - it's already validated in the page before movePiece is called
    // Checking here causes race conditions with real-time updates
    console.log('Making move:', { from: move.from, to: move.to, playerColor });

    try {
      const newMoveHistory = [...currentGameRoom.move_history, moveEntry];
      // Determine next player based on who made the move, not current_player (which might be stale)
      const nextPlayer = playerColor === 'white' ? ('black' as const) : ('white' as const);

      const updateData: Partial<GameRoom> = {
        game_state: newBoardState,
        move_history: newMoveHistory,
        last_move_time: Date.now() as any,
        draw_offered_by: null, // Clear any pending draw offer when a move is made
      };

      // If game ended, update status and winner
      if (gameStatus === 'white-wins') {
        updateData.status = 'completed';
        updateData.winner = 'white';
        updateData.winner_reason = 'checkmate';
        if (playerColor === 'white') {
          toast.success('You Won!', {
            description: 'Victory by checkmate!',
          });
        }
      } else if (gameStatus === 'black-wins') {
        updateData.status = 'completed';
        updateData.winner = 'black';
        updateData.winner_reason = 'checkmate';
        if (playerColor === 'black') {
          toast.success('You Won!', {
            description: 'Victory by checkmate!',
          });
        }
      } else if (gameStatus === 'draw') {
        updateData.status = 'completed';
        updateData.winner = 'draw';
        updateData.winner_reason = 'draw';
        toast.info('Game Draw', {
          description: 'The game ended in a draw',
        });
      } else {
        // Game continues - switch turns
        updateData.current_player = nextPlayer;
      }

      const { error } = await supabase
        .from('game_rooms')
        .update(updateData as never)
        .eq('id', currentGameRoom.id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Move synced to database successfully, next player:', nextPlayer);

      // Update player stats if game is completed
      if (updateData.status === 'completed' && currentGameRoom.creator_username && currentGameRoom.opponent_username) {
        if (updateData.winner === 'draw') {
          // Both players get a draw
          await updatePlayerStats(currentGameRoom.creator_username, 'draw');
          await updatePlayerStats(currentGameRoom.opponent_username, 'draw');
        } else if (updateData.winner === 'white') {
          // White wins, black loses
          await updatePlayerStats(currentGameRoom.creator_username, 'win');
          await updatePlayerStats(currentGameRoom.opponent_username, 'loss');
        } else if (updateData.winner === 'black') {
          // Black wins, white loses
          await updatePlayerStats(currentGameRoom.opponent_username, 'win');
          await updatePlayerStats(currentGameRoom.creator_username, 'loss');
        }
      }

      // Don't show toast here - let the game room page handle the dialog
    } catch (err) {
      console.error('makeMove error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to make move', {
        description: errorMessage,
      });
      throw err;
    }
  }, [gameRoom, playerColor]);

  // Resign from game
  const resignGame = useCallback(async () => {
    if (!gameRoom || !playerColor) return;

    try {
      const winner = playerColor === 'white' ? ('black' as const) : ('white' as const);
      
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'completed',
          winner: winner,
          winner_reason: 'resignation',
        } as never)
        .eq('id', gameRoom.id);

      if (error) throw error;

      // Update player stats
      if (gameRoom.creator_username && gameRoom.opponent_username) {
        if (playerColor === 'white') {
          await updatePlayerStats(gameRoom.creator_username, 'loss');
          await updatePlayerStats(gameRoom.opponent_username, 'win');
        } else {
          await updatePlayerStats(gameRoom.opponent_username, 'loss');
          await updatePlayerStats(gameRoom.creator_username, 'win');
        }
      }

      toast.info('You resigned', {
        description: 'Opponent wins',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to resign', {
        description: errorMessage,
      });
      throw err;
    }
  }, [gameRoom, playerColor]);

  // End game (when player leaves)
  const endGame = useCallback(async () => {
    if (!gameRoom || !playerColor) return;

    try {
      const winner = playerColor === 'white' ? ('black' as const) : ('white' as const);
      
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'completed',
          winner: winner,
          winner_reason: 'opponent_left',
        } as never)
        .eq('id', gameRoom.id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to end game:', err);
    }
  }, [gameRoom, playerColor]);

  // Offer draw
  const offerDraw = useCallback(async () => {
    if (!gameRoom || !playerColor) return;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          draw_offered_by: playerColor,
        } as never)
        .eq('id', gameRoom.id);

      if (error) throw error;

      toast.info('Draw offered', {
        description: 'Waiting for opponent response',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to offer draw', {
        description: errorMessage,
      });
      throw err;
    }
  }, [gameRoom, playerColor]);

  // Accept draw
  const acceptDraw = useCallback(async () => {
    if (!gameRoom) return;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'completed',
          winner: 'draw',
          winner_reason: 'draw_agreement',
          draw_offered_by: null,
        } as never)
        .eq('id', gameRoom.id);

      if (error) throw error;

      toast.info('Draw accepted', {
        description: 'Game ended in a draw',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to accept draw', {
        description: errorMessage,
      });
      throw err;
    }
  }, [gameRoom]);

  // Decline draw
  const declineDraw = useCallback(async () => {
    if (!gameRoom) return;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          draw_offered_by: null,
        } as never)
        .eq('id', gameRoom.id);

      if (error) throw error;

      toast.info('Draw declined');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to decline draw', {
        description: errorMessage,
      });
      throw err;
    }
  }, [gameRoom]);

  // Update timer (deduct time from current player)
  const updateTimer = useCallback(async (elapsedSeconds: number) => {
    if (!gameRoom || gameRoom.status !== 'active') return;

    const currentPlayer = gameRoom.current_player;
    const timeKey = currentPlayer === 'white' ? 'white_time_remaining' : 'black_time_remaining';
    const currentTime = gameRoom[timeKey];
    const newTime = Math.max(0, currentTime - elapsedSeconds);

    // Check if time ran out
    if (newTime === 0) {
      const winner = currentPlayer === 'white' ? ('black' as const) : ('white' as const);
      
      try {
        const { error } = await supabase
          .from('game_rooms')
          .update({
            status: 'completed',
            winner: winner,
            winner_reason: 'timeout',
            [timeKey]: 0,
          } as never)
          .eq('id', gameRoom.id);

        if (error) {
          console.error('Failed to end game on timeout:', error);
        }

        // Update player stats on timeout
        if (gameRoom.creator_username && gameRoom.opponent_username) {
          if (winner === 'white') {
            await updatePlayerStats(gameRoom.creator_username, 'win');
            await updatePlayerStats(gameRoom.opponent_username, 'loss');
          } else {
            await updatePlayerStats(gameRoom.opponent_username, 'win');
            await updatePlayerStats(gameRoom.creator_username, 'loss');
          }
        }
      } catch (err) {
        console.error('Failed to end game on timeout:', err);
      }
      return;
    }

    // Update database every second for accurate timing
    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          [timeKey]: newTime,
        } as never)
        .eq('id', gameRoom.id);

      if (error) {
        console.error('Failed to update timer:', error);
      }
    } catch (err) {
      console.error('Failed to update timer:', err);
    }
  }, [gameRoom]);

  // Subscribe to game updates
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const fetchGame = async () => {
      try {
        const { data, error } = (await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single()) as { data: GameRoom | null; error: unknown };

        if (error) throw error;
        if (!data) throw new Error('Game not found');

        setGameRoom(data);
        
        // Determine player color
        if (data.creator_id === playerId) {
          setPlayerColor('white');
        } else if (data.opponent_id === playerId) {
          setPlayerColor('black');
        }

        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchGame();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`game_room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) {
            const newGameRoom = payload.new as GameRoom;
            setGameRoom(newGameRoom);
            
            // Update player color if opponent joined
            if (newGameRoom.creator_id === playerId) {
              setPlayerColor('white');
            } else if (newGameRoom.opponent_id === playerId) {
              setPlayerColor('black');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId]);

  return {
    gameRoom,
    playerId,
    playerColor,
    loading,
    error,
    createGame,
    joinGame,
    makeMove,
    resignGame,
    endGame,
    setPlayerReady,
    offerDraw,
    acceptDraw,
    declineDraw,
    updateTimer,
  };
}
