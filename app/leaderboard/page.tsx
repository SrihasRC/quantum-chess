'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/supabase/stats';
import type { PlayerStats } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard(50); // Top 50 players
        setLeaders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <Link href="/multiplayer">
              <Button variant="outline">Back to Multiplayer</Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Players</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="text-center text-muted-foreground py-8">
                  Loading leaderboard...
                </div>
              )}

              {error && (
                <div className="text-center text-destructive py-8">
                  {error}
                </div>
              )}

              {!loading && !error && leaders.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No players yet. Be the first to play!
                </div>
              )}

              {!loading && !error && leaders.length > 0 && (() => {
                // Calculate ranks with proper tie handling
                const rankedLeaders = leaders.map((player, index) => {
                  let rank = 1;
                  
                  // Count how many players are ahead
                  for (let i = 0; i < index; i++) {
                    const prev = leaders[i];
                    const prevWinRate = prev.games_played > 0 ? prev.wins / prev.games_played : 0;
                    const currWinRate = player.games_played > 0 ? player.wins / player.games_played : 0;
                    
                    // Check if previous player has better stats (not tied)
                    const isTied = 
                      prev.points === player.points &&
                      prevWinRate === currWinRate &&
                      prev.wins === player.wins &&
                      prev.losses === player.losses &&
                      prev.games_played === player.games_played;
                    
                    if (!isTied) {
                      rank = i + 2; // This player's rank is at least one more than previous different player
                    }
                  }
                  
                  return { ...player, rank };
                });
                
                return (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Rank</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Player</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Games</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Wins</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Losses</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Draws</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Win %</th>
                        <th className="text-center py-3 px-4 text-muted-foreground font-semibold">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedLeaders.map((player) => {
                        const winRate = player.games_played > 0 
                          ? ((player.wins / player.games_played) * 100).toFixed(1)
                          : '0.0';
                        
                        return (
                        <tr
                          key={player.username}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold ${
                                player.rank === 1
                                  ? 'text-yellow-500 text-xl'
                                  : player.rank === 2
                                  ? 'text-foreground text-lg'
                                  : player.rank === 3
                                  ? 'text-amber-600 text-lg'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">{player.username}</span>
                          </td>
                          <td className="text-center py-3 px-4 text-muted-foreground">
                            {player.games_played}
                          </td>
                          <td className="text-center py-3 px-4 text-green-500 font-medium">
                            {player.wins}
                          </td>
                          <td className="text-center py-3 px-4 text-red-500 font-medium">
                            {player.losses}
                          </td>
                          <td className="text-center py-3 px-4 text-yellow-500 font-medium">
                            {player.draws}
                          </td>
                          <td className="text-center py-3 px-4 text-muted-foreground font-medium">
                            {winRate}%
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="text-primary font-bold text-lg">
                              {player.points}
                            </span>
                          </td>
                        </tr>
                      )})
                      }
                    </tbody>
                  </table>
                </div>
              );})()}
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-muted-foreground text-sm">
            <p>Points: Win = 3 pts, Draw = 1 pt, Loss = 0 pts</p>
          </div>
        </div>
      </main>
    </div>
  );
}
