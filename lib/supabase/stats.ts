import { supabase } from './client';
import type { PlayerStats } from './types';

export async function updatePlayerStats(
  username: string,
  result: 'win' | 'loss' | 'draw'
) {
  try {
    // Get current stats
    const { data: stats, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('username', username)
      .single() as { data: PlayerStats | null; error: unknown };

    const points = result === 'win' ? 3 : result === 'draw' ? 1 : 0;

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
      .select('*')
      .order('points', { ascending: false })
      .order('wins', { ascending: false })
      .limit(limit) as { data: PlayerStats[] | null; error: unknown };

    if (error) throw error;
    return data || [];
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
