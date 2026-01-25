import { create } from 'zustand';

interface NavigationGuardState {
  shouldBlockNavigation: boolean;
  onNavigationAttempt: (() => void) | null;
  setShouldBlockNavigation: (value: boolean) => void;
  setOnNavigationAttempt: (callback: (() => void) | null) => void;
}

export const useNavigationGuardStore = create<NavigationGuardState>((set) => ({
  shouldBlockNavigation: false,
  onNavigationAttempt: null,
  setShouldBlockNavigation: (value: boolean) => set({ shouldBlockNavigation: value }),
  setOnNavigationAttempt: (callback: (() => void) | null) => set({ onNavigationAttempt: callback }),
}));
