'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LogIn, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { toast } from 'sonner';

export default function MultiplayerLobby() {
  const router = useRouter();
  const { createGame, joinGame } = useMultiplayerGame(null);
  const [gameCode, setGameCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const gameId = await createGame();
      setCreatedGameId(gameId);
    } catch (error) {
      // Error handled in hook
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      toast.error('Please enter a game code');
      return;
    }

    setJoining(true);
    try {
      await joinGame(gameCode.trim());
      router.push(`/multiplayer/${gameCode.trim()}`);
    } catch (error) {
      // Error handled in hook
    } finally {
      setJoining(false);
    }
  };

  const handleCopyGameId = () => {
    if (createdGameId) {
      navigator.clipboard.writeText(createdGameId);
      setCopied(true);
      toast.success('Game ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = () => {
    if (createdGameId) {
      router.push(`/multiplayer/${createdGameId}`);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto flex flex-1 items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
        <div className="w-full max-w-xl">
          {/* Title Section */}
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="mb-2 text-xl font-bold sm:text-2xl">
              Multiplayer Lobby
            </h2>
            <p className="text-sm text-muted-foreground">
              Create a new game or join an existing one
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid gap-3 sm:gap-4">
            {/* Create Game */}
            <Card className="border p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold sm:text-lg">Create New Game</h3>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Start a game and share the code with a friend
                  </p>
                </div>
              </div>

              {!createdGameId ? (
                <Button 
                  className="w-full" 
                  size="sm" 
                  onClick={handleCreateGame}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Game'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={createdGameId}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyGameId}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this code with your friend to join
                  </p>
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={handleStartGame}
                  >
                    Enter Game Room
                  </Button>
                </div>
              )}
            </Card>

            {/* Join Game */}
            <Card className="border p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <LogIn className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold sm:text-lg">Join Existing Game</h3>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Enter a game code to join your friend&apos;s game
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter game code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                />
                <Button 
                  className="w-full" 
                  size="sm" 
                  variant="secondary"
                  onClick={handleJoinGame}
                  disabled={joining || !gameCode.trim()}
                >
                  {joining ? 'Joining...' : 'Join Game'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
