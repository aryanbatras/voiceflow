import React, { useState } from 'react';
import { View, Text, Image, Platform } from 'react-native';

interface MediaImageProps {
  uri?: string | null;
  aspectRatio?: number; // width/height
  className?: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch';
  isVideo?: boolean;
  children?: React.ReactNode;
}

/**
 * Cross-platform media image component.
 *
 * Uses React Native's <Image> for all platforms — the same component that
 * Avatar.tsx uses successfully. Avoids raw <img> tags and crossOrigin props
 * which can cause Bluesky CDN requests to fail on react-native-web.
 *
 * Shows a fallback placeholder on load failure.
 */
export default function MediaImage({
  uri,
  aspectRatio,
  className = '',
  style,
  resizeMode = 'cover',
  isVideo,
  children,
}: MediaImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View
        className={`bg-muted items-center justify-center ${className}`}
        style={[{ aspectRatio: aspectRatio || 1 }, style]}
      >
        <Text className="text-muted-foreground/30 text-2xl">
          {isVideo ? '▶' : '🖼'}
        </Text>
      </View>
    );
  }

  const containerStyle = [
    { aspectRatio: aspectRatio || 1, overflow: 'hidden' as const },
    style,
  ];

  return (
    <View className={`${className}`} style={containerStyle}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={resizeMode}
        onError={() => setFailed(true)}
      />
      {children}
    </View>
  );
}
