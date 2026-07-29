import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { resumeSession } from '@/services/agent';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    resumeSession().finally(() => setLoading(false));
  }, []);

  return { session, isAuthenticated, isLoading };
}
