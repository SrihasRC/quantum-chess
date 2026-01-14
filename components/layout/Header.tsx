'use client';

import { Crown } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Crown className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Quantum Chess</h1>
              <p className="text-sm text-muted-foreground">
                Superposition • Entanglement • Measurement
              </p>
            </div>
          </div>

          {/* Actions - placeholder for future features */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle, settings, etc. can go here */}
          </div>
        </div>
      </div>
    </header>
  );
}
