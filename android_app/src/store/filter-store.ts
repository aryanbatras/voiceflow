import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ContentFilters {
  hideReposts: boolean;
  hideReplies: boolean;
  hideQuotePosts: boolean;
  mediaOnly: boolean;
  videoOnly: boolean;
  textOnly: boolean;
}

interface MuteFilters {
  mutedWords: string[];
  mutedUsers: string[];
  mutedTags: string[];
}

interface DisplayFilters {
  hideEngagementMetrics: boolean;
  feedDensity: 'comfortable' | 'compact';
}

interface FilterState {
  content: ContentFilters;
  mute: MuteFilters;
  display: DisplayFilters;
  setContent: (filters: Partial<ContentFilters>) => void;
  setMute: (filters: Partial<MuteFilters>) => void;
  addMutedWord: (word: string) => void;
  removeMutedWord: (word: string) => void;
  setDisplay: (filters: Partial<DisplayFilters>) => void;
  resetAll: () => void;
  activeFilterCount: () => number;
}

const DEFAULT_CONTENT: ContentFilters = {
  hideReposts: false,
  hideReplies: false,
  hideQuotePosts: false,
  mediaOnly: false,
  videoOnly: false,
  textOnly: false,
};

const DEFAULT_MUTE: MuteFilters = {
  mutedWords: [],
  mutedUsers: [],
  mutedTags: [],
};

const DEFAULT_DISPLAY: DisplayFilters = {
  hideEngagementMetrics: false,
  feedDensity: 'comfortable',
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      content: { ...DEFAULT_CONTENT },
      mute: { ...DEFAULT_MUTE },
      display: { ...DEFAULT_DISPLAY },

      setContent: (filters) =>
        set((state) => ({ content: { ...state.content, ...filters } })),

      setMute: (filters) =>
        set((state) => ({ mute: { ...state.mute, ...filters } })),

      addMutedWord: (word) =>
        set((state) => ({
          mute: {
            ...state.mute,
            mutedWords: state.mute.mutedWords.includes(word)
              ? state.mute.mutedWords
              : [...state.mute.mutedWords, word],
          },
        })),

      removeMutedWord: (word) =>
        set((state) => ({
          mute: {
            ...state.mute,
            mutedWords: state.mute.mutedWords.filter((w) => w !== word),
          },
        })),

      setDisplay: (filters) =>
        set((state) => ({ display: { ...state.display, ...filters } })),

      resetAll: () =>
        set({
          content: { ...DEFAULT_CONTENT },
          mute: { ...DEFAULT_MUTE },
          display: { ...DEFAULT_DISPLAY },
        }),

      activeFilterCount: () => {
        const state = get();
        let count = 0;
        if (state.content.hideReposts) count++;
        if (state.content.hideReplies) count++;
        if (state.content.hideQuotePosts) count++;
        if (state.content.mediaOnly) count++;
        if (state.content.videoOnly) count++;
        if (state.content.textOnly) count++;
        if (state.mute.mutedWords.length > 0) count++;
        if (state.display.hideEngagementMetrics) count++;
        return count;
      },
    }),
    {
      name: 'rose-filters',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
