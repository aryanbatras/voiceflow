import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { useBookmarkStore } from '@/store/bookmark-store';
import { useAuthStore } from '@/store/auth-store';
import type { FeedItem } from '@/types/atproto';

interface BookmarkButtonProps {
  item: FeedItem;
  variant?: 'light' | 'default';
}

export default function BookmarkButton({ item, variant = 'default' }: BookmarkButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarkStore();
  const [saving, setSaving] = useState(false);

  const bookmarked = isBookmarked(item.uri);
  const color = variant === 'light' ? '#ffffff' : '#8e8e8e';
  const activeColor = '#f06';

  const handlePress = async () => {
    if (!isAuthenticated) return;
    setSaving(true);
    try {
      if (bookmarked) {
        await removeBookmark(item.uri);
      } else {
        const em = item.record?.embed || item.embed;
        const img = em?.images?.[0]?.thumb || em?.images?.[0]?.fullsize || em?.thumbnail || em?.video?.thumbnail;
        await addBookmark({
          uri: item.uri,
          author: item.author,
          text: item.record?.text || '',
          savedAt: new Date().toISOString(),
          thumbnail: img || undefined,
          isVideo: !!em?.video,
        });
      }
    } catch {}
    setSaving(false);
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={saving} className="p-1">
      {saving ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Bookmark
          size={variant === 'light' ? 24 : 18}
          color={bookmarked ? activeColor : color}
          fill={bookmarked ? activeColor : 'transparent'}
        />
      )}
    </TouchableOpacity>
  );
}
