'use client';

import { Crown, Menu } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useNavigationGuardStore } from '@/lib/store/navigationGuardStore';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldBlockNavigation = useNavigationGuardStore((state) => state.shouldBlockNavigation);
  const onNavigationAttempt = useNavigationGuardStore((state) => state.onNavigationAttempt);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = useCallback((e: React.MouseEvent, href: string, closeMobileMenu = false) => {
    if (shouldBlockNavigation && pathname !== href) {
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setShowNavigationDialog(true);
      if (closeMobileMenu) setMobileMenuOpen(false);
      return false;
    }
    if (closeMobileMenu) {
      setMobileMenuOpen(false);
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
    { href: '/multiplayer', label: 'Multiplayer' },
    { href: '/leaderboard', label: 'Leaderboard' },
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

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
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

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link.href, true)}
                    className={`text-base font-medium transition-colors hover:text-primary py-2 pl-4 ${
                      pathname === link.href
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
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
