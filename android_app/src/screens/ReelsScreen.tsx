import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, FlatList, Text, TouchableOpacity, Image, Dimensions, ActivityIndicator, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, ArrowLeft, X, ChevronDown, Home, TrendingUp, Compass, List } from 'lucide-react-native';
import { getCustomFeed, getTimeline, likePost, unlikePost } from '@/services/feeds';
import { formatCount } from '@/utils/time';
import { Avatar } from '@/components/ui/Avatar';
import BookmarkButton from '@/components/feed/BookmarkButton';
import { useAuthStore } from '@/store/auth-store';
import { useFeedSourceStore, PRESET_FEEDS, type FeedSource } from '@/store/feed-source-store';
import type { FeedItem } from '@/types/atproto';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_PAGES = 5;
const SOURCE_TARGET = 15;

// ── Feed Option type for the picker ──
interface FeedOption {
  type: string;
  uri?: string;
  label: string;
}

const PICKER_FEEDS: FeedOption[] = [
  { type: 'all', label: 'All Sources' },
  { type: 'following', label: 'Following' },
  { type: 'trending', label: 'Trending' },
];

// ── Web video player ──
function WebVideoPlayer({ uri, poster, isActive }: { uri: string; poster?: string; isActive: boolean }) {
  const videoRef = useRef<any>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) { v.play().catch(() => {}); }
    else { v.pause(); }
  }, [isActive]);

  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      {/* @ts-ignore */}
      <video ref={videoRef} src={uri} poster={poster} muted loop playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </View>
  );
}

// ── Native video player ──
function NativeVideoPlayer({ uri, isActive }: { uri: string; isActive: boolean }) {
  const { VideoView, useVideoPlayer } = require('expo-video');
  const player = useVideoPlayer(uri, (p: any) => { p.loop = true; });
  useEffect(() => {
    if (isActive) { (player as any).play(); }
    else { (player as any).pause(); }
  }, [isActive, player]);
  return (
    <VideoView player={player} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
      contentFit="contain" nativeControls={false} />
  );
}

