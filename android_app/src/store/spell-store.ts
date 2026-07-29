import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PREDEFINED_SPELLS } from '@/types/spells';
import type { Spell } from '@/types/spells';

interface SpellState {
  learnedIds: string[];
  castIds: string[];
  learnSpell: (id: string) => void;
  toggleCast: (id: string) => void;
  unlearnSpell: (id: string) => void;
  isCast: (id: string) => boolean;
  isLearned: (id: string) => boolean;
  getAllSpells: () => Spell[];
  castCount: () => number;
}

export const useSpellStore = create<SpellState>()(
  persist(
    (set, get) => ({
      learnedIds: [],
      castIds: [],

      learnSpell: (id) =>
        set((state) => {
          if (state.learnedIds.includes(id)) return state;
          const canCast = state.castIds.length < 2;
          return {
            learnedIds: [...state.learnedIds, id],
            castIds: canCast ? [...state.castIds, id] : state.castIds,
          };
        }),

      toggleCast: (id) =>
        set((state) => {
          if (!state.learnedIds.includes(id)) return state;
          const isCurrentlyCast = state.castIds.includes(id);
          if (isCurrentlyCast) {
            return { castIds: state.castIds.filter((cid) => cid !== id) };
          }
          if (state.castIds.length >= 2) return state;
          return { castIds: [...state.castIds, id] };
        }),

      unlearnSpell: (id) =>
        set((state) => ({
          learnedIds: state.learnedIds.filter((lid) => lid !== id),
          castIds: state.castIds.filter((cid) => cid !== id),
        })),

      isCast: (id) => get().castIds.includes(id),
      isLearned: (id) => get().learnedIds.includes(id),
      getAllSpells: () => PREDEFINED_SPELLS,
      castCount: () => get().castIds.length,
    }),
    {
      name: 'rose-spells',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        learnedIds: state.learnedIds,
        castIds: state.castIds,
      }),
    }
  )
);
