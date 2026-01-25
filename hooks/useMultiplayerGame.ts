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
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          creator_id: playerId,
          status: 'waiting',
          current_player: 'white',
          game_state: initialBoard as any,
          move_history: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Game Created', {
        description: `Game ID: ${data.id.substring(0, 8)}`,
      });

      return data.id;
    } catch (err: any) {
      toast.error('Failed to create game', {
        description: err.message,
      });
      throw err;
    }
  }, [playerId]);

  // Join an existing game
  const joinGame = useCallback(async (gameId: string) => {
    try {
      // First, fetch the game to check if it's available
      const { data: game, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single();

      if (fetchError) throw new Error('Game not found');
      if (game.status !== 'waiting') throw new Error('Game already started or completed');
      if (game.opponent_id) throw new Error('Game is full');

      // Update game with opponent
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          opponent_id: playerId,
          status: 'active',
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      toast.success('Joined Game', {
        description: 'You are playing as Black',
      });

      return gameId;
    } catch (err: any) {
      toast.error('Failed to join game', {
        description: err.message,
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
      const nextPlayer = gameRoom.current_player === 'white' ? 'black' : 'white';

      const updateData: any = {
        game_state: newBoardState,
        move_history: newMoveHistory,
      };

      // If game ended, update status and winner
      if (gameStatus === 'white-wins') {
        updateData.status = 'completed';
        updateData.winner = 'white';
        console.log('Game ended - White wins!');
      } else if (gameStatus === 'black-wins') {
        updateData.status = 'completed';
        updateData.winner = 'black';
        console.log('Game ended - Black wins!');
      } else if (gameStatus === 'draw') {
        updateData.status = 'completed';
        updateData.winner = 'draw';
        console.log('Game ended - Draw');
      } else {
        // Game continues - switch turns
        updateData.current_player = nextPlayer;
      }

      const { error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', gameRoom.id);

      if (error) throw error;

      if (gameStatus === 'white-wins' || gameStatus === 'black-wins') {
        const didWin = (gameStatus === 'white-wins' && playerColor === 'white') || 
                      (gameStatus === 'black-wins' && playerColor === 'black');
        if (didWin) {
          toast.success('Victory!', {
            description: 'You won the game!',
          });
        }
      } else if (gameStatus === 'draw') {
        toast.info('Game Draw', {
          description: 'The game ended in a draw',
        });
      }
    } catch (err: any) {
      toast.error('Failed to make move', {
        description: err.message,
      });
      throw err;
    }
  }, [gameRoom, playerColor]);

  // Resign from game
  const resignGame = useCallback(async () => {
    if (!gameRoom || !playerColor) return;

    try {
      const winner = playerColor === 'white' ? 'black' : 'white';
      
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'completed',
          winner: winner,
        })
        .eq('id', gameRoom.id);

      if (error) throw error;

      toast.info('You resigned', {
        description: 'Opponent wins',
      });
    } catch (err: any) {
      toast.error('Failed to resign', {
        description: err.message,
      });
      throw err;
    }
  }, [gameRoom, playerColor]);

  // End game (when player leaves)
  const endGame = useCallback(async (reason: 'leave' | 'disconnect') => {
    if (!gameRoom || !playerColor) return;

    try {
      const winner = playerColor === 'white' ? 'black' : 'white';
      
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'completed',
          winner: winner,
        })
        .eq('id', gameRoom.id);

      if (error) throw error;
    } catch (err: any) {
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
        const { data, error } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (error) throw error;

        setGameRoom(data as GameRoom);
        
        // Determine player color
        if (data.creator_id === playerId) {
          setPlayerColor('white');
        } else if (data.opponent_id === playerId) {
          setPlayerColor('black');
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
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
          console.log('Realtime update received:', payload);
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
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to game room updates');
        }
      });

    return () => {
      console.log('Unsubscribing from channel');
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
