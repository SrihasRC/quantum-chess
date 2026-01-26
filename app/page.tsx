'use client';

import { Users, Sparkles, BookOpen, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import PixelBlast from '@/components/PixelBlast';

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden relative">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <PixelBlast  />
      </div>
      
      <Header />

      {/* Main Content */}
      <main className="container mx-auto flex flex-1 items-center justify-center overflow-y-auto px-3 py-6 sm:px-4 sm:py-8 relative z-10">
        
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          {/* Left Side - Hero Section */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                Quantum Chess
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl">
                Experience chess with quantum superposition and entanglement
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">What makes it quantum?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span><strong>Superposition:</strong> Pieces can exist in multiple squares simultaneously</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span><strong>Entanglement:</strong> Pieces become linked, affecting each other&apos;s states</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span><strong>Measurement:</strong> Captures collapse quantum states with probability</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Side - Game Mode Selection */}
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="mb-1 text-xl font-bold">Play Now</h2>
              <p className="text-sm text-muted-foreground">Choose how you want to play</p>
            </div>

            {/* All options in same compact style */}
            <div className="space-y-3">
              {/* Local Game */}
              <Link href="/local" className="block">
                <Card className="border p-4 transition-colors opacity-90 hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Local Game</h4>
                      <p className="text-xs text-muted-foreground">Play on this device</p>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Multiplayer */}
              <Link href="/multiplayer" className="block">
                <Card className="border p-4 transition-colors opacity-90 hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Multiplayer</h4>
                      <p className="text-xs text-muted-foreground">Play online</p>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Sandbox Mode */}
              <Link href="/sandbox" className="block">
                <Card className="border p-4 transition-colors opacity-90 hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Sandbox Mode</h4>
                      <p className="text-xs text-muted-foreground">Experiment freely</p>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* How to Play */}
              <Link href="/rules" className="block">
                <Card className="border p-4 transition-colors opacity-90 hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">How to Play</h4>
                      <p className="text-xs text-muted-foreground">Learn the rules</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
