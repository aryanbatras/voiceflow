import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '@/services/agent';
import { useAuthStore } from '@/store/auth-store';

export default function LoginScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Please enter your handle/email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const success = await login(identifier, password);
      if (success) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        setError('Invalid credentials. Make sure you\'re using an App Password (not your main password).');
      }
    } catch (e: any) {
      const msg = e?.message || 'Connection failed';
      setError(msg);
      if (msg.toLowerCase().includes('verification')) {
        setError('Your email needs to be verified. Please verify your email on bsky.app first.');
      }
    }
    setLoading(false);
  };

  const isErrorVerification = error.toLowerCase().includes('verify') || error.toLowerCase().includes('verification');

  return (
    <SafeAreaView className="flex-1 bg-background justify-center px-8">
      <View className="items-center mb-8">
        <Text className="text-4xl font-bold text-brand">Rose</Text>
        <Text className="text-muted-foreground text-base mt-2">Sign in with your Bluesky account</Text>
      </View>

      {/* Error message */}
      {error ? (
        <View className="mb-4 rounded-xl bg-destructive/10 p-4">
          <Text className="text-sm font-semibold text-destructive">Sign in failed</Text>
          <Text className="text-sm text-destructive mt-1">{error}</Text>
          {isErrorVerification && (
            <Text className="text-xs text-muted-foreground mt-2">
              Bluesky requires email verification. Please verify your email at bsky.app first.
            </Text>
          )}
        </View>
      ) : null}

      {/* Handle/Email */}
      <Text className="text-sm font-medium text-foreground mb-1.5">Handle or Email</Text>
      <TextInput
        className="bg-surface-elevated rounded-xl px-4 py-3.5 text-foreground text-[15px] mb-3"
        placeholder="your-handle.bsky.social"
        placeholderTextColor="#8e8e8e"
        value={identifier}
        onChangeText={(t) => { setIdentifier(t); setError(''); }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      {/* App Password */}
      <Text className="text-sm font-medium text-foreground mb-1.5">App Password</Text>
      <TextInput
        className="bg-surface-elevated rounded-xl px-4 py-3.5 text-foreground text-[15px] mb-1"
        placeholder="xxxx-xxxx-xxxx-xxxx"
        placeholderTextColor="#8e8e8e"
        value={password}
        onChangeText={(t) => { setPassword(t); setError(''); }}
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity
        onPress={() => Linking.openURL('https://bsky.app/settings/app-passwords')}
        className="mb-4"
      >
        <Text className="text-xs text-blue">
          Don't have one? Create one in Bluesky Settings
        </Text>
      </TouchableOpacity>

      {/* Sign In button — matching web's rounded-full style */}
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        className="bg-brand rounded-full py-3.5 items-center active:opacity-80"
      >
        {loading ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-white font-semibold text-base">Signing in...</Text>
          </View>
        ) : (
          <Text className="text-white font-semibold text-base">Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Signup link */}
      <View className="flex-row items-center justify-center mt-8">
        <Text className="text-sm text-muted-foreground">Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text className="text-sm text-blue font-medium">Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
