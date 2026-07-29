import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SessionData } from '@/types/atproto';

interface AuthState {
  session: SessionData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setSession: (session: SessionData) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setSession: (session) =>
        set({
          session,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),

      clearSession: () =>
        set({
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'rose-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
