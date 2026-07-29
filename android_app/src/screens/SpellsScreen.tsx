import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, Eye, EyeOff, Lock, Droplets, MessageSquareOff, BarChart3, Compass, UserX, RefreshCcw } from 'lucide-react-native';
import { useSpellStore } from '@/store/spell-store';
import { useAuthStore } from '@/store/auth-store';
import type { SpellEffectType } from '@/types/spells';

function effectLabel(type: string): string {
  const labels: Record<string, string> = {
    hide_avatar: 'Hide Avatar',
    hide_display_name: 'Hide Name',
    hide_handle: 'Hide Handle',
    hide_header: 'Hide Header',
    hide_repost_reason: 'Hide Reposts',
    hide_engagement_metrics: 'Hide Metrics',
    hide_compose: 'Hide Compose',
    hide_search_nav: 'Hide Search',
    hide_feeds_nav: 'Hide Feeds',
    hide_profile_nav: 'Hide Profile',
    disable_like: 'Disable Like',
    disable_reply: 'Disable Reply',
    disable_repost: 'Disable Repost',
    show_reminder: 'Reminder',
    lockout: 'Lockout',
    hide_all_interactions: 'Hide All Actions',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

function EffectIcon({ type }: { type: string }) {
  const size = 14;
  const color = '#8e8e8e';
  switch (type) {
    case 'hide_avatar': return <Eye size={size} color={color} />;
    case 'hide_display_name': return <EyeOff size={size} color={color} />;
    case 'hide_handle': return <UserX size={size} color={color} />;
    case 'hide_header': return <EyeOff size={size} color={color} />;
    case 'hide_repost_reason': return <RefreshCcw size={size} color={color} />;
    case 'hide_engagement_metrics': return <BarChart3 size={size} color={color} />;
    case 'hide_compose': return <Compass size={size} color={color} />;
    case 'disable_like': return <Lock size={size} color={color} />;
    case 'disable_reply': return <MessageSquareOff size={size} color={color} />;
    case 'disable_repost': return <RefreshCcw size={size} color={color} />;
    case 'show_reminder': return <Droplets size={size} color={color} />;
    case 'hide_all_interactions': return <EyeOff size={size} color={color} />;
    default: return <Zap size={size} color={color} />;
  }
}

function SpellMainIcon({ effects }: { effects: { type: SpellEffectType }[] }) {
  const type = effects[0]?.type || 'lockout';
  return <EffectIcon type={type} />;
}

export default function SpellsScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { learnedIds, castIds, learnSpell, toggleCast, unlearnSpell, castCount, getAllSpells } = useSpellStore();

  const allSpells = getAllSpells();
  const learnedSpells = allSpells.filter((s) => learnedIds.includes(s.id));
  const discoverableSpells = allSpells.filter((s) => !learnedIds.includes(s.id));

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={22} color="#262626" /></TouchableOpacity>
          <Text className="text-lg font-bold text-foreground ml-3">Spell Book</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Zap size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4 text-center">Sign in to cast spells</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Spell Book</Text>
        </View>
        <View className="px-3 py-1.5 rounded-full bg-muted">
          <Text className="text-xs text-muted-foreground font-medium">{castCount()}/2 cast</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Learned Spells */}
        {learnedSpells.length > 0 && (
          <View className="pt-5">
            <Text className="text-base font-bold text-foreground mb-1">Your Spells</Text>
            <Text className="text-sm text-muted-foreground mb-4">Cast a spell to make it active.</Text>
            <View className="space-y-3">
              {learnedSpells.map((spell) => {
                const isCast = castIds.includes(spell.id);
                return (
                  <View
                    key={spell.id}
                    className={`rounded-2xl p-4 ${isCast ? 'bg-brand/10' : 'bg-muted/50'}`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center gap-2.5">
                          <SpellMainIcon effects={spell.effects} />
                          <Text className="text-sm font-semibold text-foreground">{spell.name}</Text>
                          {isCast && (
                            <View className="px-2 py-0.5 rounded-full bg-brand/20">
                              <Text className="text-[10px] font-semibold text-brand uppercase tracking-wider">Active</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{spell.description}</Text>
                      </View>
                      <Switch
                        value={isCast}
                        onValueChange={() => toggleCast(spell.id)}
                        disabled={!isCast && castCount() >= 2}
                        trackColor={{ false: '#e3e3e3', true: '#f06' }}
                        thumbColor="white"
                      />
                    </View>

                    <View className="flex-row flex-wrap gap-1.5 mt-3">
                      {spell.effects.map((effect) => (
                        <View key={effect.type} className="px-2.5 py-1 rounded-full bg-muted flex-row items-center gap-1">
                          <EffectIcon type={effect.type} />
                          <Text className="text-[10px] font-medium text-muted-foreground">{effectLabel(effect.type)}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      onPress={() => unlearnSpell(spell.id)}
                      className="mt-2.5"
                    >
                      <Text className="text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 underline">
                        Remove from spell book
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {learnedSpells.length === 0 && (
          <View className="pt-10 items-center">
            <Zap size={32} color="#f06" style={{ opacity: 0.4 }} />
            <Text className="text-base font-bold text-foreground mt-4 mb-1.5">No spells yet</Text>
            <Text className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              Browse the spells below to learn and customize your Rose experience.
            </Text>
          </View>
        )}

        {/* Discover Spells */}
        <View className="pt-10 pb-10">
          <Text className="text-base font-bold text-foreground mb-1">Discover Spells</Text>
          <Text className="text-sm text-muted-foreground mb-5">Learn a spell to add it to your book.</Text>

          {discoverableSpells.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-sm text-muted-foreground text-center">
                You've learned all available spells! Check back later for more.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {discoverableSpells.map((spell) => (
                <View key={spell.id} className="rounded-2xl bg-muted/30 p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center gap-2.5">
                        <SpellMainIcon effects={spell.effects} />
                        <Text className="text-sm font-semibold text-foreground">{spell.name}</Text>
                      </View>
                      <Text className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{spell.description}</Text>

                      <View className="flex-row flex-wrap gap-1.5 mt-3">
                        {spell.effects.map((effect) => (
                          <View key={effect.type} className="px-2.5 py-1 rounded-full bg-muted flex-row items-center gap-1">
                            <EffectIcon type={effect.type} />
                            <Text className="text-[10px] font-medium text-muted-foreground">{effectLabel(effect.type)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => learnSpell(spell.id)}
                      className="px-4 py-2 rounded-2xl bg-brand"
                    >
                      <Text className="text-white text-xs font-semibold">Learn</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
