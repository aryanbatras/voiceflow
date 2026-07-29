import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users } from 'lucide-react-native';
import { getFollows } from '@/services/graph';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';

export default function FollowingScreen({ navigation, route }: any) {
  const handle = route?.params?.handle || '';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();

  const fetchData = useCallback(async (c?: string): Promise<{ items: any[]; cursor?: string }> => {
    if (!handle) return { items: [] };
    try {
      const result = await getFollows(handle, c);
      return result;
    } catch {
      return { items: [], cursor: undefined };
    }
  }, [handle]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchData();
      setUsers(data.items);
      setCursor(data.cursor);
      setLoading(false);
    })();
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (!cursor) return;
    const data = await fetchData(cursor);
    if (data.items.length > 0) {
      setUsers((prev) => [...prev, ...data.items]);
      setCursor(data.cursor);
    }
  }, [cursor, fetchData]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={22} color="#262626" /></TouchableOpacity>
          <Text className="text-lg font-bold text-foreground ml-3">Following</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Sign in to view following</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#262626" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Following</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f06" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.did}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { handle: item.handle })}
              className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border active:bg-accent/30"
            >
              <Avatar uri={item.avatar} name={item.displayName || item.handle} size="md" />
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-semibold text-foreground truncate">{item.displayName || item.handle}</Text>
                <Text className="text-xs text-muted-foreground truncate">@{item.handle}</Text>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Users size={40} color="#8e8e8e33" />
              <Text className="text-muted-foreground text-lg mt-3">Not following anyone yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
