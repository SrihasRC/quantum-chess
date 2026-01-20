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
      <div className="container mx-auto px-2 py-2 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Logo and Title */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8">
              <Crown className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold sm:text-xl">Quantum Chess</h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/rules">
              <Button variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Rules</span>
              </Button>
            </Link>
            {isSandbox ? (
              <Link href="/">
                <Button variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
                  <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden md:inline">Game Mode</span>
                </Button>
              </Link>
            ) : (
              <Link href="/sandbox">
                <Button variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
                  <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden md:inline">Sandbox</span>
                </Button>
              </Link>
            )}
            <Button onClick={newGame} variant="outline" size="sm" className='hover:cursor-pointer hover:text-accent'>
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
              <span className="hidden md:inline">{isSandbox ? 'Reset' : 'New Game'}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
