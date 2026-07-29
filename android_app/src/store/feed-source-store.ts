import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FeedSource {
  type: 'following' | 'discover' | 'trending' | 'custom' | 'list';
  uri?: string;
  label: string;
  icon?: string;
}

export const PRESET_FEEDS: FeedSource[] = [
  { type: 'following', label: 'Following' },
  { type: 'trending', label: 'Trending' },
  { type: 'discover', label: 'Discover' },
];

const DEFAULT_SOURCE: FeedSource = { type: 'discover', label: 'Discover' };

interface FeedSourceState {
  activeSource: FeedSource;
  savedFeeds: FeedSource[];
  setActiveSource: (source: FeedSource) => void;
  addSavedFeed: (source: FeedSource) => void;
  removeSavedFeed: (uri: string) => void;
  resetToDefault: () => void;
}

export const useFeedSourceStore = create<FeedSourceState>()(
  persist(
    (set) => ({
      activeSource: DEFAULT_SOURCE,
      savedFeeds: [],

      setActiveSource: (source) => set({ activeSource: source }),

      addSavedFeed: (source) =>
        set((state) => {
          if (state.savedFeeds.some((f) => f.uri === source.uri)) return state;
          return { savedFeeds: [...state.savedFeeds, source] };
        }),

      removeSavedFeed: (uri) =>
        set((state) => ({
          savedFeeds: state.savedFeeds.filter((f) => f.uri !== uri),
        })),

      resetToDefault: () =>
        set({ activeSource: DEFAULT_SOURCE, savedFeeds: [] }),
    }),
    {
      name: 'rose-feed-sources',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
