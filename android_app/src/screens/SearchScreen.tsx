import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Play, Image as ImageIcon, LayoutGrid, Loader2 } from 'lucide-react-native';
import { searchActors, searchPosts as searchPostsService } from '@/services/search';
import { getCustomFeed } from '@/services/feeds';
import { Avatar } from '@/components/ui/Avatar';
import { formatCount } from '@/utils/time';
import type { ActorView, FeedItem } from '@/types/atproto';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 2;
const COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS;

type SearchTab = 'top' | 'people' | 'posts';

function MediaGridTile({ item, onPress }: { item: any; onPress: () => void }) {
  const em = item.record?.embed || item.embed;
  const images = em?.images || [];
  const thumbUrl = images[0]?.thumb || images[0]?.fullsize || em?.thumbnail || em?.video?.thumbnail || null;
  const isVideo = (em?.$type || '').includes('video');
  const isMultiImage = images.length > 1;
  const authorName = item.author?.displayName || item.author?.handle || '';

  if (!thumbUrl) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
      className="overflow-hidden bg-surface-elevated"
    >
      <Image source={{ uri: thumbUrl }} style={{ width: ITEM_SIZE, height: ITEM_SIZE }} resizeMode="cover" />
      <View className="absolute inset-x-0 bottom-0 h-16 justify-end px-1.5 pb-1.5"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View className="flex-row items-center gap-1.5">
          <View className="h-4 w-4 rounded-full overflow-hidden">
            {item.author?.avatar && (
              <Image source={{ uri: item.author.avatar }} className="h-full w-full" resizeMode="cover" />
            )}
          </View>
          <Text className="text-[9px] font-semibold text-white flex-1" numberOfLines={1}>{authorName}</Text>
        </View>
      </View>
      {isVideo && (
        <View className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/40 items-center justify-center">
          <Play size={10} color="white" fill="white" />
        </View>
      )}
      {isMultiImage && (
        <View className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-black/40 items-center justify-center">
          <ImageIcon size={10} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('top');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Search state
  const [actors, setActors] = useState<ActorView[]>([]);
  const [searchPosts, setSearchPosts] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Discover state
  const [discoverPosts, setDiscoverPosts] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverCursor, setDiscoverCursor] = useState<string | undefined>();
  const isFetchingDiscover = useRef(false);

  const hasQuery = debouncedQuery.trim().length >= 2;

  // Perform search
  useEffect(() => {
    if (!hasQuery) {
      setActors([]);
      setSearchPosts([]);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [actorResults, postResults] = await Promise.all([
          searchActors(debouncedQuery, 25),
          searchPostsService(debouncedQuery, undefined, 30),
        ]);
        setActors(actorResults || []);
        setSearchPosts(postResults?.items || []);
      } catch {}
      setSearching(false);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [debouncedQuery, hasQuery]);

  const fetchDiscover = async (cursor?: string) => {
    if (isFetchingDiscover.current) return;
    isFetchingDiscover.current = true;
    try {
      const data = await getCustomFeed(
        'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
        cursor, 30
      );
      const items = (data.items || []).filter((p: any) => {
        const em = p.record?.embed;
        if (!em) return false;
        const t = em.$type || '';
        return t.includes('images') || t.includes('video');
      });
      if (cursor) {
        setDiscoverPosts((prev) => [...prev, ...items]);
      } else {
        setDiscoverPosts(items);
      }
      setDiscoverCursor(data.cursor);
    } catch {}
    isFetchingDiscover.current = false;
    setDiscoverLoading(false);
  };

  // Discover fetch (no query)
  useEffect(() => {
    if (hasQuery) { setDiscoverLoading(false); return; }
    if (discoverPosts.length > 0) { setDiscoverLoading(false); return; }
    setDiscoverLoading(true);
    fetchDiscover();
  }, [hasQuery]);

  const handleScrollEnd = useCallback(() => {
    if (hasQuery) {
      // Search infinite scroll would go here
    } else if (discoverCursor && !isFetchingDiscover.current) {
      fetchDiscover(discoverCursor);
    }
  }, [hasQuery, discoverCursor]);

  const renderContent = () => {
    if (!hasQuery) {
      // Discover grid mode
      if (discoverLoading) {
        return (
          <View className="flex-row flex-wrap" style={{ gap: GAP }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ width: ITEM_SIZE, height: ITEM_SIZE }} className="bg-surface-elevated animate-pulse" />
            ))}
          </View>
        );
      }
      if (discoverPosts.length === 0) {
        return (
          <View className="flex-1 items-center justify-center py-20">
            <LayoutGrid size={48} color="#8e8e8e33" />
            <Text className="text-lg font-medium text-foreground mt-4">Discover media</Text>
            <Text className="text-sm text-muted-foreground mt-1">Photos and videos from across the network</Text>
          </View>
        );
      }
      return (
        <View className="flex-row flex-wrap" style={{ gap: GAP }}>
          {discoverPosts.map((item: any, index: number) => (
            <MediaGridTile
              key={`${item.uri}-${index}`}
              item={item}
              onPress={() => navigation.navigate('PostDetail', { uri: item.uri })}
            />
          ))}
        </View>
      );
    }

    // Search mode
    if (searching) {
      return <ActivityIndicator className="mt-10" color="#f06" />;
    }

    const showPeople = (tab === 'top' || tab === 'people') && actors.length > 0;
    const showPosts = (tab === 'top' || tab === 'posts');

    return (
      <>
        {showPeople && (
          <View className="px-4 pt-4">
            {tab === 'top' && (
              <Text className="mb-2 text-sm font-semibold text-foreground">People</Text>
            )}
            {actors.map((actor) => (
              <TouchableOpacity
                key={actor.did}
                onPress={() => navigation.navigate('Profile', { handle: actor.handle })}
                className="flex-row items-center gap-3 rounded-lg px-2 py-2.5 border-b border-border"
              >
                <Avatar uri={actor.avatar} name={actor.displayName || actor.handle} size="md" />
                <View className="flex-1">
                  <Text className="text-foreground font-semibold text-sm">{actor.displayName || actor.handle}</Text>
                  <Text className="text-muted-foreground text-xs">@{actor.handle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showPosts && (
          <View className="px-2 pt-3">
            {tab === 'top' && actors.length > 0 && (
              <View className="px-2 pb-2">
                <Text className="text-sm font-semibold text-foreground">Posts</Text>
              </View>
            )}
            {searchPosts.length > 0 ? (
              <View className="flex-row flex-wrap" style={{ gap: GAP }}>
                {searchPosts.map((item: any, index: number) => (
                  <MediaGridTile
                    key={`${item.uri}-${index}`}
                    item={item}
                    onPress={() => navigation.navigate('PostDetail', { uri: item.uri })}
                  />
                ))}
              </View>
            ) : (
              <View className="py-16 items-center">
                <Text className="text-muted-foreground">No results for "{debouncedQuery}"</Text>
                <Text className="text-sm text-muted-foreground mt-1">Try a different search</Text>
              </View>
            )}
          </View>
        )}

        {(tab === 'people' && actors.length === 0 && !searching) && (
          <View className="py-16 items-center">
            <Text className="text-muted-foreground">No people found</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-3 pb-2 border-b border-border">
        <Text className="text-lg font-bold text-foreground mb-2">Search</Text>
        <View className="flex-row items-center bg-muted rounded-xl px-4 h-11">
          <Search size={18} color="#8e8e8e" />
          <TextInput
            className="flex-1 ml-2 text-foreground text-[15px]"
            placeholder="Search posts and people..."
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
      </View>

      {/* Search tabs */}
      {hasQuery && (
        <View className="flex-row border-b border-border">
          {(['top', 'people', 'posts'] as SearchTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-2.5 items-center ${
                tab === t ? 'border-b-2 border-brand' : ''
              }`}
            >
              <Text className={`text-sm font-medium ${tab === t ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={renderContent}
        ListFooterComponent={
          !hasQuery && discoverCursor && discoverPosts.length > 0 ? (
            <TouchableOpacity
              onPress={handleScrollEnd}
              className="items-center py-4"
            >
              <Text className="text-sm text-muted-foreground">Load more</Text>
            </TouchableOpacity>
          ) : null
        }
        onEndReached={handleScrollEnd}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
