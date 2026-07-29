import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, UserPlus, Plus } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useGroupNameStore } from '@/store/group-name-store';
import { Avatar } from '@/components/ui/Avatar';
import * as groupsService from '@/services/groups';

export default function GroupsScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { getName, setName } = useGroupNameStore();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberHandles, setMemberHandles] = useState('');
  const [creating, setCreating] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Apply stored names on top of API data
  const applyStoredNames = useCallback((raw: any[]): any[] => {
    const names = useGroupNameStore.getState().names;
    return raw.map((g: any) => ({ ...g, name: names[g.convoId] || g.name }));
  }, []);

  const fetchGroups = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await groupsService.listGroups();
      if (data.groups) {
        setGroups(applyStoredNames(data.groups));
      }
    } catch {}
    setLoading(false);
  }, [isAuthenticated, applyStoredNames]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) fetchGroups();
    else setLoading(false);
  }, [isAuthenticated, fetchGroups]);

  // Background polling every 30s
  useEffect(() => {
    if (!isAuthenticated) return;
    pollRef.current = setInterval(() => {
      groupsService.listGroups().then((data) => {
        if (data.groups) setGroups(applyStoredNames(data.groups));
      }).catch(() => {});
    }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated, applyStoredNames]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim() || !memberHandles.trim()) return;
    setCreating(true);
    try {
      const handles = memberHandles
        .split(/[\s,]+/)
        .map((h: string) => h.trim().replace(/^@/, ''))
        .filter(Boolean);

      if (handles.length === 0) {
        Alert.alert('Error', 'Enter at least one member handle');
        setCreating(false);
        return;
      }

      const result = await groupsService.createGroup(groupName.trim(), handles);

      if (result.convoId) {
        setName(result.convoId, groupName.trim());
        setShowCreate(false);
        setGroupName('');
        setMemberHandles('');
        fetchGroups();
        navigation.navigate('GroupChat', { convoId: result.convoId });
      } else {
        Alert.alert('Error', result.error || 'Failed to create group');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Connection error');
    }
    setCreating(false);
  }, [groupName, memberHandles, setName, fetchGroups, navigation]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Groups</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Users size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4 text-center">Sign in to view your groups</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#262626" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Groups</Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowJoin(!showJoin)}
            className="px-4 py-2 rounded-full border border-border"
          >
            <Text className="text-foreground font-semibold text-xs">Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-full bg-brand"
          >
            <Text className="text-white font-semibold text-xs">
              {showCreate ? 'Cancel' : 'New Group'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Join group via invite code */}
      {showJoin && (
        <View className="px-4 py-4 border-b border-border bg-muted/50">
          <Text className="text-sm font-semibold text-foreground mb-2">Join Group</Text>
          <Text className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Enter an invite code to join a group.
          </Text>
          <TextInput
            className="bg-surface-elevated rounded-xl px-4 py-2.5 text-foreground text-sm mb-3"
            placeholder="Invite code"
            placeholderTextColor="#8e8e8e"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => { setShowJoin(false); setInviteCode(''); }}
              className="flex-1 py-2.5 rounded-xl bg-muted items-center"
            >
              <Text className="text-foreground font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (!inviteCode.trim() || joining) return;
                setJoining(true);
                try {
                  const result = await groupsService.joinGroupByInvite(inviteCode.trim());
                  if (result.convoId) {
                    setShowJoin(false);
                    setInviteCode('');
                    fetchGroups();
                    navigation.navigate('GroupChat', { convoId: result.convoId });
                  } else {
                    Alert.alert('Error', result.error || 'Invalid invite code');
                  }
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Failed to join group');
                }
                setJoining(false);
              }}
              disabled={!inviteCode.trim() || joining}
              className="flex-1 py-2.5 rounded-xl bg-brand items-center"
            >
              {joining ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-semibold text-sm">Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Create group form */}
      {showCreate && (
        <View className="px-4 py-4 border-b border-border bg-muted/50">
          <Text className="text-sm font-semibold text-foreground mb-3">Create Group</Text>
          <TextInput
            className="bg-surface-elevated rounded-xl px-4 py-2.5 text-foreground text-sm mb-2"
            placeholder="Group name"
            placeholderTextColor="#8e8e8e"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
          />
          <TextInput
            className="bg-surface-elevated rounded-xl px-4 py-2.5 text-foreground text-sm mb-3"
            placeholder="Member handles (comma/space separated)"
            placeholderTextColor="#8e8e8e"
            value={memberHandles}
            onChangeText={setMemberHandles}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!groupName.trim() || !memberHandles.trim() || creating}
            className="py-2.5 rounded-xl bg-brand items-center"
          >
            {creating ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Groups list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f06" />
        </View>
      ) : groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Users size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4">No groups yet</Text>
          <Text className="text-muted-foreground text-sm mt-1 text-center">
            Create a group to start chatting with friends
          </Text>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            className="mt-6 px-6 py-3 rounded-xl bg-brand"
          >
            <Text className="text-white font-semibold">Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.convoId}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('GroupChat', { convoId: item.convoId })}
              className="flex-row items-center gap-3 px-4 py-4 border-b border-border"
            >
              {/* Group icon + unread badge */}
              <View className="h-12 w-12 rounded-xl bg-brand/15 items-center justify-center">
                <Users size={22} color="#f06" />
                {item.unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 h-4 min-w-[14px] rounded-full bg-destructive items-center justify-center px-1">
                    <Text className="text-[9px] font-bold text-white">
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View className="flex-1 min-w-0">
                <Text className="text-foreground font-semibold text-sm">{getName(item.convoId) || item.name}</Text>
                <Text className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>
                  {item.lastMessage && 'text' in item.lastMessage
                    ? (item.lastMessage as any).text
                    : 'No messages yet'}
                </Text>
                <Text className="text-muted-foreground text-[10px] mt-0.5">
                  {item.memberCount} members
                </Text>
              </View>

              {/* Member avatars with negative margins */}
              <View className="flex-row">
                {item.members?.slice(0, 3).map((member: any, idx: number) => (
                  <View
                    key={member.did}
                    className="h-7 w-7 rounded-full border-2 border-background overflow-hidden"
                    style={{ marginLeft: idx === 0 ? 0 : -8 }}
                  >
                    <Avatar uri={member.avatar} name={member.displayName || member.handle} size="sm" />
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
