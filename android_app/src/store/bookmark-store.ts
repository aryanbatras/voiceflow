import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SyncBookmark {
  uri: string;
  author: { handle: string; displayName?: string; avatar?: string };
  text: string;
  savedAt: string;
  thumbnail?: string;
  isVideo?: boolean;
}

interface BookmarkState {
  bookmarks: SyncBookmark[];
  addBookmark: (item: SyncBookmark) => void;
  removeBookmark: (uri: string) => void;
  isBookmarked: (uri: string) => boolean;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      addBookmark: (item) =>
        set((state) => {
          if (state.bookmarks.some((b) => b.uri === item.uri)) return state;
          return { bookmarks: [item, ...state.bookmarks] };
        }),

      removeBookmark: (uri) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.uri !== uri),
        })),

      isBookmarked: (uri) => get().bookmarks.some((b) => b.uri === uri),
    }),
    {
      name: 'rose-bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
