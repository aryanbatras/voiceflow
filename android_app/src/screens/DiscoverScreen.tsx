import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Compass, Users, Bookmark, LayoutGrid, X, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useFeedSourceStore } from '@/store/feed-source-store';
import { searchActors } from '@/services/search';
import { Avatar } from '@/components/ui/Avatar';
import { CURATED_FEEDS } from '@/services/feeds';

interface FeedInfo {
  uri: string;
  label: string;
  description: string;
  avatar?: string;
  creatorDid?: string;
  creatorHandle?: string;
  creatorDisplayName?: string;
  likeCount?: number;
}

type Tab = 'discover' | 'people' | 'saved';

function SkeletonRow() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
      <View className="flex-1 space-y-1.5">
        <View className="h-4 w-32 rounded bg-muted animate-pulse" />
        <View className="h-3 w-48 rounded bg-muted animate-pulse" />
      </View>
    </View>
  );
}

export default function DiscoverScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { savedFeeds, addSavedFeed, removeSavedFeed, setActiveSource } = useFeedSourceStore();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const hasQuery = debouncedQuery.trim().length >= 1;

  // ── Popular feeds (default, with infinite scroll) ──
  const [popularFeeds, setPopularFeeds] = useState<FeedInfo[]>(CURATED_FEEDS);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularLoadingMore, setPopularLoadingMore] = useState(false);
  const [popularError, setPopularError] = useState(false);
  const popularCursorRef = useRef<string | null>(null);
  const isFetchingMoreRef = useRef(false);

  useEffect(() => {
    if (hasQuery || !isAuthenticated) {
      setPopularFeeds(CURATED_FEEDS);
      setPopularLoading(false);
      return;
    }
    if (popularFeeds.length > 0 && popularCursorRef.current !== null) {
      setPopularLoading(false);
      return; // cache hit — don't re-fetch
    }
    setPopularLoading(true);
    setPopularError(false);
    popularCursorRef.current = null;
    fetch('/api/feed/generators?mode=popular&limit=25')
      .then((r) => r.ok ? r.json() : { feeds: [] })
      .then((data) => {
        setPopularFeeds(data.feeds || CURATED_FEEDS);
        popularCursorRef.current = data.cursor || null;
      })
      .catch(() => { setPopularFeeds(CURATED_FEEDS); setPopularError(true); })
      .finally(() => setPopularLoading(false));
  }, [isAuthenticated, hasQuery]);

  // Infinite scroll for popular feeds
  const handlePopularEndReached = useCallback(() => {
    if (!isAuthenticated || hasQuery || !popularCursorRef.current || isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;
    setPopularLoadingMore(true);
    const cursor = popularCursorRef.current;
    popularCursorRef.current = null;
    fetch(`/api/feed/generators?mode=popular&limit=25&cursor=${encodeURIComponent(cursor)}`)
      .then((r) => r.ok ? r.json() : { feeds: [] })
      .then((data) => {
        setPopularFeeds((prev) => [...prev, ...(data.feeds || [])]);
        popularCursorRef.current = data.cursor || null;
      })
      .catch(() => {})
      .finally(() => {
        setPopularLoadingMore(false);
        isFetchingMoreRef.current = false;
      });
  }, [isAuthenticated, hasQuery]);

  // ── Search results ──
  const [searchResults, setSearchResults] = useState<FeedInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!hasQuery) { setSearchResults([]); setHasSearched(false); return; }
    setSearching(true);
    setHasSearched(true);
    const q = debouncedQuery.toLowerCase();
    if (!isAuthenticated) {
      // For guests, filter static CURATED_FEEDS
      setSearchResults(
        CURATED_FEEDS.filter(
          (f) => f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
        )
      );
      setSearching(false);
      return;
    }
    // For authenticated, use API
    fetch(`/api/feed/generators?mode=popular&query=${encodeURIComponent(debouncedQuery)}&limit=30`)
      .then((r) => r.ok ? r.json() : { feeds: [] })
      .then((data) => setSearchResults(data.feeds || []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [isAuthenticated, debouncedQuery, hasQuery]);

  // ── People suggestions ──
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [peopleResults, setPeopleResults] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab !== 'people' || !isAuthenticated) return;
    setSuggestionsLoading(true);
    fetch('/api/graph/suggestions')
      .then(r => r.ok ? r.json() : { actors: [] })
      .then(data => setSuggestions(data.actors || []))
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (activeTab !== 'people' || debouncedQuery.trim().length < 2) {
      setPeopleResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const actors = await searchActors(debouncedQuery, 20);
        setPeopleResults(actors);
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [activeTab, debouncedQuery]);

  const isSubscribed = useCallback(
    (uri: string) => savedFeeds.some((f) => f.uri === uri),
    [savedFeeds]
  );

  const handleSubscribe = useCallback((feed: FeedInfo) => {
    addSavedFeed({ type: 'custom', uri: feed.uri, label: feed.label });
  }, [addSavedFeed]);

  const handleViewFeed = useCallback((feed: FeedInfo) => {
    setActiveSource({ type: 'custom', uri: feed.uri, label: feed.label });
    navigation.navigate('Feed');
  }, [setActiveSource, navigation]);

  const searchQuery = query;
  const displayFeeds = hasQuery ? searchResults : popularFeeds;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-lg font-bold text-foreground">Discover</Text>
        {/* Tabs */}
        <View className="flex-row gap-5 mt-3">
          {(['discover', 'people', 'saved'] as Tab[]).map((tab) => {
            const icons = { discover: Search, people: Users, saved: Bookmark };
            const Icon = icons[tab];
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`pb-2 border-b-2 ${activeTab === tab ? 'border-brand' : 'border-transparent'}`}
              >
                <View className="flex-row items-center gap-1">
                  <Icon size={14} color={activeTab === tab ? '#f06' : '#8e8e8e'} />
                  <Text className={`text-sm font-medium ${activeTab === tab ? 'text-brand' : 'text-muted-foreground'}`}>
                    {tab === 'discover' ? 'Search Feeds' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeTab === 'discover' && (
        <>
          {/* Search bar */}
          <View className="flex-row items-center bg-muted rounded-xl mx-4 my-3 px-4 h-11">
            <Search size={18} color="#8e8e8e" />
            <TextInput
              className="flex-1 ml-2 text-foreground text-[15px]"
              placeholder="Search 50,000+ feeds..."
              placeholderTextColor="#8e8e8e"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={18} color="#8e8e8e" />
              </TouchableOpacity>
            )}
          </View>

          {popularLoading && !hasQuery ? (
            <View className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </View>
          ) : searching ? (
            <View className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </View>
          ) : hasSearched && searchResults.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Search size={40} color="#8e8e8e33" />
              <Text className="text-muted-foreground text-lg mt-3">No feeds found</Text>
              <Text className="text-muted-foreground text-sm mt-1">Try a different search term</Text>
            </View>
          ) : displayFeeds.length === 0 && !hasQuery ? (
            <View className="items-center justify-center py-20">
              <Sparkles size={40} color="#8e8e8e33" />
              <Text className="text-muted-foreground text-lg mt-3">No popular feeds right now</Text>
            </View>
          ) : (
            <FlatList
              data={displayFeeds}
              keyExtractor={(item) => item.uri}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              onEndReached={!hasQuery ? handlePopularEndReached : undefined}
              onEndReachedThreshold={0.3}
              ListFooterComponent={popularLoadingMore ? (
                <ActivityIndicator className="py-4" color="#f06" size="small" />
              ) : !popularCursorRef.current && !hasQuery && popularFeeds.length > 0 ? (
                <Text className="text-xs text-muted-foreground/50 text-center py-4">No more feeds</Text>
              ) : null}
              renderItem={({ item }) => {
                const subscribed = isSubscribed(item.uri);
                return (
                  <TouchableOpacity
                    onPress={() => handleViewFeed(item)}
                    className="flex-row items-center gap-4 py-4 border-b border-border"
                  >
                    {item.avatar ? (
                      <View className="h-11 w-11 rounded-xl overflow-hidden">
                        <Image source={{ uri: item.avatar }} className="w-full h-full" resizeMode="cover" />
                      </View>
                    ) : (
                      <View className="h-11 w-11 rounded-xl bg-brand/15 items-center justify-center">
                        <LayoutGrid size={20} color="#f06" />
                      </View>
                    )}
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-foreground font-semibold text-sm truncate">{item.label}</Text>
                        {item.likeCount !== undefined && item.likeCount > 0 && (
                          <Text className="text-muted-foreground text-xs">
                            {item.likeCount >= 1000 ? `${(item.likeCount / 1000).toFixed(1)}k` : item.likeCount} likes
                          </Text>
                        )}
                      </View>
                      <Text className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>
                        {item.description || (item.creatorHandle ? `by @${item.creatorHandle}` : '')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => subscribed ? removeSavedFeed(item.uri) : handleSubscribe(item)}
                      className={`px-4 py-1.5 rounded-full ${subscribed ? 'bg-muted' : 'bg-brand'}`}
                    >
                      <Text className={`text-xs font-semibold ${subscribed ? 'text-foreground' : 'text-white'}`}>
                        {subscribed ? 'Added' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="items-center justify-center py-16">
                  <Compass size={40} color="#8e8e8e" />
                  {hasQuery ? (
                    <>
                      <Text className="text-muted-foreground text-lg mt-3">No feeds found for &ldquo;{debouncedQuery}&rdquo;</Text>
                      <Text className="text-muted-foreground text-sm mt-1">Try a different search term</Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-muted-foreground text-lg mt-3">No feeds available</Text>
                    </>
                  )}
                </View>
              }
            />
          )}
        </>
      )}

      {activeTab === 'people' && (
        <>
          <View className="flex-row items-center bg-muted rounded-xl mx-4 my-3 px-4 h-11">
            <Search size={18} color="#8e8e8e" />
            <TextInput
              className="flex-1 ml-2 text-foreground text-[15px]"
              placeholder="Search people..."
              placeholderTextColor="#8e8e8e"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={18} color="#8e8e8e" />
              </TouchableOpacity>
            )}
          </View>

          {debouncedQuery.trim().length < 2 ? (
            <>
              {suggestionsLoading ? (
                <View className="space-y-2 px-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View key={i} className="flex-row items-center gap-3 py-2">
                      <View className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <View className="flex-1 space-y-1">
                        <View className="h-4 w-32 rounded bg-muted animate-pulse" />
                        <View className="h-3 w-20 rounded bg-muted animate-pulse" />
                      </View>
                    </View>
                  ))}
                </View>
              ) : suggestions.length === 0 ? (
                <View className="items-center justify-center py-20 px-8">
                  <Users size={40} color="#8e8e8e33" />
                  <Text className="text-muted-foreground text-lg mt-3 text-center">No suggestions yet</Text>
                  <Text className="text-muted-foreground text-sm mt-1 text-center">Search for people or follow more users</Text>
                </View>
              ) : (
                <View className="px-4">
                  <Text className="text-base font-bold text-foreground mb-3">Suggested for you</Text>
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.did}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Profile', { handle: item.handle })}
                        className="flex-row items-center gap-3 py-3 border-b border-border"
                      >
                        <Avatar uri={item.avatar} name={item.displayName || item.handle} size="md" />
                        <View className="flex-1">
                          <Text className="text-foreground font-semibold text-sm">{item.displayName || item.handle}</Text>
                          <Text className="text-muted-foreground text-xs">@{item.handle}</Text>
                        </View>
                        {item.count > 0 && (
                          <Text className="text-muted-foreground text-xs">{item.count} mutual</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </>
          ) : (
            <FlatList
              data={peopleResults}
              keyExtractor={(item) => item.did}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Profile', { handle: item.handle })}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-border"
                >
                  <Avatar uri={item.avatar} name={item.displayName || item.handle} size="md" />
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold text-sm">{item.displayName || item.handle}</Text>
                    <Text className="text-muted-foreground text-xs">@{item.handle}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Text className="text-muted-foreground text-lg">No results</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {activeTab === 'saved' && (
        <FlatList
          data={savedFeeds}
          keyExtractor={(item) => item.uri || item.label}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          ListHeaderComponent={
            <Text className="text-base font-bold text-foreground mb-3">
              Your Feeds ({savedFeeds.length})
            </Text>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 py-4 border-b border-border">
              <View className="h-11 w-11 rounded-xl bg-brand/15 items-center justify-center">
                <LayoutGrid size={20} color="#f06" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-foreground font-semibold text-sm">{item.label}</Text>
                <Text className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>{item.uri}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setActiveSource(item);
                    navigation.navigate('Feed');
                  }}
                  className="px-4 py-1.5 rounded-full bg-brand"
                >
                  <Text className="text-white text-xs font-semibold">View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeSavedFeed(item.uri!)}
                  className="p-1.5 rounded-full text-muted-foreground"
                >
                  <X size={16} color="#8e8e8e" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Bookmark size={40} color="#8e8e8e33" />
              <Text className="text-muted-foreground text-lg mt-3">No feeds saved yet</Text>
              <Text className="text-muted-foreground text-sm mt-1">Search and add feeds you love</Text>
              <TouchableOpacity
                onPress={() => setActiveTab('discover')}
                className="mt-4 px-6 py-2.5 rounded-xl bg-brand"
              >
                <Text className="text-white text-sm font-semibold">Search Feeds</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
