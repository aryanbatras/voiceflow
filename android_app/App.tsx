import './global.css';

import React, { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from '@/navigation/AppNavigator';
import { useAuthStore } from '@/store/auth-store';
import { resumeSession } from '@/services/agent';

export default function App() {
  const [ready, setReady] = useState(false);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const session = useAuthStore.getState().session;
      if (session) {
        await resumeSession();
      }
      setLoading(false);
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <StatusBar barStyle="dark-content" />
        <Text className="text-3xl font-bold text-brand mb-4">Rose</Text>
        <ActivityIndicator size="large" color="#f06" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
