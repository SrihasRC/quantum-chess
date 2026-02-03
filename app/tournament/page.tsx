'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { useUsername } from '@/hooks/useUsername';
import { UsernameDialog } from '@/components/modals/UsernameDialog';
import {
  getTournamentState,
  joinTournamentQueue,
  getQueueForRound,
  type TournamentState,
} from '@/lib/supabase/tournament';
import { supabase } from '@/lib/supabase/client';
import type { GameRoom } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { Users, Clock, Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TournamentPage() {
  const router = useRouter();
  const { username, setUsername: saveUsername, hasUsername, isLoading } = useUsername();
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [myGame, setMyGame] = useState<GameRoom | null>(null);
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

  useEffect(() => {
    if (!isLoading && !hasUsername) {
      setShowUsernameDialog(true);
    }
  }, [hasUsername, isLoading]);

  useEffect(() => {
    loadTournamentData();
    
    const interval = setInterval(loadTournamentData, 3000);
    return () => clearInterval(interval);
  }, [username]);

  const loadTournamentData = async () => {
    const state = await getTournamentState();
    setTournamentState(state);

    console.log('Tournament state:', state);

    if (state) {
      const queue = await getQueueForRound(state.current_round);
      setQueueCount(queue.length);

      console.log('Queue count:', queue.length, 'Current round:', state.current_round, 'Status:', state.status);

      // Check if I have an active game (only if tournament is active)
      if (username && state.status === 'active' && state.current_round > 0) {
        console.log('Checking for game for user:', username);
        
        const { data, error } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('is_tournament', true)
          .eq('tournament_round', state.current_round)
          .or(`creator_username.eq.${username},opponent_username.eq.${username}`)
          .in('status', ['waiting', 'active'])
          .maybeSingle() as { data: GameRoom | null; error: any };

        if (error) {
          console.error('Error fetching game:', error);
        }
        
        console.log('Found game:', data);
        setMyGame(data);
      } else {
        // Clear game if tournament not active or round is 0
        console.log('Clearing game - tournament not active or round is 0');
        setMyGame(null);
      }
    }
  };

  const handleUsernameSubmit = (newUsername: string) => {
    saveUsername(newUsername);
    setShowUsernameDialog(false);
    toast.success(`Welcome to the tournament, ${newUsername}!`);
  };

  const handleJoinQueue = async () => {
    if (!hasUsername || !username || !tournamentState) return;

    setJoining(true);
    try {
      await joinTournamentQueue(username, playerId, tournamentState.current_round);
      toast.success('Joined tournament queue!');
      await loadTournamentData();
    } catch (error) {
      toast.error('Failed to join queue');
    } finally {
      setJoining(false);
    }
  };

  const handleEnterGame = () => {
    if (myGame) {
      router.push(`/multiplayer/${myGame.id}`);
    }
  };

  if (tournamentState?.status === 'not_started') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Trophy className="h-24 w-24 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">Tournament Not Started</h1>
            <p className="text-muted-foreground">
              The tournament hasn't started yet. Please wait for the organizer to begin.
            </p>
            <Link href="/multiplayer">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lobby
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (tournamentState?.status === 'completed') {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Trophy className="h-24 w-24 mx-auto text-yellow-500" />
            <h1 className="text-4xl font-bold">Tournament Completed!</h1>
            <p className="text-muted-foreground">
              The tournament has ended. Check the leaderboard to see final standings.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/leaderboard">
                <Button>
                  <Trophy className="mr-2 h-4 w-4" />
                  View Leaderboard
                </Button>
              </Link>
              <Link href="/multiplayer">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Lobby
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <UsernameDialog open={showUsernameDialog} onSubmit={handleUsernameSubmit} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Tournament</h1>
            <Link href="/multiplayer">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>

          {username && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Playing as: <span className="font-bold text-foreground">{username}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tournament Status */}
          <Card>
            <CardHeader>
              <CardTitle>Current Round</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{tournamentState?.current_round}</p>
                  <p className="text-sm text-muted-foreground">Round Number</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{queueCount}</p>
                  <p className="text-sm text-muted-foreground">In Queue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Game or Join Queue */}
          <Card>
            <CardHeader>
              <CardTitle>{myGame ? 'Your Match' : 'Join Round'}</CardTitle>
            </CardHeader>
            <CardContent>
              {myGame ? (
                <div className="space-y-4">
                  <p className="text-center">
                    You are paired! Playing as <span className="font-bold">{myGame.creator_username === username ? 'White' : 'Black'}</span>
                  </p>
                  <p className="text-center text-sm text-muted-foreground">
                    Opponent: <span className="font-medium">{myGame.creator_username === username ? myGame.opponent_username : myGame.creator_username}</span>
                  </p>
                  <Button onClick={handleEnterGame} className="w-full" size="lg">
                    Enter Game Room
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    Join the queue to be automatically paired with another player
                  </p>
                  <Button 
                    onClick={handleJoinQueue} 
                    disabled={joining || !hasUsername}
                    className="w-full"
                    size="lg"
                  >
                    {joining ? 'Joining...' : 'Join Queue'}
                  </Button>
                  {queueCount > 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      {queueCount} {queueCount === 1 ? 'player' : 'players'} waiting for pairing
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Join the queue for the current round</li>
                <li>Wait to be paired with another player</li>
                <li>Play your match (5 minutes per player)</li>
                <li>After your game ends, wait for the next round</li>
                <li>Repeat for all {tournamentState?.max_rounds} rounds</li>
              </ol>
            </CardContent>
          </Card>

          {/* Leaderboard Link */}
          <Link href="/leaderboard">
            <Button variant="outline" className="w-full">
              <Trophy className="mr-2 h-4 w-4" />
              View Tournament Leaderboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
