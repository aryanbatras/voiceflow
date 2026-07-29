import React from 'react';
import { View, Image, Text } from 'react-native';
import { clsx } from 'clsx';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = { sm: 28, md: 36, lg: 48, xl: 64 };

export function Avatar({ uri, name = '?', size = 'md', className }: AvatarProps) {
  const px = sizeMap[size];
  const fontSize = px * 0.4;

  return (
    <View
      className={clsx('rounded-full overflow-hidden bg-muted', className)}
      style={{ width: px, height: px }}
    >
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" style={{ width: px, height: px }} />
      ) : (
        <View className="w-full h-full items-center justify-center bg-surface-elevated">
          <Text style={{ fontSize }} className="font-bold text-muted-foreground">
            {(name || '?')[0].toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}
