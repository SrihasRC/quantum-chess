'use client';

import { useState, useEffect } from 'react';

export function useUsername() {
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chess_username');
      if (stored) {
        setUsername(stored);
      }
      setIsLoading(false);
    }
  }, []);

  const saveUsername = (name: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chess_username', name);
      setUsername(name);
    }
  };

  const clearUsername = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chess_username');
      setUsername('');
    }
  };

  return {
    username,
    setUsername: saveUsername,
    clearUsername,
    hasUsername: !!username,
    isLoading,
  };
}
