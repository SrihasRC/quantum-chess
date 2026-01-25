import type { BoardState, MoveHistoryEntry } from '@/lib/types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      game_rooms: {
        Row: {
          id: string
          created_at: string
          creator_id: string
          opponent_id: string | null
          status: 'waiting' | 'active' | 'completed'
          current_player: 'white' | 'black'
          game_state: Json
          move_history: Json
          winner: 'white' | 'black' | 'draw' | null
          winner_reason: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | null
        }
        Insert: {
          id?: string
          created_at?: string
          creator_id: string
          opponent_id?: string | null
          status?: 'waiting' | 'active' | 'completed'
          current_player?: 'white' | 'black'
          game_state: Json
          move_history?: Json
          winner?: 'white' | 'black' | 'draw' | null
          winner_reason?: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | null
        }
        Update: {
          id?: string
          created_at?: string
          creator_id?: string
          opponent_id?: string | null
          status?: 'waiting' | 'active' | 'completed'
          current_player?: 'white' | 'black'
          game_state?: Json
          move_history?: Json
          winner?: 'white' | 'black' | 'draw' | null
          winner_reason?: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | null
        }
      }
    }
  }
}

export interface GameRoom {
  id: string;
  created_at: string;
  creator_id: string;
  opponent_id: string | null;
  status: 'waiting' | 'active' | 'completed';
  current_player: 'white' | 'black';
  game_state: BoardState;
  move_history: MoveHistoryEntry[];
  winner: 'white' | 'black' | 'draw' | null;
  winner_reason?: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | null;
}
