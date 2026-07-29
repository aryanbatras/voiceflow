import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, MessageCircle, Repeat, SendHorizontal } from 'lucide-react-native';
import ReplyThread from '@/components/feed/ReplyThread';
import MediaImage from '@/components/ui/MediaImage';
import { getPostThread, likePost, unlikePost, repostPost, unrepostPost } from '@/services/feeds';
import { relativeTime, formatCount } from '@/utils/time';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import type { FeedItem } from '@/types/atproto';

// Web video player (shared pattern with ReelsScreen)
function WebVideoPlayer({ uri, poster }: { uri: string; poster?: string }) {
  const videoRef = useRef<any>(null);
  return (
    <View className="w-full" style={{ aspectRatio: 16 / 9 }}>
      {/* @ts-ignore */}
      <video ref={videoRef} src={uri} poster={poster} controls muted loop playsInline
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }} />
    </View>
  );
}

export default function PostDetailScreen({ navigation, route }: any) {
  const uri = route?.params?.uri || '';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const session = useAuthStore((s) => s.session);

  const [post, setPost] = useState<FeedItem | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeUri, setLikeUri] = useState<string | undefined>();
  const [reposted, setReposted] = useState(false);
  const [repostUri, setRepostUri] = useState<string | undefined>();
  const [likeCount, setLikeCount] = useState(0);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!uri) return;
    (async () => {
      try {
        const thread = await getPostThread(uri);
        const postData = thread?.post || thread;
        setPost(postData);
        setLiked(!!postData?.viewer?.like);
        setLikeUri(postData?.viewer?.like);
        setReposted(!!postData?.viewer?.repost);
        setRepostUri(postData?.viewer?.repost);
        setLikeCount(postData?.likeCount || 0);
        setReplies(thread?.replies?.filter((r: any) => r.post) || []);
      } catch {}
      setLoading(false);
    })();
  }, [uri]);

  const handleLike = useCallback(async () => {
    if (!isAuthenticated || !post) {
      navigation.navigate('Login');
      return;
    }
    try {
      if (liked && likeUri) {
        await unlikePost(likeUri);
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        const result = await likePost(post.uri, post.cid);
        setLiked(true);
        setLikeUri(result);
        setLikeCount((c) => c + 1);
      }
    } catch {}
  }, [isAuthenticated, post, liked, likeUri, navigation]);

  const handleRepost = useCallback(async () => {
    if (!isAuthenticated || !post) return;
    try {
      if (reposted && repostUri) {
        await unrepostPost(repostUri);
        setReposted(false);
        setRepostUri(undefined);
      } else {
        const result = await repostPost(post.uri, post.cid);
        setReposted(true);
        setRepostUri(result);
      }
    } catch {}
  }, [isAuthenticated, post, reposted, repostUri]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f06" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Post</Text>
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground text-lg">Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const em = post.record?.embed || post.embed;
  const firstImage = em?.images?.[0];
  const thumbUrl = firstImage?.fullsize || firstImage?.thumb || em?.external?.thumb || em?.thumbnail || null;
  const isVideo = !!em?.video;
  const videoUrl = isVideo ? (em?.video as any)?.playlist || (em?.video as any)?.url : undefined;
  const aspectRatio = firstImage?.aspectRatio ? firstImage.aspectRatio.width / firstImage.aspectRatio.height : undefined;
  const replyCount = replies.length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#262626" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Post</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Post */}
        <View className="px-4 py-4">
          {/* Author row */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile', { handle: post.author.handle })}
            className="flex-row items-center gap-3 mb-3"
          >
            <Avatar uri={post.author.avatar} name={post.author.displayName || post.author.handle} size="md" />
            <View className="flex-1">
              <Text className="font-semibold text-foreground text-[15px]" numberOfLines={1}>
                {post.author.displayName || post.author.handle}
              </Text>
              <Text className="text-muted-foreground text-xs">
                @{post.author.handle} · {relativeTime(post.record?.createdAt || post.indexedAt)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Text */}
          {post.record?.text ? (
            <Text className="text-foreground text-base leading-relaxed mb-3">{post.record.text}</Text>
          ) : null}

          {/* Media – video or image */}
          {isVideo && videoUrl && Platform.OS === 'web' ? (
            <WebVideoPlayer uri={videoUrl} poster={thumbUrl || undefined} />
          ) : isVideo && videoUrl ? (
            <View className="w-full rounded-xl overflow-hidden mb-3" style={{ aspectRatio: 16 / 9 }}>
              <Image source={{ uri: thumbUrl || undefined }} className="w-full h-full" resizeMode="contain" />
              <View className="absolute inset-0 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-black/40 items-center justify-center">
                  <Text className="text-white text-2xl">▶</Text>
                </View>
              </View>
            </View>
          ) : thumbUrl ? (
            <View className="w-full rounded-xl overflow-hidden bg-muted mb-3">
              <MediaImage uri={thumbUrl} aspectRatio={aspectRatio} />
            </View>
          ) : null}

          {/* Actions */}
          <View className="flex-row items-center gap-6 py-3 border-t border-border">
            <TouchableOpacity onPress={handleLike} className="flex-row items-center gap-1.5">
              <Heart size={20} color={liked ? '#e74c3c' : '#8e8e8e'} fill={liked ? '#e74c3c' : 'transparent'} />
              <Text className={`text-sm ${liked ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                {formatCount(likeCount)}
              </Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-1.5">
              <MessageCircle size={20} color="#8e8e8e" />
              <Text className="text-sm text-muted-foreground">{formatCount(post.replyCount || 0)}</Text>
            </View>
            <TouchableOpacity onPress={handleRepost} className="flex-row items-center gap-1.5">
              <Repeat size={20} color={reposted ? '#2ecc71' : '#8e8e8e'} />
              <Text className={`text-sm ${reposted ? 'text-green font-semibold' : 'text-muted-foreground'}`}>
                {formatCount(post.repostCount || 0)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Replies */}
        <View className="px-4 pb-8">
          {/* Reply count header */}
          {replyCount > 0 && (
            <Text className="text-sm font-semibold text-foreground mb-3">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </Text>
          )}

          {replyCount === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-muted-foreground text-sm">No replies yet. Be the first to reply!</Text>
              {isAuthenticated ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Compose', {
                    replyUri: post.uri,
                    replyCid: post.cid,
                    replyAuthor: post.author.handle,
                    replyText: (post.record?.text || '').slice(0, 100),
                  })}
                  className="mt-3 px-5 py-2 rounded-full bg-brand"
                >
                  <Text className="text-white font-semibold text-sm">Write a reply</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  className="mt-3 px-5 py-2 rounded-full bg-brand/10"
                >
                  <Text className="text-brand font-semibold text-sm">Sign in to reply</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ReplyThread replies={replies} depth={0} />
          )}
        </View>
      </ScrollView>

      {/* Reply composer — fixed at bottom, matching web */}
      <View className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
        <View className="flex-row items-center gap-3">
          <View className="h-8 w-8 rounded-full bg-muted overflow-hidden items-center justify-center">
            {session?.handle ? (
              <Text className="text-xs font-semibold text-muted-foreground">
                {session.handle.charAt(0).toUpperCase()}
              </Text>
            ) : null}
          </View>
          <View className="flex-1">
            <TextInput
              className="text-sm text-foreground py-2 bg-transparent w-full"
              placeholder={isAuthenticated ? 'Write a reply...' : 'Sign in to reply...'}
              placeholderTextColor="#8e8e8e"
              value={replyText}
              onChangeText={setReplyText}
              onFocus={() => { if (!isAuthenticated) navigation.navigate('Login'); }}
              onKeyPress={(e: any) => {
                if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey && replyText.trim() && isAuthenticated && post) {
                  navigation.navigate('Compose', {
                    replyUri: post.uri,
                    replyCid: post.cid,
                    replyAuthor: post.author.handle,
                    replyText: (post.record?.text || '').slice(0, 100),
                    text: replyText.trim(),
                  });
                  setReplyText('');
                }
              }}
            />
          </View>
          {replyText.trim() && isAuthenticated && post && (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('Compose', {
                  replyUri: post.uri,
                  replyCid: post.cid,
                  replyAuthor: post.author.handle,
                  replyText: (post.record?.text || '').slice(0, 100),
                  text: replyText.trim(),
                });
                setReplyText('');
              }}
              className="h-9 w-9 rounded-full bg-brand items-center justify-center"
            >
              <SendHorizontal size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
