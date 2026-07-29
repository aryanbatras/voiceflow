'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDebouncedSearch } from '@/hooks/useSearch';
import { Search, Loader2 } from 'lucide-react';
import InfiniteMenu from '@/components/immersive/InfiniteMenu';

interface FeedInfo {
  uri: string;
  label: string;
  description: string;
  avatar?: string;
  creatorDid?: string;
  creatorHandle?: string;
  creatorDisplayName?: string;
  likeCount?: number;
  category?: string;
}

export default function ImmersivePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isGuest = !authLoading && !isAuthenticated;

  const { query, setQuery, debouncedQuery } = useDebouncedSearch(2000);

  const [feeds, setFeeds] = useState<FeedInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const hasQuery = isAuthenticated && debouncedQuery.trim().length >= 1;

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    const endpoint = isAuthenticated
      ? '/api/feed/generators?mode=popular&limit=30'
      : '/api/public/discover?mode=curated';

    fetch(endpoint)
      .then(r => (r.ok ? r.json() : { feeds: [] }))
      .then(data => setFeeds(data.feeds || []))
      .catch(() => setFeeds([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  const [searchResults, setSearchResults] = useState<FeedInfo[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!hasQuery) return;

    async function searchFeeds() {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/feed/generators?mode=popular&query=${encodeURIComponent(debouncedQuery)}&limit=30`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.feeds || []);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }
    searchFeeds();
  }, [debouncedQuery, hasQuery]);

  const activeFeeds = hasQuery ? searchResults : feeds;

  const menuItems = activeFeeds.map(f => ({
    image: f.avatar || '',
    link: `/immersive/feed?uri=${encodeURIComponent(f.uri)}&label=${encodeURIComponent(f.label)}`,
    title: f.label,
    description: [
      f.description || (f.creatorHandle ? `by @${f.creatorHandle}` : ''),
      f.likeCount
        ? `${f.likeCount >= 1000 ? (f.likeCount / 1000).toFixed(1) + 'k' : f.likeCount} likes`
        : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'Explore feed',
    category: f.category,
    likeCount: f.likeCount,
  }));

  const handleItemClick = useCallback(
    (item: { link: string }) => {
      router.push(item.link);
    },
    [router]
  );

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden">
      <div className="absolute inset-0">
        {loading || authLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        ) : (
          <InfiniteMenu
            items={menuItems}
            scale={1.0}
            onItemClick={handleItemClick}
          />
        )}
      </div>

      {isAuthenticated && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 backdrop-blur-xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search feeds..."
            className="bg-transparent text-white placeholder:text-white/30 outline-none min-w-[200px]"
          />
          {searching && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
        </div>
      )}
    </div>
  );
}
