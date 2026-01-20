'use client';

import { Crown, BookOpen, FlaskConical, RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/store/gameStore';

export function Header() {
  const newGame = useGameStore((state) => state.newGame);
  const pathname = usePathname();
  const isSandbox = pathname === '/sandbox';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Quantum Chess</h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/rules">
              <Button variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
                <BookOpen className="h-4 w-4 mr-1.5" />
                Rules
              </Button>
            </Link>
            {isSandbox ? (
              <Link href="/">
                <Button variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Game Mode
                </Button>
              </Link>
            ) : (
              <Link href="/sandbox">
                <Button variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
                  <FlaskConical className="h-4 w-4 mr-1.5" />
                  Sandbox
                </Button>
              </Link>
            )}
            <Button onClick={newGame} variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {isSandbox ? 'Reset' : 'New Game'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
