'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import {
  getTournamentState,
  updateTournamentState,
  startTournament,
  resetTournament,
  startNextRound,
  getQueueForRound,
  autoPairPlayers,
  getActiveTournamentGames,
  getCompletedTournamentGames,
  getTournamentLeaderboard,
  type TournamentState,
  type TournamentQueue,
} from '@/lib/supabase/tournament';
import { getLeaderboard } from '@/lib/supabase/stats';
import type { PlayerStats } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { Play, Users, Trophy, RefreshCw, CheckCircle } from 'lucide-react';

const ADMIN_PASSWORD = 'CHESS2026';

export default function TournamentAdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [queue, setQueue] = useState<TournamentQueue[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  const [activeGames, setActiveGames] = useState(0);
  const [completedGames, setCompletedGames] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      
      // Refresh every 5 seconds
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [state, tournamentLeaders] = await Promise.all([
        getTournamentState(),
        getTournamentLeaderboard(),
      ]);

      setTournamentState(state);
      
      if (state) {
        const [queueData, active, completed] = await Promise.all([
          getQueueForRound(state.current_round),
          getActiveTournamentGames(state.current_round),
          getCompletedTournamentGames(state.current_round),
        ]);
        
        setQueue(queueData);
        setActiveGames(active);
        setCompletedGames(completed);
      }

      // Use tournament-specific leaderboard
      setLeaderboard(tournamentLeaders as any);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast.success('Admin access granted');
    } else {
      toast.error('Invalid password');
    }
  };

  const handleStartTournament = async () => {
    setLoading(true);
    try {
      await startTournament();
      toast.success('Tournament started!');
      await loadData();
    } catch (error) {
      toast.error('Failed to start tournament');
    } finally {
      setLoading(false);
    }
  };

  const handlePairPlayers = async () => {
    if (!tournamentState) return;
    
    setLoading(true);
    try {
      const pairCount = await autoPairPlayers(tournamentState.current_round);
      toast.success(`Created ${pairCount} pairings`);
      await loadData();
    } catch (error) {
      toast.error('Failed to pair players');
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    setLoading(true);
    try {
      await startNextRound();
      toast.success('Started next round');
      await loadData();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to start next round');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTournament = async () => {
    if (!confirm('Are you sure you want to end the tournament?')) return;
    
    setLoading(true);
    try {
      await updateTournamentState({ status: 'completed' });
      toast.success('Tournament ended');
      await loadData();
    } catch (error) {
      toast.error('Failed to end tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTournament = async () => {
    if (!confirm('⚠️ This will DELETE all tournament games, queue entries, and reset the tournament. Are you sure?')) return;
    if (!confirm('This action CANNOT be undone. Proceed?')) return;
    
    setLoading(true);
    try {
      await resetTournament();
      toast.success('Tournament reset successfully');
      await loadData();
    } catch (error) {
      toast.error('Failed to reset tournament');
      console.error('Reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceResetState = async () => {
    if (!confirm('Force reset tournament state to not_started and round 0?')) return;
    
    setLoading(true);
    try {
      await updateTournamentState({ 
        status: 'not_started', 
        current_round: 0 
      });
      toast.success('Tournament state reset');
      await loadData();
    } catch (error) {
      toast.error('Failed to reset state');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Tournament Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Tournament Admin</h1>
            <Button variant="outline" onClick={() => router.push('/multiplayer')}>
              Back to Lobby
            </Button>
          </div>

          {/* Tournament Status */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-bold capitalize">{tournamentState?.status || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Round</p>
                  <p className="text-lg font-bold">
                    {tournamentState?.current_round} / {tournamentState?.max_rounds}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Active Games</p>
                  <p className="text-lg font-bold">{activeGames}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Completed Games</p>
                  <p className="text-lg font-bold">{completedGames}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {tournamentState?.status === 'not_started' && (
                  <Button onClick={handleStartTournament} disabled={loading} className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Start Tournament
                  </Button>
                )}
                
                {tournamentState?.status === 'active' && (
                  <>
                    <Button onClick={handlePairPlayers} disabled={loading || queue.length < 2} className="w-full">
                      <Users className="mr-2 h-4 w-4" />
                      Pair Players ({queue.length})
                    </Button>
                    
                    <Button 
                      onClick={handleNextRound} 
                      disabled={loading || activeGames > 0 || tournamentState.current_round >= tournamentState.max_rounds}
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Next Round
                    </Button>
                    
                    <Button onClick={handleEndTournament} disabled={loading} variant="destructive" className="w-full">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      End Tournament
                    </Button>
                  </>
                )}

                <Button onClick={loadData} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>

                <Button onClick={handleResetTournament} disabled={loading} variant="destructive" className="w-full">
                  <Trophy className="mr-2 h-4 w-4" />
                  Reset Tournament
                </Button>

                <Button onClick={handleForceResetState} disabled={loading} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Force Reset State
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Waiting Queue */}
          {queue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Waiting Queue - Round {tournamentState?.current_round}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queue.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{player.username}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(player.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tournament participants yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm">Rank</th>
                        <th className="text-left py-2 px-3 text-sm">Player</th>
                        <th className="text-center py-2 px-3 text-sm">Games</th>
                        <th className="text-center py-2 px-3 text-sm">W/L/D</th>
                        <th className="text-center py-2 px-3 text-sm">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.slice(0, 20).map((player, index) => (
                        <tr key={player.username} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3">
                            <span className="font-bold">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium">{player.username}</td>
                          <td className="text-center py-2 px-3">{player.games_played}</td>
                          <td className="text-center py-2 px-3 text-sm">
                            <span className="text-green-500">{player.wins}</span>/
                            <span className="text-red-500">{player.losses}</span>/
                            <span className="text-yellow-500">{player.draws}</span>
                          </td>
                          <td className="text-center py-2 px-3 font-bold text-primary">
                            {player.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
