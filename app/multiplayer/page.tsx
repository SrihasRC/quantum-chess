'use client';

import { Plus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';

export default function MultiplayerLobby() {
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
                    Start a game and share the link with a friend
                  </p>
                </div>
              </div>
              <Button className="w-full" size="sm" disabled>
                Create Game (Coming Soon)
              </Button>
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
                <input
                  type="text"
                  placeholder="Enter game code"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled
                />
                <Button className="w-full" size="sm" variant="secondary" disabled>
                  Join Game (Coming Soon)
                </Button>
              </div>
            </Card>
          </div>

          {/* Info */}
          <div className="mt-6 rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground sm:text-sm">
            <p>
              Multiplayer functionality is under development. You can play locally for now!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
