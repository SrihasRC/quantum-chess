import { supabase } from './client';
import type { PlayerStats } from './types';
import type { BoardState } from '@/lib/types';

/**
 * Calculate bonus points based on remaining pieces
 * Maximum 32 pieces (16 per side), normalized to 0-2 bonus points
 */
function calculatePieceBonus(board: BoardState, playerColor: 'white' | 'black'): number {
  if (!board || !board.pieces) return 0;
  
  // Count pieces for the player
  // For quantum pieces, count them if their highest probability location is >= 0.5
  const playerPieces = board.pieces.filter(p => {
    if (p.color !== playerColor) return false;
    
    // If not in superposition, count it
    if (!p.isSuperposed) return true;
    
    // If in superposition, only count if max probability >= 0.5
    const maxProbability = Math.max(...Object.values(p.superposition));
    return maxProbability >= 0.5;
  }).length;
  
  // Normalize: 0 pieces = 0 bonus, 16 pieces = 2 bonus points
  // This gives diminishing returns (having more pieces left = better performance)
  const bonus = (playerPieces / 16) * 2;
  return Math.min(bonus, 2); // Cap at 2 bonus points
}

export async function updatePlayerStats(
  username: string,
  result: 'win' | 'loss' | 'draw',
  board?: BoardState,
  playerColor?: 'white' | 'black'
) {
  try {
    // Get current stats
    const { data: stats, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('username', username)
      .single() as { data: PlayerStats | null; error: unknown };

    // Base points: win=3, draw=1, loss=0
    let points = result === 'win' ? 3 : result === 'draw' ? 1 : 0;
    
    // Add piece count bonus if board state is provided
    if (board && playerColor) {
      const pieceBonus = calculatePieceBonus(board, playerColor);
      points += pieceBonus;
    }

    if (fetchError || !stats) {
      // Create new stats entry
      const { error: insertError } = await supabase
        .from('player_stats')
        .insert({
          username,
          wins: result === 'win' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0,
          points,
          games_played: 1,
          updated_at: new Date().toISOString(),
        } as never);

      if (insertError) throw insertError;
    } else {
      // Update existing stats
      const { error: updateError } = await supabase
        .from('player_stats')
        .update({
          wins: stats.wins + (result === 'win' ? 1 : 0),
          losses: stats.losses + (result === 'loss' ? 1 : 0),
          draws: stats.draws + (result === 'draw' ? 1 : 0),
          points: stats.points + points,
          games_played: stats.games_played + 1,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('username', username);

      if (updateError) throw updateError;
    }
  } catch (error) {
    console.error('Failed to update player stats:', error);
    throw error;
  }
}

export async function getLeaderboard(limit = 50): Promise<PlayerStats[]> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*') as { data: PlayerStats[] | null; error: unknown };

    if (error) throw error;
    
    if (!data) return [];
    
    // Sort with proper tie-breaking:
    // 1. Points (higher better)
    // 2. Win rate (higher better)
    // 3. Total wins (higher better)
    // 4. Losses (lower better)
    // 5. Games played (lower better for same performance)
    const sorted = data.sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Win rate
      const aWinRate = a.games_played > 0 ? a.wins / a.games_played : 0;
      const bWinRate = b.games_played > 0 ? b.wins / b.games_played : 0;
      if (bWinRate !== aWinRate) return bWinRate - aWinRate;
      
      // 3. Total wins
      if (b.wins !== a.wins) return b.wins - a.wins;
      
      // 4. Fewer losses
      if (a.losses !== b.losses) return a.losses - b.losses;
      
      // 5. Fewer games (efficiency)
      return a.games_played - b.games_played;
    });
    
    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    throw error;
  }
}

export async function getPlayerStats(username: string): Promise<PlayerStats | null> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('username', username)
      .single() as { data: PlayerStats | null; error: unknown };

    if (error && (error as any).code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch player stats:', error);
    throw error;
  }
}
