import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, FlatList } from 'react-native';
import { TrendingUp, Flame } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useFeedSourceStore } from '@/store/feed-source-store';
import { getAgent } from '@/services/agent';

interface TrendingFeed {
  uri: string;
  label: string;
  description: string;
  avatar?: string;
  likeCount: number;
}

export default function TrendingFeedView({ navigation }: { navigation: any }) {
  const session = useAuthStore((s) => s.session);
  const { savedFeeds, addSavedFeed, removeSavedFeed, setActiveSource } = useFeedSourceStore();
  const [feeds, setFeeds] = useState<TrendingFeed[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeeds = useCallback(async () => {
    if (!session) return;
    try {
      const agent = getAgent();
      const res = await agent.api.app.bsky.unspecced.getPopularFeedGenerators({ limit: 20 });
      setFeeds((res.data.feeds || []).map((f: any) => ({
        uri: f.uri,
        label: f.displayName || f.name || 'Untitled',
        description: f.description || '',
        avatar: f.avatar,
        likeCount: f.likeCount || 0,
      })));
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  const isSubscribed = useCallback(
    (uri: string) => savedFeeds.some((f) => f.uri === uri),
    [savedFeeds]
  );

  const handleSubscribe = useCallback((feed: TrendingFeed) => {
    addSavedFeed({ type: 'custom', uri: feed.uri, label: feed.label });
  }, [addSavedFeed]);

  const handleUnsubscribe = useCallback((uri: string) => {
    removeSavedFeed(uri);
  }, [removeSavedFeed]);

  const handleViewFeed = useCallback((feed: TrendingFeed) => {
    setActiveSource({ type: 'custom', uri: feed.uri, label: feed.label });
    navigation?.navigate('Feed');
  }, [setActiveSource, navigation]);

  if (loading) {
    return (
      <View className="px-4 py-8">
        <ActivityIndicator size="large" color="#f06" />
      </View>
    );
  }

  return (
    <View className="px-4 py-4">
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-4">
        <View className="h-10 w-10 rounded-xl bg-orange-500/15 items-center justify-center">
          <Flame size={20} color="#f97316" />
        </View>
        <View>
          <Text className="text-base font-bold text-foreground">Trending Feeds</Text>
          <Text className="text-xs text-muted-foreground">Popular community feeds across Bluesky</Text>
        </View>
      </View>

      {feeds.length === 0 ? (
        <View className="py-12 items-center">
          <TrendingUp size={40} color="#8e8e8e" style={{ opacity: 0.3 }} />
          <Text className="text-sm text-muted-foreground mt-3">No trending feeds available</Text>
        </View>
      ) : (
        <FlatList
          data={feeds}
          keyExtractor={(item) => item.uri}
          renderItem={({ item }) => {
            const subbed = isSubscribed(item.uri);
            return (
              <View className="flex-row items-center gap-3 py-3 rounded-xl">
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} className="h-10 w-10 rounded-xl" />
                ) : (
                  <View className="h-10 w-10 rounded-xl bg-orange-500/10 items-center justify-center">
                    <Flame size={20} color="#f97316" style={{ opacity: 0.6 }} />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{item.label}</Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    {item.description || ''}
                  </Text>
                </View>
                {subbed ? (
                  <TouchableOpacity
                    onPress={() => handleViewFeed(item)}
                    className="px-4 py-1.5 rounded-full bg-brand"
                  >
                    <Text className="text-white text-xs font-semibold">View</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSubscribe(item)}
                    className="px-4 py-1.5 rounded-full border border-border"
                  >
                    <Text className="text-xs font-medium text-foreground">+ Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
