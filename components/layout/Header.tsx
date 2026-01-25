'use client';

import { Crown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
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
import { useNavigationGuardStore } from '@/lib/store/navigationGuardStore';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldBlockNavigation = useNavigationGuardStore((state) => state.shouldBlockNavigation);
  const onNavigationAttempt = useNavigationGuardStore((state) => state.onNavigationAttempt);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string>('');

  const handleLinkClick = useCallback((e: React.MouseEvent, href: string) => {
    if (shouldBlockNavigation && pathname !== href) {
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setShowNavigationDialog(true);
      return false;
    }
  }, [shouldBlockNavigation, pathname]);

  const confirmNavigation = useCallback(() => {
    if (onNavigationAttempt) {
      onNavigationAttempt();
    }
    setShowNavigationDialog(false);
    router.push(pendingHref);
  }, [pendingHref, onNavigationAttempt, router]);

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
          <Link 
            href="/" 
            onClick={(e) => handleLinkClick(e, '/')}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity"
          >
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
                onClick={(e) => handleLinkClick(e, link.href)}
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

      {/* Navigation Confirmation Dialog */}
      <AlertDialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Game?</AlertDialogTitle>
            <AlertDialogDescription>
              If you leave now, your opponent will be declared the winner. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
