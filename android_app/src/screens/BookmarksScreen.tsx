import React from 'react';
import { View, Text, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bookmark, Play } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useBookmarkStore } from '@/store/bookmark-store';

export default function BookmarksScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { bookmarks } = useBookmarkStore();

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Bookmarks</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Bookmark size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4 text-center">Sign in to bookmarks posts</Text>
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
        <Text className="text-lg font-bold text-foreground flex-1">Bookmarks</Text>
        {bookmarks.length > 0 && (
          <Text className="text-xs text-muted-foreground">{bookmarks.length} saved</Text>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Bookmark size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4">No bookmarks yet</Text>
          <Text className="text-muted-foreground text-sm mt-1 text-center">Bookmark posts to save them for later</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Feed')}
            className="mt-5 px-6 py-3 rounded-xl bg-brand"
          >
            <Text className="text-white font-semibold text-sm">Browse feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          numColumns={2}
          keyExtractor={(item) => item.uri}
          columnWrapperStyle={{ gap: 4 }}
          contentContainerStyle={{ padding: 4 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('PostDetail', { uri: item.uri })}
              className="flex-1 aspect-[4/5] rounded-xl overflow-hidden bg-muted"
              activeOpacity={0.8}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="flex-1 items-center justify-center p-2">
                  <Text className="text-muted-foreground text-xs text-center" numberOfLines={4}>
                    {item.text || 'No preview'}
                  </Text>
                </View>
              )}
              {item.isVideo && (
                <View className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/40 items-center justify-center">
                  <Play size={12} color="white" fill="white" />
                </View>
              )}
              <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <Text className="text-white text-[10px] font-semibold" numberOfLines={1}>
                  {item.author.displayName || item.author.handle}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
