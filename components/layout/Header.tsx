'use client';

import { Crown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/local', label: 'Play' },
    { href: '/sandbox', label: 'Sandbox' },
    { href: '/rules', label: 'Rules' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="container mx-auto px-2 py-2 sm:px-4 lg:px-16 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8">
              <Crown className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold sm:text-xl">Quantum Chess</h1>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-4 sm:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
