'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { GameRoom } from '@/lib/supabase/types';
import type { Move, BoardState, MoveHistoryEntry } from '@/lib/types';
import { createInitialBoardState } from '@/lib/engine/state';
import { toast } from 'sonner';

export function useMultiplayerGame(roomId: string | null) {
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
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

  // Create a new game room
  const createGame = useCallback(async () => {
    try {
      const initialBoard = createInitialBoardState();
      const { data, error } = (await supabase
        .from('game_rooms')
        .insert({
          creator_id: playerId,
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
  const joinGame = useCallback(async (gameId: string) => {
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

      // Update game with opponent
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          opponent_id: playerId,
          status: 'active',
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

  // Make a move
  const makeMove = useCallback(async (move: Move, newBoardState: BoardState, moveEntry: MoveHistoryEntry, gameStatus?: string) => {
    if (!gameRoom) return;

    // Check if it's the player's turn
    if (playerColor !== gameRoom.current_player) {
      toast.error("Not your turn");
      return;
    }

    try {
      const newMoveHistory = [...gameRoom.move_history, moveEntry];
      const nextPlayer = gameRoom.current_player === 'white' ? ('black' as const) : ('white' as const);

      const updateData: Partial<GameRoom> = {
        game_state: newBoardState,
        move_history: newMoveHistory,
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
        .eq('id', gameRoom.id);

      if (error) throw error;

      // Don't show toast here - let the game room page handle the dialog
    } catch (err) {
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
  };
}
