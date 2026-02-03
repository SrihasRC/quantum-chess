import { supabase } from './client';

export interface TournamentState {
  id: number;
  current_round: number;
  max_rounds: number;
  status: 'not_started' | 'active' | 'pairing' | 'completed';
  auto_start_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentQueue {
  id: string;
  username: string;
  player_id: string;
  round_number: number;
  status: 'waiting' | 'paired' | 'cancelled';
  game_id?: string;
  created_at: string;
}

// Get current tournament state
export async function getTournamentState(): Promise<TournamentState | null> {
  const { data, error } = await supabase
    .from('tournament_state')
    .select('*')
    .eq('id', 1)
    .single() as { data: TournamentState | null; error: unknown };

  if (error) {
    console.error('Failed to get tournament state:', error);
    return null;
  }
  return data;
}

// Update tournament state
export async function updateTournamentState(updates: Partial<TournamentState>) {
  const { error } = await supabase
    .from('tournament_state')
    .update({ ...updates, updated_at: new Date().toISOString() } as never)
    .eq('id', 1);

  if (error) throw error;
}

// Start tournament
export async function startTournament() {
  await updateTournamentState({ status: 'active', current_round: 1 });
}

// Reset tournament (clear all data)
export async function resetTournament() {
  try {
    // First, get all tournament games to delete
    const { data: tournamentGames } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('is_tournament', true);

    console.log('Found tournament games to delete:', tournamentGames?.length);

    // Delete all tournament games
    if (tournamentGames && tournamentGames.length > 0) {
      const gameIds = tournamentGames.map(g => g.id);
      const { error: gamesError } = await supabase
        .from('game_rooms')
        .delete()
        .in('id', gameIds);

      if (gamesError) {
        console.error('Failed to delete games:', gamesError);
      } else {
        console.log('Deleted', gameIds.length, 'tournament games');
      }
    }

    // Delete all queue entries - fetch and delete
    const { data: queueEntries } = await supabase
      .from('tournament_queue')
      .select('id');
    
    console.log('Found queue entries to delete:', queueEntries?.length);

    if (queueEntries && queueEntries.length > 0) {
      const ids = queueEntries.map(e => e.id);
      const { error: queueError } = await supabase
        .from('tournament_queue')
        .delete()
        .in('id', ids);
      
      if (queueError) {
        console.error('Failed to delete queue:', queueError);
      } else {
        console.log('Deleted', ids.length, 'queue entries');
      }
    }

    // Reset tournament state
    await updateTournamentState({ 
      status: 'not_started', 
      current_round: 0 
    });

    console.log('Tournament reset complete');
  } catch (error) {
    console.error('Error during tournament reset:', error);
    throw error;
  }
}

// Start next round
export async function startNextRound() {
  const state = await getTournamentState();
  if (!state) throw new Error('Tournament not found');
  
  if (state.current_round >= state.max_rounds) {
    await updateTournamentState({ status: 'completed' });
    throw new Error('Tournament already completed');
  }

  await updateTournamentState({ 
    current_round: state.current_round + 1,
    status: 'active'
  });
}

// Join tournament queue
export async function joinTournamentQueue(username: string, playerId: string, round: number) {
  const { error } = await supabase
    .from('tournament_queue')
    .insert({
      username,
      player_id: playerId,
      round_number: round,
      status: 'waiting',
    });

  if (error) throw error;
  
  // Mark player as tournament participant
  await supabase
    .from('player_stats')
    .update({ is_tournament_player: true } as never)
    .eq('username', username);
}

// Get queue for current round
export async function getQueueForRound(round: number): Promise<TournamentQueue[]> {
  const { data, error } = await supabase
    .from('tournament_queue')
    .select('*')
    .eq('round_number', round)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true }) as { data: TournamentQueue[] | null; error: unknown };

  if (error) throw error;
  return data || [];
}

// Get opponent history for a player
export async function getOpponentHistory(username: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('creator_username, opponent_username')
    .eq('is_tournament', true)
    .or(`creator_username.eq.${username},opponent_username.eq.${username}`) as { data: any[] | null; error: unknown };

  if (error) throw error;
  if (!data) return [];

  const opponents = data.map(game => 
    game.creator_username === username ? game.opponent_username : game.creator_username
  ).filter(Boolean);

  return [...new Set(opponents)];
}

