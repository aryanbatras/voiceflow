import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useViewModeStore } from '@/store/view-mode-store';
import type { ViewMode } from '@/store/view-mode-store';

const MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'grid', label: 'Grid' },
  { mode: 'classic', label: 'Classic' },
];

export default function ViewModeToggle() {
  const { mode, setMode } = useViewModeStore();

  return (
    <View className="flex-row items-center bg-muted rounded-xl p-0.5">
      {MODES.map((m) => (
        <TouchableOpacity
          key={m.mode}
          onPress={() => setMode(m.mode)}
          className={`px-3 py-1.5 rounded-lg ${mode === m.mode ? 'bg-surface-elevated shadow-sm' : ''}`}
        >
          <Text
            className={`text-xs font-medium ${
              mode === m.mode ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
