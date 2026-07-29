import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { Download, Loader2, Check } from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import type { FeedItem } from '@/types/atproto';

interface DownloadButtonProps {
  item: FeedItem;
  variant?: 'default' | 'light';
}

function hasMedia(item: FeedItem): boolean {
  const em = item.record?.embed || item.embed;
  return !!em?.images?.[0] || !!em?.video?.playlist || !!em?.thumbnail;
}

function getMediaUrl(item: FeedItem): string | null {
  const em = item.record?.embed || item.embed;
  return em?.images?.[0]?.fullsize || em?.images?.[0]?.thumb || em?.video?.playlist || em?.thumbnail || null;
}

function getExtension(url: string): string {
  const match = url.match(/\.(\w+)(?:\?|$)/);
  return match?.[1] || 'jpg';
}

export default function DownloadButton({ item, variant = 'default' }: DownloadButtonProps) {
  const [state, setState] = useState<'idle' | 'downloading' | 'done'>('idle');

  const handlePress = useCallback(async () => {
    if (state === 'downloading' || !hasMedia(item)) return;
    setState('downloading');
    try {
      const url = getMediaUrl(item);
      if (!url) throw new Error('No media URL');
      const ext = getExtension(url);
      const filename = `rose-${item.uri.split('/').pop()}-${Date.now()}.${ext}`;
      const dest = new File(Paths.document, filename);
      await File.downloadFileAsync(url, dest);
      setState('done');
      setTimeout(() => setState('idle'), 1500);
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Could not download media');
      setState('idle');
    }
  }, [state, item]);

  if (!hasMedia(item)) return null;

  const color = variant === 'light' ? '#ffffffcc' : '#8e8e8e';

  return (
    <TouchableOpacity onPress={handlePress} disabled={state === 'downloading'} className="p-1">
      {state === 'downloading' ? (
        <Loader2 size={18} color={color} />
      ) : state === 'done' ? (
        <Check size={18} color="#22c55e" />
      ) : (
        <Download size={18} color={color} />
      )}
    </TouchableOpacity>
  );
}
