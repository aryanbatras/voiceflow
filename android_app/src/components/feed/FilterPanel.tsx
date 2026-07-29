import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, TextInput, Modal } from 'react-native';
import { Filter, X, Plus } from 'lucide-react-native';
import { useFilterStore } from '@/store/filter-store';

export default function FilterPanel() {
  const [visible, setVisible] = useState(false);
  const [newWord, setNewWord] = useState('');
  const {
    content, mute, setContent, addMutedWord, removeMutedWord,
    setDisplay, display, activeFilterCount, resetAll,
  } = useFilterStore();

  const count = activeFilterCount();

  return (
    <View>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-muted"
      >
        <Filter size={16} color="#8e8e8e" />
        {count > 0 && (
          <View className="h-4 min-w-[16px] rounded-full bg-brand items-center justify-center px-1">
            <Text className="text-[10px] font-bold text-white">{count}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 bg-black/30 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setVisible(false)} />
          <View className="bg-white rounded-t-2xl max-h-[80%] pb-8">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
              <Text className="text-lg font-bold text-foreground">Filters</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={22} color="#262626" />
              </TouchableOpacity>
            </View>

            <View className="px-4 py-4 space-y-5">
              {/* Content filters */}
              <View>
                <Text className="text-sm font-semibold text-foreground mb-3">Content</Text>
                {[
                  { key: 'hideReposts', label: 'Hide Reposts' },
                  { key: 'hideReplies', label: 'Hide Replies' },
                  { key: 'hideQuotePosts', label: 'Hide Quote Posts' },
                  { key: 'mediaOnly', label: 'Media Only' },
                  { key: 'videoOnly', label: 'Videos Only' },
                ].map(({ key, label }) => (
                  <View key={key} className="flex-row items-center justify-between py-2.5">
                    <Text className="text-sm text-foreground">{label}</Text>
                    <Switch
                      value={(content as any)[key]}
                      onValueChange={() => setContent({ [key]: !(content as any)[key] })}
                      trackColor={{ false: '#e3e3e3', true: '#f06' }}
                      thumbColor="white"
                    />
                  </View>
                ))}
              </View>

              {/* Muted words */}
              <View>
                <Text className="text-sm font-semibold text-foreground mb-3">Muted Words</Text>
                <View className="flex-row gap-2 mb-2">
                  <TextInput
                    className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground"
                    placeholder="Add word..."
                    placeholderTextColor="#8e8e8e"
                    value={newWord}
                    onChangeText={setNewWord}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (newWord.trim()) {
                        addMutedWord(newWord.trim().toLowerCase());
                        setNewWord('');
                      }
                    }}
                    className="h-10 w-10 rounded-xl bg-brand items-center justify-center"
                  >
                    <Plus size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {mute.mutedWords.map((word) => (
                  <View key={word} className="flex-row items-center gap-2 py-1.5">
                    <Text className="text-sm text-foreground flex-1">{word}</Text>
                    <TouchableOpacity onPress={() => removeMutedWord(word)}>
                      <X size={16} color="#8e8e8e" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Display */}
              <View>
                <Text className="text-sm font-semibold text-foreground mb-3">Display</Text>
                <View className="flex-row items-center justify-between py-2.5">
                  <Text className="text-sm text-foreground">Hide Engagement Metrics</Text>
                  <Switch
                    value={display.hideEngagementMetrics}
                    onValueChange={() => setDisplay({ hideEngagementMetrics: !display.hideEngagementMetrics })}
                    trackColor={{ false: '#e3e3e3', true: '#f06' }}
                    thumbColor="white"
                  />
                </View>
              </View>

              {/* Reset */}
              <TouchableOpacity
                onPress={resetAll}
                className="py-3 items-center rounded-xl bg-muted"
              >
                <Text className="text-sm font-medium text-destructive">Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
