import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/Avatar';
import { formatCount } from '@/utils/time';
import { follow, unfollow } from '@/services/graph';

interface ProfileHeaderProps {
  profile: any;
  navigation: any;
}

export default function ProfileHeader({ profile, navigation }: ProfileHeaderProps) {
  const session = useAuthStore((s) => s.session);
  const [isFollowing, setIsFollowing] = useState(!!profile?.viewer?.following);
  const [followUri, setFollowUri] = useState(profile?.viewer?.following || '');
  const [followLoading, setFollowLoading] = useState(false);

  const isOwn = session?.did === profile?.did;

  const handleFollowToggle = async () => {
    if (!profile?.did || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing && followUri) {
        await unfollow(followUri);
        setIsFollowing(false);
        setFollowUri('');
      } else {
        const uri = await follow(profile.did);
        setIsFollowing(true);
        setFollowUri(uri);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update follow status');
    }
    setFollowLoading(false);
  };

  return (
    <View>
      {/* Banner */}
      <View className="h-40 bg-gradient-to-r from-brand/20 to-blue/20">
        {profile?.banner && (
          <Image source={{ uri: profile.banner }} className="w-full h-full" resizeMode="cover" />
        )}
      </View>

      {/* Avatar + info */}
      <View className="px-4 -mt-12">
        <Avatar uri={profile?.avatar} name={profile?.displayName || profile?.handle} size="xl" className="border-4 border-background" />

        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{profile?.displayName || profile?.handle}</Text>
            <Text className="text-sm text-muted-foreground">@{profile?.handle}</Text>
          </View>

          {!isOwn && (
            <TouchableOpacity
              onPress={handleFollowToggle}
              disabled={followLoading}
              className={`px-6 py-2 rounded-full ${isFollowing ? 'bg-muted border border-border' : 'bg-brand'}`}
            >
              <Text className={`text-sm font-semibold ${isFollowing ? 'text-foreground' : 'text-white'}`}>
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {profile?.description && (
          <Text className="text-sm text-foreground mt-2 leading-relaxed">{profile.description}</Text>
        )}

        <View className="flex-row gap-4 mt-3 mb-4">
          <View>
            <Text className="text-sm text-foreground">
              <Text className="font-bold">{formatCount(profile?.followersCount || 0)}</Text>{' '}
              <Text className="text-muted-foreground">followers</Text>
            </Text>
          </View>
          <View>
            <Text className="text-sm text-foreground">
              <Text className="font-bold">{formatCount(profile?.followsCount || 0)}</Text>{' '}
              <Text className="text-muted-foreground">following</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
