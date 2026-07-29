import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
} from 'react-native';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { getAgent } from '@/services/agent';
import { Avatar } from '@/components/ui/Avatar';

interface FollowingProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export default function StoriesRow({ navigation }: { navigation: any }) {
  const session = useAuthStore((s) => s.session);
  const [profiles, setProfiles] = useState<FollowingProfile[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (!session?.handle) return;
    (async () => {
      try {
        const agent = getAgent();
        const res = await agent.api.app.bsky.graph.getFollows({
          actor: session.handle,
          limit: 20,
        });
        setProfiles((res.data.follows || []).map((f: any) => ({
          did: f.did,
          handle: f.handle,
          displayName: f.displayName,
          avatar: f.avatar,
        })));
      } catch {}
    })();
  }, [session?.handle]);

  const handleScroll = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const contentWidth = e.nativeEvent.contentSize.width;
    const viewWidth = e.nativeEvent.layoutMeasurement.width;
    setCanScrollLeft(offsetX > 10);
    setCanScrollRight(offsetX < contentWidth - viewWidth - 10);
  }, []);

  const scroll = useCallback((dir: 'left' | 'right') => {
    const offset = (scrollRef.current as any)?.contentOffset?.x || 0;
    const amount = 280;
    scrollRef.current?.scrollTo({
      x: dir === 'left' ? Math.max(0, offset - amount) : offset + amount,
      animated: true,
    });
  }, []);

  if (!profiles.length && !session) return null;

  return (
    <View className="relative px-2 py-3">
      {canScrollLeft && (
        <TouchableOpacity
          onPress={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border shadow-md items-center justify-center"
        >
          <ChevronLeft size={16} color="#262626" />
        </TouchableOpacity>
      )}
      {canScrollRight && (
        <TouchableOpacity
          onPress={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/90 border border-border shadow-md items-center justify-center"
        >
          <ChevronRight size={16} color="#262626" />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="overflow-visible"
      >
        {/* Your story */}
        {session?.handle && (
          <TouchableOpacity
            onPress={() => navigation?.navigate('Profile', { handle: session.handle })}
            className="flex-col items-center gap-1.5 mr-4"
          >
            <View className="relative">
              <View className="h-[60px] w-[60px] rounded-full p-[3px] bg-gradient-to-br from-brand/60 via-brand to-red-500/60">
                <View className="h-full w-full rounded-full bg-background p-[2px]">
                  <Avatar uri="" name="You" size="lg" className="rounded-full" />
                </View>
              </View>
              <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-blue items-center justify-center shadow-md">
                <Plus size={12} color="white" strokeWidth={3} />
              </View>
            </View>
            <Text className="text-[11px] text-muted-foreground font-medium w-16 text-center" numberOfLines={1}>You</Text>
          </TouchableOpacity>
        )}

        {/* Following stories */}
        {profiles.slice(0, 19).map((profile) => (
          <TouchableOpacity
            key={profile.did}
            onPress={() => navigation?.navigate('Profile', { handle: profile.handle })}
            className="flex-col items-center gap-1.5 mr-4"
          >
            <View className="h-[60px] w-[60px] rounded-full p-[3px] bg-gradient-to-br from-brand/40 via-blue/40 to-purple-500/40">
              <View className="h-full w-full rounded-full bg-background p-[2px]">
                <Avatar uri={profile.avatar} name={profile.displayName || profile.handle} size="lg" className="rounded-full" />
              </View>
            </View>
            <Text className="text-[11px] text-muted-foreground font-medium w-16 text-center" numberOfLines={1}>
              {profile.displayName || profile.handle.replace('.bsky.social', '').slice(0, 10)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
