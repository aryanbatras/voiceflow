import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';

export default function MessagesScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Auth guard — redirect to login (using reset to prevent back-button loop)
  useEffect(() => {
    if (!isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [isAuthenticated, navigation]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Sticky header — no back button, matching web */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <Text className="text-lg font-bold text-foreground">Messages</Text>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <MessageCircle size={48} color="#8e8e8e33" />
        <Text className="text-lg font-medium text-foreground mt-4">No messages yet</Text>
        <Text className="text-sm text-muted-foreground mt-1 text-center leading-relaxed">
          Direct messaging coming soon with Bluesky DMs
        </Text>
      </View>
    </SafeAreaView>
  );
}
