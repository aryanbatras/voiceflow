import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ViewMode = 'classic' | 'grid';

interface ViewModeState {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      mode: 'classic',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'rose-view-mode',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
