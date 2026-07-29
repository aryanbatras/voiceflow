import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';

export default function SignupScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [creating, setCreating] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }, [isAuthenticated, navigation]);

  const handleCreate = async () => {
    setCreating(true);
    await Linking.openURL('https://bsky.app/signup');
    // Give user time to see the external page before enabling the button
    setTimeout(() => setCreating(false), 3000);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#262626" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Create Account</Text>
      </View>

      <View className="flex-1 px-6 pt-8 items-center">
        <Text className="text-3xl font-bold tracking-tight" style={{ color: '#f06' }}>Rose</Text>
        <Text className="text-base text-muted-foreground text-center leading-relaxed mt-3 mb-8">
          Create your Bluesky account
          {'\n'}directly with Bluesky.
        </Text>

        <View className="w-full max-w-sm mb-8 space-y-3">
          {[
            { num: 1, text: 'Pick a handle (yourname.bsky.social)' },
            { num: 2, text: 'Set your password' },
            { num: 3, text: "Verify you're human" },
            { num: 4, text: 'Come back to Rose automatically' },
          ].map((step) => (
            <View key={step.num} className="flex-row items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3.5">
              <View className="h-7 w-7 rounded-full bg-brand/15 items-center justify-center">
                <Text className="text-xs font-bold" style={{ color: '#f06' }}>{step.num}</Text>
              </View>
              <Text className="text-sm text-foreground flex-1">{step.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating}
          className="w-full max-w-sm py-4 rounded-full bg-brand items-center mb-6 opacity-100 disabled:opacity-60"
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Create Account</Text>
          )}
        </TouchableOpacity>

        <Text className="text-sm text-muted-foreground text-center leading-relaxed mb-4 px-4">
          You'll be taken to Bluesky to choose your handle,{` `}
          set a password, and verify your account.
        </Text>

        <View className="flex-row items-center mt-4">
          <Text className="text-sm text-muted-foreground">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text className="text-sm text-blue font-medium">Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
