'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'CHESS2026';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast.success('Admin access granted');
    } else {
      toast.error('Invalid password');
    }
  };

  const handleClearLeaderboard = async () => {
    setLoading(true);
    try {
      // First get all usernames
      const { data: allStats, error: fetchError } = await supabase
        .from('player_stats')
        .select('username') as { data: { username: string }[] | null; error: unknown };

      if (fetchError) throw fetchError;

      if (allStats && allStats.length > 0) {
        // Delete all records
        const usernames = allStats.map(stat => stat.username);
        const { error: deleteError } = await supabase
          .from('player_stats')
          .delete()
          .in('username', usernames);

        if (deleteError) throw deleteError;
        
        toast.success(`Deleted ${allStats.length} player records!`);
      } else {
        toast.info('Leaderboard is already empty');
      }

      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to clear leaderboard:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to clear leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center mt-20">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6" />
                <CardTitle>Admin Access</CardTitle>
              </div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Admin Panel</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leaderboard Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Clear all player statistics from the leaderboard. This action cannot be undone.
              </p>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {loading ? 'Clearing...' : 'Clear All Leaderboard Data'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Clear Leaderboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all player statistics including wins, losses, draws, and points.
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearLeaderboard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
