import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from '@/components/ui/Avatar';
import { relativeTime } from '@/utils/time';
import { likePost, unlikePost } from '@/services/feeds';

interface ReplyThreadProps {
  replies: any[];
  depth?: number;
}

function CommentItem({ post, depth, nestedReplies }: { post: any; depth: number; nestedReplies: any[] }) {
  const session = useAuthStore((s) => s.session);
  const [liked, setLiked] = useState(!!post?.viewer?.like);
  const [likeCount, setLikeCount] = useState(post?.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  const authorDisplay = post?.author?.displayName || post?.author?.handle || '';
  const handle = post?.author?.handle || '';
  const text = post?.record?.text || '';
  const avatar = post?.author?.avatar;
  const time = post?.indexedAt;

  const handleLike = useCallback(async () => {
    if (!session || isLiking) return;
    setIsLiking(true);
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount((c: number) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    try {
      if (wasLiked && post?.viewer?.like) {
        await unlikePost(post.viewer.like);
      } else if (post?.uri && post?.cid) {
        await likePost(post.uri, post.cid);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  }, [session, isLiking, liked, likeCount, post?.uri, post?.cid, post?.viewer?.like]);

  return (
    <View style={{ marginLeft: depth * 20 }} className="bg-muted/30 rounded-2xl mb-2">
      <View className="px-4 py-3">
        <View className="flex-row gap-3">
          <View className="shrink-0">
            <Avatar uri={avatar} name={authorDisplay} size="sm" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{authorDisplay}</Text>
              <Text className="text-xs text-muted-foreground">{relativeTime(time)}</Text>
            </View>
            <Text className="mt-0.5 text-[15px] text-foreground leading-relaxed">{text}</Text>
            <View className="flex-row items-center mt-1.5">
              <TouchableOpacity
                onPress={handleLike}
                disabled={isLiking}
                className="flex-row items-center gap-1"
              >
                <Heart
                  size={14}
                  color={liked ? '#e74c3c' : '#8e8e8e'}
                  fill={liked ? '#e74c3c' : 'transparent'}
                />
                {likeCount > 0 && <Text className="text-xs text-muted-foreground">{likeCount}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      {nestedReplies?.length > 0 && (
        <View className="px-4 pb-2">
          <ReplyThread replies={nestedReplies} depth={depth + 1} />
        </View>
      )}
    </View>
  );
}

export default function ReplyThread({ replies, depth = 0 }: ReplyThreadProps) {
  if (!replies?.length) return null;

  return (
    <View className="py-2 gap-1">
      {replies.map((reply, index) => {
        const node = reply.post ? reply : { post: reply };
        const post = node.post;
        if (!post?.uri) return null;
        const nestedReplies = reply.replies || node.replies || [];
        return <CommentItem key={post.uri || index} post={post} depth={depth} nestedReplies={nestedReplies} />;
      })}
    </View>
  );
}