// Auto-pair players in queue
export async function autoPairPlayers(round: number) {
  const queue = await getQueueForRound(round);
  
  if (queue.length < 2) {
    return; // Not enough players to pair
  }

  const paired: string[] = [];
  const pairings: Array<{ player1: TournamentQueue; player2: TournamentQueue }> = [];

  // Try to pair players avoiding rematches
  for (let i = 0; i < queue.length; i++) {
    if (paired.includes(queue[i].username)) continue;

    const player1 = queue[i];
    const player1Opponents = await getOpponentHistory(player1.username);

    // Find best opponent
    for (let j = i + 1; j < queue.length; j++) {
      if (paired.includes(queue[j].username)) continue;

      const player2 = queue[j];
      
      // Check if they haven't played before
      if (!player1Opponents.includes(player2.username)) {
        pairings.push({ player1, player2 });
        paired.push(player1.username, player2.username);
        break;
      }
    }

    // If no fresh opponent found, pair with anyone available
    if (!paired.includes(player1.username)) {
      for (let j = i + 1; j < queue.length; j++) {
        if (paired.includes(queue[j].username)) continue;
        
        const player2 = queue[j];
        pairings.push({ player1, player2 });
        paired.push(player1.username, player2.username);
        break;
      }
    }
  }

  // Create games for all pairings
  for (const pairing of pairings) {
    // Create initial board state using quantum format (same as regular multiplayer)
    const { createInitialBoardState } = await import('@/lib/engine/state');
    const initialBoard = createInitialBoardState();

    // Create game in 'waiting' status like regular multiplayer
    // Players will call setPlayerReady() when they enter, which will activate the game
    const { data: game, error: gameError } = await supabase
      .from('game_rooms')
      .insert({
        creator_id: pairing.player1.player_id,
        creator_username: pairing.player1.username,
        opponent_id: pairing.player2.player_id,
        opponent_username: pairing.player2.username,
        status: 'waiting',
        current_player: 'white',
        game_state: initialBoard,
        move_history: [],
        is_tournament: true,
        tournament_round: round,
      })
      .select()
      .single();

    if (gameError) {
      console.error('Failed to create game:', gameError);
      continue;
    }

    // Update queue entries as paired
    await supabase
      .from('tournament_queue')
      .update({ status: 'paired', game_id: game.id } as never)
      .in('id', [pairing.player1.id, pairing.player2.id]);
  }

  return pairings.length;
}

// Get active tournament games count
export async function getActiveTournamentGames(round: number): Promise<number> {
  const { count, error } = await supabase
    .from('game_rooms')
    .select('*', { count: 'exact', head: true })
    .eq('is_tournament', true)
    .eq('tournament_round', round)
    .in('status', ['waiting', 'active']);

  if (error) throw error;
  return count || 0;
}

// Get completed tournament games count
export async function getCompletedTournamentGames(round: number): Promise<number> {
  const { count, error } = await supabase
    .from('game_rooms')
    .select('*', { count: 'exact', head: true })
    .eq('is_tournament', true)
    .eq('tournament_round', round)
    .eq('status', 'completed');

  if (error) throw error;
  return count || 0;
}

// Get tournament-only leaderboard stats
export async function getTournamentLeaderboard() {
  // Get all completed tournament games
  const { data: games, error } = await supabase
    .from('game_rooms')
    .select('creator_username, opponent_username, winner, winner_reason')
    .eq('is_tournament', true)
    .eq('status', 'completed');

  if (error) throw error;
  if (!games) return [];

  // Calculate stats for each player
  const statsMap = new Map<string, {
    username: string;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    games_played: number;
  }>();

  for (const game of games) {
    const creator = game.creator_username;
    const opponent = game.opponent_username;

    if (!creator || !opponent) continue;

    // Initialize stats if needed
    if (!statsMap.has(creator)) {
      statsMap.set(creator, { username: creator, wins: 0, losses: 0, draws: 0, points: 0, games_played: 0 });
    }
    if (!statsMap.has(opponent)) {
      statsMap.set(opponent, { username: opponent, wins: 0, losses: 0, draws: 0, points: 0, games_played: 0 });
    }

    const creatorStats = statsMap.get(creator)!;
    const opponentStats = statsMap.get(opponent)!;

    creatorStats.games_played++;
    opponentStats.games_played++;

    // Update based on winner
    if (game.winner === 'white') {
      // Creator (white) won
      creatorStats.wins++;
      creatorStats.points += 3;
      opponentStats.losses++;
    } else if (game.winner === 'black') {
      // Opponent (black) won
      opponentStats.wins++;
      opponentStats.points += 3;
      creatorStats.losses++;
    } else if (game.winner === 'draw') {
      // Draw
      creatorStats.draws++;
      creatorStats.points += 1;
      opponentStats.draws++;
      opponentStats.points += 1;
    }
  }

  // Convert to array and sort
  const leaderboard = Array.from(statsMap.values());

  console.log('Tournament leaderboard:', leaderboard);

  // Sort by: points DESC, win rate DESC, wins DESC, losses ASC, games ASC
  leaderboard.sort((a, b) => {
    // 1. Points (higher is better)
    if (a.points !== b.points) return b.points - a.points;

    // 2. Win rate (higher is better)
    const aWinRate = a.games_played > 0 ? a.wins / a.games_played : 0;
    const bWinRate = b.games_played > 0 ? b.wins / b.games_played : 0;
    if (aWinRate !== bWinRate) return bWinRate - aWinRate;

    // 3. Total wins (higher is better)
    if (a.wins !== b.wins) return b.wins - a.wins;

    // 4. Total losses (lower is better)
    if (a.losses !== b.losses) return a.losses - b.losses;

    // 5. Games played (lower is better - more efficient player)
    return a.games_played - b.games_played;
  });

  return leaderboard;
}
