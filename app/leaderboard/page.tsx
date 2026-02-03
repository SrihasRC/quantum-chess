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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-white">Leaderboard</h1>
            <Link href="/multiplayer">
              <Button variant="outline">Back to Multiplayer</Button>
            </Link>
          </div>

          <Card className="bg-slate-800/50 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Top Players</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="text-center text-slate-400 py-8">
                  Loading leaderboard...
                </div>
              )}

              {error && (
                <div className="text-center text-red-400 py-8">
                  {error}
                </div>
              )}

              {!loading && !error && leaders.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  No players yet. Be the first to play!
                </div>
              )}

              {!loading && !error && leaders.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Rank</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Player</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Games</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Wins</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Losses</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Draws</th>
                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaders.map((player, index) => (
                        <tr
                          key={player.username}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold ${
                                index === 0
                                  ? 'text-yellow-400 text-xl'
                                  : index === 1
                                  ? 'text-slate-300 text-lg'
                                  : index === 2
                                  ? 'text-amber-600 text-lg'
                                  : 'text-slate-400'
                              }`}
                            >
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-white font-medium">{player.username}</span>
                          </td>
                          <td className="text-center py-3 px-4 text-slate-300">
                            {player.games_played}
                          </td>
                          <td className="text-center py-3 px-4 text-green-400 font-medium">
                            {player.wins}
                          </td>
                          <td className="text-center py-3 px-4 text-red-400 font-medium">
                            {player.losses}
                          </td>
                          <td className="text-center py-3 px-4 text-yellow-400 font-medium">
                            {player.draws}
                          </td>
                          <td className="text-center py-3 px-4">
                            <span className="text-purple-400 font-bold text-lg">
                              {player.points}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-slate-400 text-sm">
            <p>Points: Win = 3 pts, Draw = 1 pt, Loss = 0 pts</p>
          </div>
        </div>
      </main>
    </div>
  );
}
