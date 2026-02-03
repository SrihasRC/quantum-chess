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
          winner_reason: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | 'timeout' | 'draw_agreement' | null
          creator_ready: boolean
          opponent_ready: boolean
          white_time_remaining: number
          black_time_remaining: number
          last_move_time: number | null
          draw_offered_by: 'white' | 'black' | null
          creator_username: string | null
          opponent_username: string | null
          is_tournament: boolean
          tournament_round: number | null
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
          winner_reason?: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | 'timeout' | 'draw_agreement' | null
          creator_ready?: boolean
          opponent_ready?: boolean
          white_time_remaining?: number
          black_time_remaining?: number
          last_move_time?: number | null
          draw_offered_by?: 'white' | 'black' | null
          creator_username?: string | null
          opponent_username?: string | null
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
          winner_reason?: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | 'timeout' | 'draw_agreement' | null
          creator_ready?: boolean
          opponent_ready?: boolean
          white_time_remaining?: number
          black_time_remaining?: number
          last_move_time?: number | null
          draw_offered_by?: 'white' | 'black' | null
          creator_username?: string | null
          opponent_username?: string | null
        }
      }
      player_stats: {
        Row: {
          username: string
          wins: number
          losses: number
          draws: number
          points: number
          games_played: number
          created_at: string
          updated_at: string
          is_tournament_player: boolean
        }
        Insert: {
          username: string
          wins?: number
          losses?: number
          draws?: number
          points?: number
          games_played?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string
          wins?: number
          losses?: number
          draws?: number
          points?: number
          games_played?: number
          created_at?: string
          updated_at?: string
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
  winner_reason?: 'checkmate' | 'resignation' | 'opponent_left' | 'draw' | 'timeout' | 'draw_agreement' | null;
  creator_ready: boolean;
  opponent_ready: boolean;
  white_time_remaining: number;
  black_time_remaining: number;
  last_move_time: number | null;
  draw_offered_by: 'white' | 'black' | null;
  creator_username: string | null;
  opponent_username: string | null;
  is_tournament: boolean;
  tournament_round: number | null;
}

export interface PlayerStats {
  username: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  games_played: number;
  created_at: string;
  updated_at: string;
  is_tournament_player: boolean;
}
  updated_at: string;
  is_tournament_player: boolean;
}
