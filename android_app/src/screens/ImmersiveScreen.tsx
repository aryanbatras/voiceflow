import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList, TextInput,
  Dimensions, ActivityIndicator, ScrollView,
} from 'react-native';
import { ArrowLeft, Search, X, Play, LayoutGrid } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCustomFeed } from '@/services/feeds';

import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

interface CuratedFeed {
  uri: string;
  label: string;
  description: string;
  avatar?: string;
  likeCount?: number;
}

export default function ImmersiveScreen({ navigation, route }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Search state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasQuery = debouncedQuery.trim().length >= 1;

  // Feeds
  const [feeds, setFeeds] = useState<CuratedFeed[]>([]);
  const [searchResults, setSearchResults] = useState<CuratedFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Image items from selected feed
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [selectedFeedUri, setSelectedFeedUri] = useState<string | null>(null);
  const [selectedFeedLabel, setSelectedFeedLabel] = useState('');

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Fetch initial feeds
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const endpoint = isAuthenticated
          ? '/api/feed/generators?mode=popular&limit=30'
          : '/api/public/discover?mode=curated';
        const res = await fetch(endpoint);
        const data = await res.json();
        setFeeds(data.feeds?.map((f: any) => ({
          uri: f.uri,
          label: f.label,
          description: f.description || '',
          avatar: f.avatar,
          likeCount: f.likeCount,
        })) || []);
      } catch { setFeeds([]); }
      setLoading(false);
    })();
  }, [isAuthenticated]);

  // Search feeds
  useEffect(() => {
    if (!hasQuery || !isAuthenticated) { setSearchResults([]); return; }
    (async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/feed/generators?mode=popular&query=${encodeURIComponent(debouncedQuery)}&limit=30`);
        const data = await res.json();
        setSearchResults(data.feeds?.map((f: any) => ({
          uri: f.uri, label: f.label, description: f.description || '', avatar: f.avatar, likeCount: f.likeCount,
        })) || []);
      } catch { setSearchResults([]); }
      setSearching(false);
    })();
  }, [debouncedQuery, hasQuery, isAuthenticated]);

  // Load images from a feed
  const fetchFeedImages = useCallback(async (uri: string, c?: string) => {
    try {
      const data = await getCustomFeed(uri, c, 50);
      const masonryItems = data.items
        .filter((p: any) => {
          const em = p.record?.embed || p.embed;
          return !!em?.images?.[0] || !!em?.video?.thumbnail || !!em?.thumbnail || !!em?.external?.thumb;
        })
        .map((p: any) => {
          const em = p.record?.embed || p.embed;
          const img = em?.images?.[0]?.fullsize || em?.images?.[0]?.thumb || em?.video?.thumbnail || em?.thumbnail || em?.external?.thumb;
          const aspectRatio = em?.images?.[0]?.aspectRatio || em?.video?.aspectRatio;
          const isVideo = !!em?.video || (em?.$type || '').includes('video');
          return {
            post: p,
            img,
            aspectRatio,
            isVideo,
            height: aspectRatio
              ? ITEM_WIDTH * (aspectRatio.height / aspectRatio.width)
              : ITEM_WIDTH,
          };
        })
        .filter((m: any) => m.img);
      return { items: masonryItems, cursor: data.cursor };
    } catch {
      return { items: [], cursor: undefined };
    }
  }, []);

  const handleFeedSelect = useCallback(async (uri: string, label: string) => {
    setSelectedFeedUri(uri);
    setSelectedFeedLabel(label);
    setItemsLoading(true);
    setItems([]);
    setCursor(undefined);
    const data = await fetchFeedImages(uri);
    setItems(data.items);
    setCursor(data.cursor);
    setItemsLoading(false);
  }, [fetchFeedImages]);

  const loadMore = useCallback(async () => {
    if (!cursor || !selectedFeedUri) return;
    const data = await fetchFeedImages(selectedFeedUri, cursor);
    if (data.items.length > 0) {
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.cursor);
    }
  }, [cursor, selectedFeedUri, fetchFeedImages]);

  const displayFeeds = hasQuery ? searchResults : feeds;

  // ─── Feed Browser View ──────────────────────────────────────
  if (!selectedFeedUri) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white flex-1">Immersive</Text>
        </View>

        {/* Search bar (authenticated only) */}
        {isAuthenticated && (
          <View className="flex-row items-center mx-4 mb-3 bg-white/10 rounded-full px-4 py-2.5">
            <Search size={16} color="rgba(255,255,255,0.5)" />
            <TextInput
              className="flex-1 text-white text-sm ml-2"
              placeholder="Search feeds..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
            {searching && <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" style={{ marginLeft: 8 }} />}
          </View>
        )}

        {/* Feeds list */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="rgba(255,255,255,0.3)" />
          </View>
        ) : (
          <FlatList
            data={displayFeeds}
            keyExtractor={(item) => item.uri}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleFeedSelect(item.uri, item.label)}
                className="flex-row items-center gap-4 py-4 border-b border-white/10"
              >
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} className="h-11 w-11 rounded-xl" resizeMode="cover" />
                ) : (
                  <View className="h-11 w-11 rounded-xl bg-white/10 items-center justify-center">
                    <LayoutGrid size={20} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{item.label}</Text>
                  <Text className="text-white/40 text-xs mt-0.5" numberOfLines={1}>{item.description}</Text>
                </View>
                {item.likeCount !== undefined && item.likeCount > 0 && (
                  <Text className="text-white/30 text-xs">
                    {item.likeCount >= 1000 ? `${(item.likeCount / 1000).toFixed(1)}k` : item.likeCount}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Search size={40} color="rgba(255,255,255,0.2)" />
                <Text className="text-white/40 text-lg mt-3">
                  {hasQuery ? 'No feeds found' : 'No feeds available'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── Feed Images Grid View ──────────────────────────────────
  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="absolute top-0 left-0 right-0 z-10">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => {
            setSelectedFeedUri(null);
            setItems([]);
          }} className="mr-3">
            <ArrowLeft size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-white flex-1" numberOfLines={1}>{selectedFeedLabel}</Text>
          <Text className="text-white/40 text-sm">{items.length}</Text>
        </View>
      </SafeAreaView>

      {itemsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.post.uri}
          numColumns={COLUMN_COUNT}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingTop: 60 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('PostDetail', { uri: item.post.uri })}
              style={{
                width: ITEM_WIDTH,
                height: item.height,
                marginRight: GAP,
                marginBottom: GAP,
              }}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.img }} className="w-full h-full" resizeMode="cover" />
              {/* Video indicator */}
              {item.isVideo && (
                <View className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/40 items-center justify-center">
                  <Play size={10} color="white" fill="white" strokeWidth={0} style={{ marginLeft: 1 }} />
                </View>
              )}
              <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-1.5 flex-row items-center">
                <Avatar uri={item.post.author?.avatar} name={item.post.author?.displayName || item.post.author?.handle} size="sm" />
                <Text className="text-white text-[10px] ml-1.5 flex-1" numberOfLines={1}>
                  {item.post.author?.displayName || item.post.author?.handle}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center" style={{ height: 400 }}>
              <Text className="text-white/30 text-lg">No images in this feed</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
