import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth';

export const useAuthSession = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use Better Auth useSession
  const sessionResult = useSession();

  useEffect(() => {
    // Mark as ready once we have a result (even if null)
    if (sessionResult.isPending === false) {
      setIsReady(true);
    }
  }, [sessionResult.isPending]);

  return {
    session: sessionResult.data,
    isPending: !isReady,
    error: sessionResult.error || error,
  };
};
