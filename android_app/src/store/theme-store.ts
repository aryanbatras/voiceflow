import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light' as Theme,
      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: 'rose-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