// ── Feed source picker ──
function FeedPickerModal({
  visible, onClose, activeFeed, onSelect, savedFeeds,
}: {
  visible: boolean; onClose: () => void; activeFeed: FeedOption;
  onSelect: (f: FeedOption) => void; savedFeeds: FeedSource[];
}) {
  const allOptions = useMemo(() => {
    const custom = savedFeeds.map((f) => ({ type: 'custom', uri: f.uri, label: f.label }));
    return [...PICKER_FEEDS, ...custom];
  }, [savedFeeds]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'all': return '🌐';
      case 'following': return '👤';
      case 'trending': return '🔥';
      case 'custom': return '📋';
      default: return '📋';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose}>
        <View className="mt-28 mx-6 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
          {allOptions.map((feed) => {
            const isActive = activeFeed.type === feed.type && activeFeed.label === feed.label;
            return (
              <TouchableOpacity
                key={`${feed.type}-${feed.uri || feed.label}`}
                onPress={() => onSelect(feed)}
                className={`flex-row items-center gap-3 px-5 py-3.5 ${isActive ? 'bg-white/10' : ''}`}
              >
                <Text style={{ fontSize: 16 }}>{getIcon(feed.type)}</Text>
                <Text className={`text-sm flex-1 ${isActive ? 'text-white font-semibold' : 'text-white/60'}`} numberOfLines={1}>
                  {feed.label}
                </Text>
                {isActive && <View className="h-2 w-2 rounded-full bg-[#f06]" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Reels Screen ──
export default function ReelsScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { savedFeeds } = useFeedSourceStore();

  const [reels, setReels] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liking, setLiking] = useState<Set<string>>(new Set());
  const [likedState, setLikedState] = useState<Map<string, boolean>>(new Map());
  const [showFeedPicker, setShowFeedPicker] = useState(false);
  const [activeFeed, setActiveFeed] = useState<FeedOption>(PICKER_FEEDS[0]);

  // Refs for pagination
  const cursorRef = useRef<Record<string, string | null>>({});
  const hasMoreRef = useRef<Record<string, boolean>>({});
  const fetchingRef = useRef(false);
  const allVideosRef = useRef<FeedItem[]>([]);

  // ── Fetch one page from a single source ──
  const fetchSourcePage = useCallback(async (
    sourceType: string, feedUri?: string, cursor?: string, limit = 50
  ): Promise<{ items: FeedItem[]; cursor: string | null }> => {
    try {
      let data: { items: FeedItem[]; cursor?: string };
      if (sourceType === 'following') {
        data = await getTimeline(cursor, limit);
      } else if (sourceType === 'custom' && feedUri) {
        data = await getCustomFeed(feedUri, cursor, limit);
      } else {
        // trending/all sources -> use a popular feed
        data = await getCustomFeed(
          'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
          cursor, limit
        );
      }
      const items = data.items.filter((p) => {
        const em = p.record?.embed || p.embed;
        return !!em?.video;
      });
      return { items, cursor: data.cursor || null };
    } catch {
      return { items: [], cursor: null };
    }
  }, []);

  // ── Stable fetch function via ref ──
  const fetchVideosRef = useRef<(reset: boolean) => Promise<void>>(async () => {});
  fetchVideosRef.current = useCallback(async (reset: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (reset) {
      setLoading(true);
      cursorRef.current = {};
      hasMoreRef.current = {};
      allVideosRef.current = [];
    } else {
      setLoadingMore(true);
    }

    const sourceKey = activeFeed.type + (activeFeed.uri || '');

    try {
      if (activeFeed.type === 'all') {
        const sources = [
          { type: 'discover' as const },
          { type: 'following' as const },
        ];
        let anyHasMore = false;

        for (const source of sources) {
          const sk = source.type;
          const accKey = 'all_' + sk;
          let srcCursor: string | undefined = reset ? undefined : (cursorRef.current[accKey] || undefined);
          let pageCount = 0;
          let sourceCount = 0;

          while (pageCount < MAX_PAGES) {
            const { items, cursor } = await fetchSourcePage(source.type, undefined, srcCursor);
            const newItems = items.filter(
              (v) => !allVideosRef.current.some((x) => x.uri === v.uri)
            );
            allVideosRef.current.push(...newItems);
            sourceCount += newItems.length;
            srcCursor = cursor ?? undefined;
            cursorRef.current[accKey] = cursor;
            pageCount++;
            if (!cursor || sourceCount >= SOURCE_TARGET) break;
          }
          if (cursorRef.current[accKey]) anyHasMore = true;
        }
        hasMoreRef.current[sourceKey] = anyHasMore;
        setReels([...allVideosRef.current]);
      } else {
        const safeCur = reset ? undefined : (cursorRef.current[sourceKey] || undefined);
        let srcCursor = safeCur;
        let pageCount = 0;

        while (pageCount < MAX_PAGES) {
          const { items, cursor } = await fetchSourcePage(activeFeed.type, activeFeed.uri, srcCursor);
          const newItems = items.filter(
            (v) => !allVideosRef.current.some((x) => x.uri === v.uri)
          );
          allVideosRef.current.push(...newItems);
          srcCursor = cursor ?? undefined;
          cursorRef.current[sourceKey] = cursor;
          pageCount++;
          if (!cursor || allVideosRef.current.length >= 30) break;
        }
        hasMoreRef.current[sourceKey] = !!cursorRef.current[sourceKey];
        setReels([...allVideosRef.current]);
      }
    } catch {
      if (reset) setReels([]);
    }

    setLoading(false);
    setLoadingMore(false);
    fetchingRef.current = false;
  }, [isAuthenticated, activeFeed, fetchSourcePage]);

  // Fetch when feed changes
  useEffect(() => {
    if (isAuthenticated) fetchVideosRef.current(true);
  }, [isAuthenticated, activeFeed]);

  // Load more when approaching last reel
  useEffect(() => {
    if (loading || loadingMore || reels.length === 0 || fetchingRef.current) return;
    const sk = activeFeed.type + (activeFeed.uri || '');
    if (!hasMoreRef.current[sk]) return;
    const threshold = Math.floor(reels.length * 0.7);
    if (currentIndex < threshold) return;
    fetchVideosRef.current(false);
  }, [currentIndex, loading, loadingMore, reels.length, activeFeed]);

  // ── Like / Unlike ──
  const handleLike = useCallback(async (post: FeedItem) => {
    if (!isAuthenticated || liking.has(post.uri)) return;
    setLiking((prev) => new Set(prev).add(post.uri));
    try {
      if (likedState.get(post.uri) && post.viewer?.like) {
        await unlikePost(post.viewer.like);
        setLikedState((prev) => { const m = new Map(prev); m.set(post.uri, false); return m; });
        post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
      } else {
        await likePost(post.uri, post.cid);
        setLikedState((prev) => { const m = new Map(prev); m.set(post.uri, true); return m; });
        post.likeCount = (post.likeCount || 0) + 1;
      }
      setReels((prev) => [...prev]);
    } catch {}
    setLiking((prev) => { const m = new Set(prev); m.delete(post.uri); return m; });
  }, [isAuthenticated, liking, likedState]);

  // ── Feed selection ──
  const handleSelectFeed = useCallback((feed: FeedOption) => {
    setActiveFeed(feed);
    cursorRef.current = {};
    allVideosRef.current = [];
    setCurrentIndex(0);
    setShowFeedPicker(false);
  }, []);

  // Stable ref wrapper for onViewableItemsChanged — RN FlatList crashes if the
  // callback reference changes after mount. The ref always holds the latest logic.
  const onViewableItemsChangedRef = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });
  const onViewableItemsChanged = useCallback((info: any) => {
    onViewableItemsChangedRef.current(info);
  }, []);

  // ── Render single reel ──
  const renderReel = useCallback(({ item, index }: { item: FeedItem; index: number }) => {
    const em = item.record?.embed || item.embed;
    const videoUrl = (em?.video as any)?.playlist || (em?.video as any)?.url || (em as any)?.playlist;
    const thumbUrl = em?.video?.thumbnail || em?.thumbnail;
    const isActive = index === currentIndex;
    const isLiked = likedState.get(item.uri) ?? !!item.viewer?.like;
    const displayName = item.author.displayName || item.author.handle;
    const caption = item.record?.text || '';

    return (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} className="bg-black">
        {/* Video / Image */}
        {videoUrl && Platform.OS === 'web' ? (
          <WebVideoPlayer uri={videoUrl} poster={thumbUrl} isActive={isActive} />
        ) : videoUrl ? (
          <NativeVideoPlayer uri={videoUrl} isActive={isActive} />
        ) : thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/20 text-6xl">▶</Text>
          </View>
        )}

        {/* Bottom gradient overlay — semi-transparent black */}
        <View className="absolute bottom-0 left-0 right-0 h-40" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} />

        {/* Author + caption */}
        <View className="absolute bottom-8 left-4 right-4 z-10">
          <View className="flex-row items-center gap-3 mb-2">
            <Avatar uri={item.author.avatar} name={displayName} size="sm" />
            <Text className="text-white font-semibold text-sm flex-1">{displayName}</Text>
          </View>
          {caption ? (
            <Text className="text-white/80 text-xs leading-relaxed" numberOfLines={2}>{caption}</Text>
          ) : null}
        </View>

        {/* Side buttons */}
        <View className="absolute right-4 bottom-40 items-center gap-6 z-10">
          <TouchableOpacity onPress={() => handleLike(item)} className="items-center">
            <View className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center">
              <Heart size={24} color={isLiked ? '#e74c3c' : 'white'} fill={isLiked ? '#e74c3c' : 'transparent'} />
            </View>
            <Text className="text-white/80 text-xs mt-0.5 font-semibold">{formatCount(item.likeCount || 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center">
            <View className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center">
              <MessageCircle size={24} color="white" />
            </View>
            <Text className="text-white/80 text-xs mt-0.5 font-semibold">{formatCount(item.replyCount || 0)}</Text>
          </TouchableOpacity>
          <View className="items-center">
            <View className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center">
              <BookmarkButton item={item} variant="light" />
            </View>
          </View>
        </View>
      </View>
    );
  }, [currentIndex, likedState, handleLike]);

  // ── Loading state ──
  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white/30 text-sm mt-4 font-medium">Finding reels...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Top bar */}
      <SafeAreaView className="absolute top-0 left-0 right-0 z-20">
        <View className="flex-row items-center justify-between px-4 pt-2 pb-2">
          <TouchableOpacity onPress={() => navigation.goBack()}
            className="h-10 w-10 rounded-2xl bg-black/30 backdrop-blur-md items-center justify-center"
          >
            <X size={20} color="white" />
          </TouchableOpacity>

          {/* Feed picker button */}
          <TouchableOpacity
            onPress={() => setShowFeedPicker(true)}
            className="flex-row items-center gap-1.5 bg-black/25 px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            <Text className="text-white/70 text-xs font-medium">{activeFeed.label}</Text>
            <ChevronDown size={12} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Feed picker modal */}
      <FeedPickerModal
        visible={showFeedPicker}
        onClose={() => setShowFeedPicker(false)}
        activeFeed={activeFeed}
        onSelect={handleSelectFeed}
        savedFeeds={savedFeeds}
      />

      {/* Reels list */}
      {reels.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 rounded-2xl bg-white/5 items-center justify-center mb-5">
            <Text className="text-white/20 text-4xl">▶</Text>
          </View>
          <Text className="text-white/60 text-lg font-medium">No reels found</Text>
          <Text className="text-white/30 text-sm mt-1.5 text-center leading-relaxed max-w-xs">
            Video posts are still rare on Bluesky. Try switching to &ldquo;All Sources&rdquo; or a different feed.
          </Text>
          <TouchableOpacity
            onPress={() => handleSelectFeed(PICKER_FEEDS[0])}
            className="mt-7 px-7 py-2.5 rounded-2xl bg-white/10"
          >
            <Text className="text-white/90 text-sm font-semibold">Try All Sources</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={reels}
            keyExtractor={(item) => `${item.uri}-${item.cid}`}
            renderItem={renderReel}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={SCREEN_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            ListFooterComponent={loadingMore ? (
              <View style={{ height: 100 }} className="items-center justify-center">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : null}
          />

          {/* Position indicator */}
          <SafeAreaView className="absolute bottom-0 left-0 right-0 items-center pb-2">
            <View className="bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <Text className="text-white/50 text-xs font-medium">
                {currentIndex + 1} / {reels.length}
              </Text>
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
