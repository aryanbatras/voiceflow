import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MessageCircle, Repeat, UserPlus, Bell, ArrowLeft } from 'lucide-react-native';
import { getNotifications, updateSeenNotifications } from '@/services/notifications';
import { relativeTime } from '@/utils/time';
import { Avatar } from '@/components/ui/Avatar';
import type { NotificationItem } from '@/types/atproto';

type NotificationFilter = 'all' | 'likes' | 'reposts' | 'follows' | 'mentions' | 'replies';

const FILTER_TABS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'likes', label: 'Likes' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'follows', label: 'Follows' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'replies', label: 'Replies' },
];

const REASON_MAP: Record<string, NotificationFilter> = {
  like: 'likes',
  repost: 'reposts',
  follow: 'follows',
  mention: 'mentions',
  reply: 'replies',
  quote: 'replies',
};

const reasonLabels: Record<string, string> = {
  like: 'liked your post',
  repost: 'reposted your post',
  follow: 'followed you',
  mention: 'mentioned you',
  reply: 'replied to your post',
  quote: 'quoted your post',
};

const reasonIcons: Record<string, React.ReactNode> = {
  like: <Heart size={18} color="#e74c3c" fill="#e74c3c" />,
  repost: <Repeat size={18} color="#2ecc71" />,
  follow: <UserPlus size={18} color="#4a8fe0" />,
  mention: <MessageCircle size={18} color="#f06" />,
  reply: <MessageCircle size={18} color="#4a8fe0" />,
  quote: <Repeat size={18} color="#9b59b6" />,
};

function NotificationCard({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const authorDisplay = item.author.displayName || item.author.handle;
  const timeAgo = relativeTime(item.indexedAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-start gap-3 px-4 py-3.5 border-b border-border transition-colors ${
        !item.isRead ? 'bg-brand-muted/20' : ''
      }`}
    >
      <Avatar uri={item.author.avatar} name={authorDisplay} size="md" />
      <View className="w-8 items-center pt-1">{reasonIcons[item.reason] || null}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-foreground text-sm leading-relaxed">
          <Text className="font-semibold">{authorDisplay}</Text>
          {' '}{reasonLabels[item.reason] || 'interacted with your post'}
        </Text>
        {'text' in (item.record || {}) && (item.record as any)?.text ? (
          <Text className="mt-0.5 text-xs text-muted-foreground line-clamp-2" numberOfLines={2}>
            {(item.record as any).text}
          </Text>
        ) : null}
        <Text className="mt-0.5 text-xs text-muted-foreground">{timeAgo}</Text>
      </View>
      {!item.isRead && (
        <View className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await getNotifications();
        setNotifications(data.items || []);
        // Mark as read once loaded
        const hasUnread = (data.items || []).some((n: any) => !n.isRead);
        if (hasUnread) {
          await updateSeenNotifications();
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    })();
  }, []);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((item) => REASON_MAP[item.reason] === activeFilter);
  }, [notifications, activeFilter]);

  const handlePress = useCallback((item: NotificationItem) => {
    if (item.reason === 'follow') {
      navigation.navigate('Profile', { handle: item.author.handle });
    } else if (item.reasonSubject) {
      navigation.navigate('PostDetail', { uri: item.reasonSubject });
    }
  }, [navigation]);

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
        <Text className="text-lg font-bold text-foreground flex-1">Notifications</Text>
      </View>

      {/* Filter tabs */}
      <View className="flex-row border-b border-border overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveFilter(tab.key)}
            className={`flex-1 px-3 py-2.5 items-center ${
              activeFilter === tab.key ? 'border-b-2 border-brand' : ''
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeFilter === tab.key ? 'text-brand' : 'text-muted-foreground'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {error ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-muted-foreground">Failed to load notifications</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          renderItem={({ item }) => (
            <NotificationCard item={item} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-4">
              <Bell size={48} color="#8e8e8e33" />
              <Text className="text-lg font-medium text-foreground mt-4">
                {activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} yet`}
              </Text>
              <Text className="text-sm text-muted-foreground mt-1 text-center">
                {activeFilter === 'all'
                  ? 'When someone interacts with you, it will show up here'
                  : 'Check back later'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
