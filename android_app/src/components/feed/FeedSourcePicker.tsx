import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ChevronDown, Home, TrendingUp, Compass, List, Plus } from 'lucide-react-native';
import { useFeedSourceStore, PRESET_FEEDS, type FeedSource } from '@/store/feed-source-store';

interface FeedSourcePickerProps {
  onCustomFeed?: () => void;
}

export default function FeedSourcePicker({ onCustomFeed }: FeedSourcePickerProps) {
  const [visible, setVisible] = useState(false);
  const { activeSource, savedFeeds, setActiveSource } = useFeedSourceStore();

  const allSources: FeedSource[] = [...PRESET_FEEDS, ...savedFeeds];

  const getIcon = (type: string) => {
    switch (type) {
      case 'following': return <Home size={16} color="#8e8e8e" />;
      case 'trending': return <TrendingUp size={16} color="#8e8e8e" />;
      case 'discover': return <Compass size={16} color="#8e8e8e" />;
      default: return <List size={16} color="#8e8e8e" />;
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-muted"
      >
        {getIcon(activeSource.type)}
        <Text className="text-foreground text-sm font-semibold" numberOfLines={1}>
          {activeSource.label}
        </Text>
        <ChevronDown size={14} color="#8e8e8e" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/30"
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View className="mt-20 mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
            <FlatList
              data={allSources}
              keyExtractor={(item) => `${item.type}-${item.uri || item.label}`}
              renderItem={({ item }) => {
                const isActive = activeSource.type === item.type && activeSource.label === item.label;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveSource(item);
                      setVisible(false);
                    }}
                    className={`flex-row items-center gap-3 px-4 py-3.5 ${isActive ? 'bg-brand/10' : ''}`}
                  >
                    {getIcon(item.type)}
                    <Text
                      className={`text-sm flex-1 ${isActive ? 'text-brand font-semibold' : 'text-foreground'}`}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {isActive && <View className="h-2 w-2 rounded-full bg-brand" />}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                onCustomFeed ? (
                  <TouchableOpacity
                    onPress={() => { setVisible(false); onCustomFeed(); }}
                    className="flex-row items-center gap-3 px-4 py-3.5 border-t border-border"
                  >
                    <Plus size={16} color="#8e8e8e" />
                    <Text className="text-sm text-muted-foreground">Browse feeds...</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
