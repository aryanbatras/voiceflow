import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, Heart, UserPlus, UserCheck } from 'lucide-react-native';
import { getAuthorFeed, getLikedPosts, likePost, unlikePost } from '@/services/feeds';
import { getProfile, follow, unfollow } from '@/services/graph';
import { relativeTime, formatCount } from '@/utils/time';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import type { FeedItem } from '@/types/atproto';

type ProfileTab = 'posts' | 'replies' | 'media' | 'likes';

export default function ProfileScreen({ navigation, route }: any) {
  const handle = route?.params?.handle || '';
  const currentSession = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOwn = !handle || handle === currentSession?.handle;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [likedPosts, setLikedPosts] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likedCursor, setLikedCursor] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [liking, setLiking] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const target = handle || currentSession?.handle || '';
        const [profileData, feedData] = await Promise.all([
          getProfile(target),
          getAuthorFeed(target, undefined, 30),
        ]);
        setProfile(profileData);
        setPosts(feedData.items || []);
        setFollowing(!!profileData?.viewer?.following);
      } catch {}
      setLoading(false);
    })();
  }, [handle, currentSession]);

  // Fetch liked posts separately (only when Likes tab is active)
  useEffect(() => {
    if (activeTab !== 'likes' || likedPosts.length > 0) return;
    (async () => {
      setLikedLoading(true);
      try {
        const target = handle || currentSession?.handle || '';
        const data = await getLikedPosts(target);
        setLikedPosts(data.items || []);
        setLikedCursor(data.cursor);
      } catch {}
      setLikedLoading(false);
    })();
  }, [activeTab]);

  const handleFollowToggle = useCallback(async () => {
    if (!isAuthenticated || !profile || followingLoading) return;
    setFollowingLoading(true);
    try {
      if (following && profile.viewer?.following) {
        await unfollow(profile.viewer.following);
        setFollowing(false);
        profile.followersCount = Math.max(0, (profile.followersCount || 0) - 1);
      } else {
        const res = await follow(profile.did);
        setFollowing(true);
        profile.followersCount = (profile.followersCount || 0) + 1;
      }
      setProfile({ ...profile });
    } catch {}
    setFollowingLoading(false);
  }, [isAuthenticated, profile, following, followingLoading]);

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'replies', label: 'Replies' },
    { key: 'media', label: 'Media' },
    { key: 'likes', label: 'Likes' },
  ];

  // Deduplicate posts
  const seen = useMemo(() => new Set<string>(), [posts]);
  const uniquePosts = useMemo(() => {
    const result: FeedItem[] = [];
    const s = new Set<string>();
    for (const p of posts) {
      if (!s.has(p.uri)) { s.add(p.uri); result.push(p); }
    }
    return result;
  }, [posts]);

  // Filter by tab
  const replies = useMemo(() => uniquePosts.filter((p) => !!(p.record?.reply)), [uniquePosts]);
  const mediaPosts = useMemo(() => uniquePosts.filter((p) => {
    const em = p.record?.embed || p.embed;
    if (!em) return false;
    const t = em.$type || '';
    return t.includes('images') || t.includes('video');
  }), [uniquePosts]);

  const handleLikeToggle = useCallback(async (item: FeedItem) => {
    if (liking.has(item.uri)) return;
    setLiking((prev) => new Set(prev).add(item.uri));
    try {
      if (item.viewer?.like) {
        await unlikePost(item.viewer.like);
      } else {
        await likePost(item.uri, item.cid);
      }
    } catch {}
    setLiking((prev) => { const m = new Set(prev); m.delete(item.uri); return m; });
  }, [liking]);

  const renderPost = useCallback(({ item }: { item: FeedItem }) => {
    const em = item.record?.embed || item.embed;
    const images = em?.images || [];
    const thumbUrl = images[0]?.fullsize || images[0]?.thumb || em?.external?.thumb || em?.thumbnail || null;
    const isLiked = !!item.viewer?.like;
    const isPending = liking.has(item.uri);
    const displayName = item.author?.displayName || item.author?.handle || '';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('PostDetail', { uri: item.uri })}
        className="px-4 py-3 border-b border-border"
      >
        <View className="flex-row items-center gap-2 mb-1.5">
          <Avatar uri={item.author?.avatar} name={displayName} size="sm" />
          <Text className="text-sm font-semibold text-foreground flex-1">{displayName}</Text>
          <Text className="text-xs text-muted-foreground">{relativeTime(item.record?.createdAt || item.indexedAt)}</Text>
        </View>

        {item.record?.text ? (
          <Text className="text-sm text-foreground leading-relaxed" numberOfLines={4}>
            {item.record.text}
          </Text>
        ) : null}

        {thumbUrl && (
          <Image source={{ uri: thumbUrl }} className="w-full h-48 rounded-xl mt-2 bg-muted" resizeMode="cover" />
        )}

        <View className="flex-row items-center gap-3 mt-2">
          <TouchableOpacity
            onPress={() => handleLikeToggle(item)}
            disabled={isPending}
            className="flex-row items-center gap-1"
          >
            <Heart size={16} color={isLiked ? '#e74c3c' : '#8e8e8e'} fill={isLiked ? '#e74c3c' : 'transparent'} />
            <Text className={`text-xs ${isLiked ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatCount(item.likeCount || 0)}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, liking, handleLikeToggle]);

  const renderTabContent = () => {
    if (activeTab === 'likes') {
      if (likedLoading) {
        return <ActivityIndicator className="mt-10" color="#f06" />;
      }
      if (likedPosts.length === 0) {
        return (
          <View className="py-16 items-center">
            <Text className="text-muted-foreground">No liked posts yet</Text>
          </View>
        );
      }
      return likedPosts.map((item, index) => (
        <View key={`liked-${item.uri}-${index}`}>{renderPost({ item })}</View>
      ));
    }

    let items: FeedItem[];
    if (activeTab === 'replies') items = replies;
    else if (activeTab === 'media') items = mediaPosts;
    else items = uniquePosts;

    if (items.length === 0) {
      const emptyMsg = activeTab === 'replies' ? 'No replies yet' : activeTab === 'media' ? 'No media posts yet' : 'No posts yet';
      return (
        <View className="py-16 items-center">
          <Text className="text-muted-foreground">{emptyMsg}</Text>
        </View>
      );
    }

    return items.map((item, index) => (
      <View key={`${item.uri}-${index}`}>{renderPost({ item })}</View>
    ));
  };

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
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#262626" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground leading-tight">
            {profile?.displayName || profile?.handle || 'Profile'}
          </Text>
          <Text className="text-xs text-muted-foreground">{profile?.postsCount || 0} posts</Text>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Settings size={22} color="#262626" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {/* Banner */}
            <View className="h-32" style={{ backgroundColor: profile?.banner ? 'transparent' : '#f0e6ff' }}>
              {profile?.banner && (
                <Image source={{ uri: profile.banner }} className="w-full h-full" resizeMode="cover" />
              )}
            </View>

            {/* Avatar + Info */}
            <View className="px-4">
              <View className="-mt-12 mb-3">
                <Avatar uri={profile?.avatar} name={profile?.displayName || profile?.handle} size="xl" className="border-4 border-background" />
              </View>
              <Text className="text-xl font-bold text-foreground">{profile?.displayName || profile?.handle}</Text>
              <Text className="text-muted-foreground text-sm">@{profile?.handle}</Text>
              {profile?.description && (
                <Text className="text-foreground text-sm mt-2 leading-relaxed">{profile.description}</Text>
              )}
              <View className="flex-row gap-4 mt-3">
                <TouchableOpacity onPress={() => navigation.navigate('Followers', { handle: profile?.handle })}>
                  <Text className="text-foreground text-sm">
                    <Text className="font-bold">{formatCount(profile?.followersCount || 0)}</Text>{' '}
                    <Text className="text-muted-foreground">followers</Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Following', { handle: profile?.handle })}>
                  <Text className="text-foreground text-sm">
                    <Text className="font-bold">{formatCount(profile?.followsCount || 0)}</Text>{' '}
                    <Text className="text-muted-foreground">following</Text>
                  </Text>
                </TouchableOpacity>
              </View>
              {!isOwn && isAuthenticated && (
                <TouchableOpacity
                  onPress={handleFollowToggle}
                  disabled={followingLoading}
                  className={`mt-3 px-5 py-2.5 rounded-xl items-center ${following ? 'bg-muted border border-border' : 'bg-brand'}`}
                >
                  <View className="flex-row items-center gap-2">
                    {following ? (
                      <UserCheck size={16} color="#262626" />
                    ) : (
                      <UserPlus size={16} color="white" />
                    )}
                    <Text className={`font-semibold text-sm ${following ? 'text-foreground' : 'text-white'}`}>
                      {following ? 'Following' : 'Follow'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Tabs */}
            <View className="flex-row mt-4 border-b border-border">
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-1 py-3 items-center ${activeTab === tab.key ? 'border-b-2 border-brand' : ''}`}
                >
                  <Text className={`text-sm font-medium ${activeTab === tab.key ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            {renderTabContent()}
          </>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
