import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, FlatList, Text, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Repeat, LayoutGrid, List as ListIcon, Play } from 'lucide-react-native';
import { getTimeline, getCustomFeed, likePost, unlikePost } from '@/services/feeds';
import FeedSourcePicker from '@/components/feed/FeedSourcePicker';
import StoriesRow from '@/components/feed/StoriesRow';
import FilterPanel from '@/components/feed/FilterPanel';
import BookmarkButton from '@/components/feed/BookmarkButton';
import DownloadButton from '@/components/feed/DownloadButton';
import ImageCarousel from '@/components/feed/ImageCarousel';
import MediaImage from '@/components/ui/MediaImage';
import { useFeedSourceStore } from '@/store/feed-source-store';
import { useViewModeStore } from '@/store/view-mode-store';
import { useFilterStore } from '@/store/filter-store';
import { relativeTime, formatCount } from '@/utils/time';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import type { FeedItem } from '@/types/atproto';

interface FeedScreenProps {
  navigation: any;
  route?: any;
}

export default function FeedScreen({ navigation, route }: FeedScreenProps) {
  const { activeSource } = useFeedSourceStore();
  const { mode: viewMode, setMode: setViewMode } = useViewModeStore();
  const filters = useFilterStore();
  const feedUri = route?.params?.feedUri || activeSource.uri;
  const feedLabel = route?.params?.feedLabel || activeSource.label || 'Feed';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (c?: string) => {
    try {
      return feedUri
        ? await getCustomFeed(feedUri, c)
        : await getTimeline(c);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load feed';
      setError(msg);
      return { items: [], cursor: undefined };
    }
  }, [feedUri]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchFeed();
    setPosts(data.items);
    setCursor(data.cursor);
    setLoading(false);
  }, [fetchFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const data = await fetchFeed();
    setPosts(data.items);
    setCursor(data.cursor);
    setRefreshing(false);
  }, [fetchFeed]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    const data = await fetchFeed(cursor);
    setPosts((prev) => [...prev, ...data.items]);
    setCursor(data.cursor);
    setLoadingMore(false);
  }, [cursor, loadingMore, fetchFeed]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // ── Deduplicate posts by URI ──
  const uniquePosts = useMemo(() => {
    const seen = new Set<string>();
    const result: FeedItem[] = [];
    for (const p of posts) {
      if (!seen.has(p.uri)) {
        seen.add(p.uri);
        result.push(p);
      }
    }
    return result;
  }, [posts]);

  // ── Content filters ──
  const filteredPosts = useMemo(() => {
    let result = uniquePosts;
    if (filters.content.hideReposts) {
      result = result.filter((p) => !p.reason?.$type?.includes('repost'));
    }
    if (filters.content.mediaOnly) {
      result = result.filter((p) => {
        const em = p.record?.embed;
        if (!em) return false;
        const t = em.$type || '';
        return t.includes('images') || t.includes('video');
      });
    }
    if (filters.content.videoOnly) {
      result = result.filter((p) => {
        const em = p.record?.embed;
        if (!em) return false;
        const t = em.$type || '';
        return t.includes('video') || !!em.video;
      });
    }
    return result;
  }, [uniquePosts, filters.content]);

  const [liking, setLiking] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [likedState, setLikedState] = useState<Map<string, boolean>>(new Map());

  const handleLike = useCallback(async (post: FeedItem) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    if (liking.has(post.uri)) return;
    setLiking((prev) => new Set(prev).add(post.uri));

    const isLiked = likedState.get(post.uri) ?? !!post.viewer?.like;
    const likeUri = post.viewer?.like;

    try {
      if (isLiked && likeUri) {
        await unlikePost(likeUri);
        setLikedState((prev) => { const m = new Map(prev); m.set(post.uri, false); return m; });
        setLikeCounts((prev) => { const m = new Map(prev); m.set(post.uri, Math.max(0, (prev.get(post.uri) ?? post.likeCount) - 1)); return m; });
      } else {
        await likePost(post.uri, post.cid);
        setLikedState((prev) => { const m = new Map(prev); m.set(post.uri, true); return m; });
        setLikeCounts((prev) => { const m = new Map(prev); m.set(post.uri, (prev.get(post.uri) ?? post.likeCount) + 1); return m; });
      }
    } catch {}
    setLiking((prev) => { const m = new Set(prev); m.delete(post.uri); return m; });
  }, [isAuthenticated, liking, likedState, navigation]);

  const renderPost = useCallback(({ item }: { item: FeedItem }) => {
    const em = item.record?.embed;
    const images = em?.images || [];
    const firstImage = images[0];
    const thumbUrl = firstImage?.fullsize || firstImage?.thumb || em?.external?.thumb || em?.thumbnail || (em?.video?.thumbnail) || null;
    const isVideo = !!em?.video || (em?.$type || '').includes('video');
    const isLiked = likedState.get(item.uri) ?? !!item.viewer?.like;
    const displayLikes = likeCounts.get(item.uri) ?? item.likeCount;
    const aspectRatio = firstImage?.aspectRatio ? firstImage.aspectRatio.width / firstImage.aspectRatio.height : undefined;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PostDetail', { uri: item.uri })}
        className="px-4 py-3 border-b border-border"
        activeOpacity={0.8}
      >
        {/* Author row */}
        <View className="flex-row items-center gap-3 mb-2.5">
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { handle: item.author.handle })}
          >
            <Avatar uri={item.author.avatar} name={item.author.displayName || item.author.handle} size="sm" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="font-semibold text-foreground text-[15px]" numberOfLines={1}>
              {item.author.displayName || item.author.handle}
            </Text>
            <Text className="text-muted-foreground text-xs">
              @{item.author.handle} · {relativeTime(item.record?.createdAt || item.indexedAt)}
            </Text>
          </View>
        </View>

        {/* Media */}
        {thumbUrl && (
          <View className="w-full rounded-xl overflow-hidden bg-muted mb-2">
            {images.length > 1 ? (
              <View style={{ height: 300 }} className="overflow-hidden">
                <ImageCarousel images={images.map((img: any) => ({ thumb: img.thumb, fullsize: img.fullsize }))} />
              </View>
            ) : (
              <View className="relative">
                <MediaImage
                  uri={thumbUrl}
                  aspectRatio={aspectRatio}
                  isVideo={isVideo}
                >
                  {isVideo && (
                    <View className="absolute inset-0 items-center justify-center" style={{ pointerEvents: 'none' }}>
                      <View className="w-14 h-14 rounded-full bg-black/20 backdrop-blur-sm items-center justify-center shadow-lg">
                        <Play size={24} color="white" fill="white" strokeWidth={0} style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                  )}
                </MediaImage>
                {/* Time overlay pill — matching web design */}
                <View className="absolute top-3 right-3 bg-black/25 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <Text className="text-[11px] font-medium text-white/80">
                    {relativeTime(item.record?.createdAt || item.indexedAt)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Caption */}
        {item.record?.text ? (
          <Text className="text-foreground text-sm leading-relaxed" numberOfLines={3}>
            <Text className="font-semibold">{item.author.displayName || item.author.handle} </Text>
            {item.record.text}
          </Text>
        ) : null}

        {/* Interactions */}
        <View className="flex-row items-center gap-5 mt-2.5">
          <TouchableOpacity onPress={() => handleLike(item)} className="flex-row items-center gap-1.5">
            <Heart size={16} color={isLiked ? '#e74c3c' : '#8e8e8e'} fill={isLiked ? '#e74c3c' : 'transparent'} />
            <Text className={`text-xs ${isLiked ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
              {formatCount(displayLikes)} {displayLikes === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-1.5">
            <MessageCircle size={16} color="#8e8e8e" />
            <Text className="text-xs text-muted-foreground">{formatCount(item.replyCount || 0)}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Repeat size={16} color="#8e8e8e" />
            <Text className="text-xs text-muted-foreground">{formatCount(item.repostCount || 0)}</Text>
          </View>
          <View className="flex-row items-center gap-1 ml-auto">
            {isAuthenticated && <DownloadButton item={item} />}
            {isAuthenticated && <BookmarkButton item={item} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleLike, likedState, likeCounts, navigation, isAuthenticated]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f06" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <FeedSourcePicker />
        <View className="flex-row items-center gap-2">
          <FilterPanel />
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'classic' ? 'grid' : 'classic')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-brand/10' : ''}`}
          >
            {viewMode === 'grid' ? (
              <ListIcon size={20} color={viewMode === 'grid' ? '#f06' : '#8e8e8e'} />
            ) : (
              <LayoutGrid size={20} color="#8e8e8e" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground text-lg text-center">{error}</Text>
          <TouchableOpacity
            onPress={loadInitial}
            className="mt-4 px-6 py-3 rounded-xl bg-brand"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid-list"
          data={filteredPosts.filter((p) => {
            const em = p.record?.embed;
            return !!em?.images?.[0] || !!em?.video?.thumbnail || !!em?.thumbnail;
          })}
          keyExtractor={(item) => item.uri}
          numColumns={2}
          columnWrapperStyle={{ gap: 4 }}
          contentContainerStyle={{ padding: 4 }}
          renderItem={({ item }) => {
            const em = item.record?.embed;
            const img = em?.images?.[0]?.thumb || em?.images?.[0]?.fullsize || em?.video?.thumbnail || em?.thumbnail;
            const aspectRatio = em?.images?.[0]?.aspectRatio;
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('PostDetail', { uri: item.uri })}
                className="flex-1 rounded-xl overflow-hidden bg-muted"
                style={{ aspectRatio: aspectRatio ? aspectRatio.width / aspectRatio.height : 4 / 5 }}
                activeOpacity={0.8}
              >
                <MediaImage uri={img} className="w-full h-full" resizeMode="cover" />
                {/* Video indicator */}
                {(em?.$type || '').includes('video') && (
                  <View className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/40 items-center justify-center">
                    <Play size={10} color="white" fill="white" strokeWidth={0} style={{ marginLeft: 1 }} />
                  </View>
                )}
                {/* Author overlay */}
                <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                  <Text className="text-white text-[10px] font-semibold" numberOfLines={1}>
                    {item.author.displayName || item.author.handle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f06" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color="#f06" /> : null}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20" style={{ height: 400 }}>
              <Text className="text-muted-foreground text-lg">No media posts yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="classic-list"
          data={filteredPosts}
          keyExtractor={(item) => item.uri}
          renderItem={renderPost}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f06" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={() => <StoriesRow navigation={navigation} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="py-4" color="#f06" /> : null}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-muted-foreground text-lg">No posts yet</Text>
              <Text className="text-muted-foreground text-sm mt-1">Follow some users to see their posts</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
