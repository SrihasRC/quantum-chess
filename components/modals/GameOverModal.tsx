'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GameStatus } from '@/lib/types';
import { Trophy, Handshake } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  status: GameStatus;
  onNewGame: () => void;
}

export function GameOverModal({ isOpen, status, onNewGame }: GameOverModalProps) {
  if (status === 'active') return null;

  const getTitle = () => {
    switch (status) {
      case 'white-wins':
        return 'White Wins!';
      case 'black-wins':
        return 'Black Wins!';
      case 'draw':
        return "It's a Draw!";
      default:
        return 'Game Over';
    }
  };

  const getIcon = () => {
    if (status === 'draw') {
      return <Handshake className="h-12 w-12 text-muted-foreground" />;
    }
    return <Trophy className="h-12 w-12 text-yellow-500" />;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <DialogTitle className="text-center text-2xl">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-center">
            {status === 'draw'
              ? 'The game ended in a draw'
              : `Congratulations to ${status === 'white-wins' ? 'White' : 'Black'}!`}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="sm:justify-center">
          <Button onClick={onNewGame} size="lg" className="w-full sm:w-auto">
            New Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
