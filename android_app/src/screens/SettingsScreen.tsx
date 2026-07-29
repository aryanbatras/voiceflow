import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Image, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, LogOut, Moon, Shield, Info, Camera, Eye, Bell, Palette, ChevronRight, X, Sun,
} from 'lucide-react-native';
import { logout, getAgent } from '@/services/agent';
import { useAuthStore } from '@/store/auth-store';
import { useFilterStore } from '@/store/filter-store';
import { useViewModeStore } from '@/store/view-mode-store';
import { useThemeStore, Theme } from '@/store/theme-store';
import { getProfile } from '@/services/graph';
import { Avatar } from '@/components/ui/Avatar';

type SettingsSection = 'filters' | 'muted' | 'display' | 'theme' | 'about';

export default function SettingsScreen({ navigation }: any) {
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { content, mute, display, setContent, addMutedWord, removeMutedWord, setDisplay: setDisplayPrefs } = useFilterStore();
  const { mode: viewMode, setMode: setViewMode } = useViewModeStore();
  const { theme: currentTheme, setTheme } = useThemeStore();

  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [newMutedWord, setNewMutedWord] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.handle) {
      getProfile(session.handle).then((p) => {
        setProfile(p);
        setDisplayName(p.displayName || '');
        setDescription(p.description || '');
      }).catch(() => {});
    }
  }, [session]);

  const handleSaveProfile = useCallback(async () => {
    if (!session) return;
    setIsSaving(true);
    try {
      const agent = getAgent();
      await agent.upsertProfile(async (existing: any) => ({
        ...existing,
        displayName: displayName.trim(),
        description: description.trim(),
      }));
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    }
    setIsSaving(false);
  }, [session, displayName, description]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const handleAddMutedWord = () => {
    const word = newMutedWord.trim();
    if (word) { addMutedWord(word); setNewMutedWord(''); }
  };

  const Toggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#e3e3e3', true: 'rgba(255, 0, 102, 0.4)' }}
      thumbColor={value ? '#f06' : '#f4f4f4'}
    />
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Settings</Text>
        </View>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground text-lg text-center mb-4">Sign in to access settings</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            className="px-6 py-3 rounded-xl bg-brand"
          >
            <Text className="text-white font-semibold">Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeSection) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => setActiveSection(null)} className="mr-3">
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground capitalize">
            {activeSection === 'filters' ? 'Content Filters' :
             activeSection === 'muted' ? 'Muted Words' :
             activeSection === 'display' ? 'Display' :
             activeSection === 'theme' ? 'Theme' :
             activeSection === 'about' ? 'About' : 'Settings'}
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 py-4">
          {activeSection === 'filters' && (
            <View className="space-y-4">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Content</Text>
              <View className="bg-surface-elevated rounded-xl overflow-hidden">
                {[
                  { key: 'hideReposts' as const, label: 'Hide reposts' },
                  { key: 'hideReplies' as const, label: 'Hide replies' },
                  { key: 'mediaOnly' as const, label: 'Media only' },
                  { key: 'videoOnly' as const, label: 'Video only' },
                ].map(({ key, label }) => (
                  <View key={key} className="flex-row items-center justify-between px-4 py-3.5 border-b border-border last:border-0">
                    <Text className="text-sm text-foreground">{label}</Text>
                    <Toggle value={content[key]} onValueChange={(v) => setContent({ [key]: v })} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {activeSection === 'muted' && (
            <View>
              <View className="flex-row gap-2 mb-4">
                <TextInput
                  className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground"
                  placeholder="Add a word or phrase to mute..."
                  placeholderTextColor="#8e8e8e"
                  value={newMutedWord}
                  onChangeText={setNewMutedWord}
                  onSubmitEditing={handleAddMutedWord}
                  returnKeyType="done" />
                <TouchableOpacity
                  onPress={handleAddMutedWord}
                  disabled={!newMutedWord.trim()}
                  className="px-4 py-2.5 rounded-lg bg-brand items-center justify-center">
                  <Text className="text-white font-semibold text-sm">Add</Text>
                </TouchableOpacity>
              </View>
              {mute.mutedWords.length === 0 ? (
                <Text className="text-sm text-muted-foreground text-center py-8">No muted words yet</Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {mute.mutedWords.map((word) => (
                    <View key={word} className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-muted">
                      <Text className="text-sm text-foreground">{word}</Text>
                      <TouchableOpacity onPress={() => removeMutedWord(word)}>
                        <X size={14} color="#8e8e8e" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeSection === 'display' && (
            <View className="space-y-6">
              <View>
                <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Feed</Text>
                <View className="bg-surface-elevated rounded-xl overflow-hidden">
                  <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-border">
                    <Text className="text-sm text-foreground">Hide engagement metrics</Text>
                    <Toggle value={display.hideEngagementMetrics} onValueChange={(v) => setDisplayPrefs({ hideEngagementMetrics: v })} />
                  </View>
                  <View className="flex-row items-center justify-between px-4 py-3.5">
                    <Text className="text-sm text-foreground">Compact feed</Text>
                    <Toggle value={display.feedDensity === 'compact'} onValueChange={(v) => setDisplayPrefs({ feedDensity: v ? 'compact' : 'comfortable' })} />
                  </View>
                </View>
              </View>
              <View>
                <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Default View</Text>
                <View className="flex-row gap-2">
                  {(['classic', 'grid'] as const).map((key) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setViewMode(key)}
                      className={`flex-1 py-3 rounded-lg items-center ${viewMode === key ? 'bg-brand' : 'bg-muted'}`}>
                      <Text className={`text-sm font-medium ${viewMode === key ? 'text-white' : 'text-foreground'}`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {activeSection === 'theme' && (
            <View>
              <Text className="text-sm text-muted-foreground mb-4">Choose your preferred theme</Text>
              <View className="space-y-2">
                {[
                  { key: 'light' as Theme, label: 'Light', desc: 'Warm off-white background', icon: Sun },
                  { key: 'dark' as Theme, label: 'Dark', desc: 'Easy on the eyes', icon: Moon },
                  { key: 'system' as Theme, label: 'System', desc: 'Match your device setting', icon: Palette },
                ].map(({ key, label, desc, icon: Icon }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setTheme(key)}
                    className="flex-row items-center justify-between px-4 py-4 rounded-xl border border-border"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <Icon size={20} color={currentTheme === key ? '#f06' : '#8e8e8e'} />
                      <View>
                        <Text className="text-sm font-medium text-foreground">{label}</Text>
                        <Text className="text-xs text-muted-foreground">{desc}</Text>
                      </View>
                    </View>
                    <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${currentTheme === key ? 'border-brand' : 'border-border'}`}>
                      {currentTheme === key && <View className="w-3 h-3 rounded-full bg-brand" />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {activeSection === 'about' && (
            <View className="items-center py-8">
              <Text className="text-2xl font-bold" style={{ color: '#f06' }}>Rose</Text>
              <Text className="text-sm text-muted-foreground mt-1">v1.0.0</Text>
              <Text className="text-sm text-muted-foreground text-center mt-3 max-w-xs">
                A social network for images and video, built on the AT Protocol.
              </Text>
              <View className="w-full border-t border-border mt-8 pt-6 space-y-3">
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-muted-foreground">Version</Text>
                  <Text className="text-sm text-foreground">1.0.0</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-muted-foreground">Platform</Text>
                  <Text className="text-sm text-foreground">Expo (React Native)</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-muted-foreground">Protocol</Text>
                  <Text className="text-sm text-foreground">AT Protocol</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-muted-foreground">Network</Text>
                  <Text className="text-sm text-foreground">Bluesky Social</Text>
                </View>
              </View>
              <View className="w-full border-t border-border mt-6 pt-4">
                <Text className="text-xs text-muted-foreground text-center">Powered by Bluesky · AT Protocol</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#262626" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* ── Profile Editing Section ── */}
        <View className="bg-surface-elevated rounded-xl overflow-hidden mb-6">
          {/* Banner */}
          <View className="h-28 bg-muted relative">
            {profile?.banner && (
              <Image source={{ uri: profile.banner }} className="w-full h-full" resizeMode="cover" />
            )}
          </View>

          {/* Avatar + Actions */}
          <View className="px-4 pb-4">
            <View className="-mt-10 mb-3 flex-row items-end justify-between">
              <Avatar uri={profile?.avatar} name={profile?.displayName || session?.handle} size="xl" className="border-4 border-surface-elevated" />
              <Text className="text-xs text-muted-foreground">@{session?.handle}</Text>
            </View>

            {/* Display Name */}
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Display Name</Text>
            <TextInput
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground mb-3"
              placeholder="Your display name"
              placeholderTextColor="#8e8e8e"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={64}
            />

            {/* Bio */}
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Bio</Text>
            <TextInput
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              placeholder="Tell people about yourself"
              placeholderTextColor="#8e8e8e"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={256}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
            <Text className="text-xs text-muted-foreground text-right mt-1">{description.length}/256</Text>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              className="w-full mt-4 py-3 rounded-xl bg-brand items-center"
            >
              <Text className="text-white font-semibold">{isSaving ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Preferences ── */}
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferences</Text>
        <View className="bg-surface-elevated rounded-xl overflow-hidden mb-6">
          {[
            { key: 'filters' as const, icon: Shield, label: 'Content Filters', desc: 'Hide reposts, media only, etc.' },
            { key: 'muted' as const, icon: Bell, label: 'Muted Words', desc: `${mute.mutedWords.length} words muted` },
            { key: 'display' as const, icon: Eye, label: 'Display', desc: 'Density, metrics, feed view' },
            { key: 'theme' as const, icon: Palette, label: 'Theme', desc: currentTheme === 'light' ? 'Light mode' : currentTheme === 'dark' ? 'Dark mode' : 'System default' },
          ].map(({ key, icon: Icon, label, desc }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveSection(key)}
              className="flex-row items-center gap-3 px-4 py-3.5 border-b border-border last:border-0"
            >
              <Icon size={20} color="#8e8e8e" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{label}</Text>
                <Text className="text-xs text-muted-foreground">{desc}</Text>
              </View>
              <ChevronRight size={16} color="#8e8e8e" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Account Info ── */}
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</Text>
        <View className="bg-surface-elevated rounded-xl p-4 mb-6">
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm text-foreground">Handle</Text>
            <Text className="text-sm text-muted-foreground">{session?.handle || ''}</Text>
          </View>
          <View className="flex-row justify-between py-1.5">
            <Text className="text-sm text-foreground">DID</Text>
            <Text className="text-xs text-muted-foreground font-mono">{session?.did?.slice(0, 24)}...</Text>
          </View>
        </View>

        {/* ── About ── */}
        <TouchableOpacity
          onPress={() => setActiveSection('about')}
          className="flex-row items-center gap-3 bg-surface-elevated rounded-xl p-4 mb-6"
        >
          <Info size={20} color="#8e8e8e" />
          <Text className="text-sm font-medium text-foreground flex-1">About Rose</Text>
          <ChevronRight size={16} color="#8e8e8e" />
        </TouchableOpacity>

        {/* ── Theme Quick Preview ── */}
        <View className="flex-row items-center gap-3 bg-surface-elevated rounded-xl p-4 mb-6">
          {currentTheme === 'light' ? <Sun size={20} color="#f06" /> : <Moon size={20} color="#f06" />}
          <Text className="text-sm text-foreground flex-1">Theme: {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</Text>
          <TouchableOpacity
            onPress={() => setTheme(currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light')}
            className="px-3 py-1.5 rounded-full bg-muted"
          >
            <Text className="text-xs text-foreground font-medium">Switch</Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-center gap-2 bg-surface-elevated rounded-xl p-4 mb-8"
        >
          <LogOut size={20} color="#e74c3c" />
          <Text className="text-destructive font-semibold">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
