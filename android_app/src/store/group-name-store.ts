import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GroupNameState {
  names: Record<string, string>;
  setName: (convoId: string, name: string) => void;
  getName: (convoId: string) => string | undefined;
  removeName: (convoId: string) => void;
}

export const useGroupNameStore = create<GroupNameState>()(
  persist(
    (set, get) => ({
      names: {},

      setName: (convoId, name) =>
        set((state) => ({
          names: { ...state.names, [convoId]: name },
        })),

      getName: (convoId) => get().names[convoId],

      removeName: (convoId) =>
        set((state) => {
          const { [convoId]: _, ...rest } = state.names;
          return { names: rest };
        }),
    }),
    {
      name: 'rose-group-names',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
