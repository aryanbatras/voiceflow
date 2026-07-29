import React, { useRef, useState } from 'react';
import {
  View, Image, Dimensions, FlatList, Text,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageCarouselProps {
  images: Array<{ thumb?: string; fullsize?: string; alt?: string }>;
  className?: string;
}

export default function ImageCarousel({ images, className }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  if (!images || images.length === 0) return null;

  return (
    <View className={className}>
      <FlatList
        ref={flatRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveIndex(idx);
        }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }} className="items-center justify-center">
            <Image
              source={{ uri: item.fullsize || item.thumb }}
              className="w-full h-full"
              resizeMode="contain"
              accessibilityLabel={item.alt || ''}
            />
          </View>
        )}
      />
      {images.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
          {images.map((_, i) => (
            <View
              key={i}
              className={`rounded-full ${i === activeIndex ? 'bg-white w-2' : 'bg-white/40 w-1.5'}`}
              style={{ width: i === activeIndex ? 8 : 6, height: 6 }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
