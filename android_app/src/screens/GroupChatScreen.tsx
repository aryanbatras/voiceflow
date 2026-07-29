import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Send, Users, Link, Settings, Plus, Copy, Check, X, BellOff, Pencil,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth-store';
import { useGroupNameStore } from '@/store/group-name-store';
import { Avatar } from '@/components/ui/Avatar';
import { relativeTime } from '@/utils/time';
import * as groupsService from '@/services/groups';

export default function GroupChatScreen({ navigation, route }: any) {
  const convoId = route?.params?.convoId || '';
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { getName, setName } = useGroupNameStore();

  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Panels
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [addMemberInput, setAddMemberInput] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  // Settings state
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const storedName = getName(convoId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Initial fetch
  useEffect(() => {
    if (!isAuthenticated || !convoId) return;
    (async () => {
      try {
        const [g, m, msgs] = await Promise.all([
          groupsService.getGroup(convoId),
          groupsService.getGroupMembers(convoId),
          groupsService.getGroupMessages(convoId),
        ]);
        if (g) setGroup(g);
        setMembers(m);
        setMessages(msgs.messages || []);
      } catch {}
      setLoading(false);
    })();
  }, [isAuthenticated, convoId]);

  // Message polling every 8s
  useEffect(() => {
    if (!isAuthenticated || !convoId) return;
    pollRef.current = setInterval(async () => {
      try {
        const msgs = await groupsService.getGroupMessages(convoId);
        if (msgs.messages && msgs.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m: any) => m.id));
            const newMsgs = msgs.messages.filter((m: any) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
        }
      } catch {}
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated, convoId]);

  // Enter key to send
  const handleSend = useCallback(async () => {
    const text = messageText.trim();
    if (!text || sending || !convoId) return;
    setSending(true);
    try {
      const result = await groupsService.sendMessage(convoId, text);
      if (result.message) {
        setMessages((prev) => [...prev, result.message]);
        setMessageText('');
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch {}
    setSending(false);
  }, [messageText, sending, convoId]);

  // Enter key to send — defined AFTER handleSend to capture latest handleSend
  const handleKeyPress = useCallback((e: any) => {
    if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCreateInvite = useCallback(async () => {
    if (!convoId || inviteLoading) return;
    setInviteLoading(true);
    const result = await groupsService.createJoinLink(convoId);
    if (result.code) {
      setInviteCode(result.code);
    } else {
      Alert.alert('Error', result.error || 'Failed to create invite link');
    }
    setInviteLoading(false);
  }, [convoId, inviteLoading]);

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return;
    setCopied(true);
    Platform.OS === 'web'
      ? navigator.clipboard.writeText(inviteCode)
      : Alert.alert('Invite Code', inviteCode);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteCode]);

  const handleAddMember = useCallback(async () => {
    const input = addMemberInput.trim();
    if (!input || !convoId || memberActionLoading) return;
    setMemberActionLoading(true);
    const handles = input.split(/[\s,]+/).map((h) => h.trim().replace(/^@/, '')).filter(Boolean);
    if (handles.length === 0) { setMemberActionLoading(false); return; }
    const result = await groupsService.addGroupMembers(convoId, handles);
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setAddMemberInput('');
      const fresh = await groupsService.getGroupMembers(convoId);
      setMembers(fresh);
    }
    setMemberActionLoading(false);
  }, [addMemberInput, convoId, memberActionLoading]);

  const handleRemoveMember = useCallback(async (did: string, name: string) => {
    if (!convoId || memberActionLoading) return;
    Alert.alert('Remove Member', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setMemberActionLoading(true);
          const result = await groupsService.removeGroupMembers(convoId, [did]);
          if (result.error) {
            Alert.alert('Error', result.error);
          } else {
            const fresh = await groupsService.getGroupMembers(convoId);
            setMembers(fresh);
          }
          setMemberActionLoading(false);
        },
      },
    ]);
  }, [convoId, memberActionLoading]);

  const handleSaveName = useCallback(async () => {
    const name = editName.trim();
    if (!name || !convoId) return;
    try {
      await groupsService.editGroupName(convoId, name);
      setName(convoId, name);
      setEditingName(false);
      setGroup((prev: any) => prev ? { ...prev, name } : null);
    } catch {
      Alert.alert('Error', 'Failed to update name');
    }
  }, [editName, convoId, setName]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={22} color="#262626" /></TouchableOpacity>
          <Text className="text-lg font-bold text-foreground ml-3">Group</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Sign in to view this group</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#f06" />
      </SafeAreaView>
    );
  }

  const displayName = storedName || group?.name || 'Group';

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={22} color="#262626" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>{displayName}</Text>
          <Text className="text-xs text-muted-foreground">{group?.memberCount || members.length} members</Text>
        </View>
        <View className="flex-row gap-1">
          <TouchableOpacity onPress={() => setShowInvite(!showInvite)} className="p-2">
            <Link size={20} color={showInvite ? '#f06' : '#8e8e8e'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMembers(!showMembers)} className="p-2">
            <Users size={20} color={showMembers ? '#f06' : '#8e8e8e'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} className="p-2">
            <Settings size={20} color={showSettings ? '#f06' : '#8e8e8e'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings panel */}
      {showSettings && (
        <View className="border-b border-border bg-muted/50 px-4 py-4">
          <Text className="text-sm font-semibold text-foreground mb-3">Group Settings</Text>
          {/* Edit name */}
          <View className="mb-3">
            {editingName ? (
              <View className="flex-row items-center gap-2">
                <TextInput
                  className="flex-1 bg-surface-elevated rounded-lg px-3 py-2 text-sm text-foreground"
                  placeholder="New group name"
                  placeholderTextColor="#8e8e8e"
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={50}
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveName} className="p-2 rounded-lg bg-brand">
                  <Check size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)} className="p-2 rounded-lg bg-muted">
                  <X size={18} color="#8e8e8e" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { setEditName(displayName); setEditingName(true); }}
                className="flex-row items-center gap-2 py-2"
              >
                <Pencil size={16} color="#8e8e8e" />
                <Text className="text-sm text-foreground">Edit group name</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Mute toggle */}
          <TouchableOpacity
            onPress={() => {
              const newMuted = !group?.muted;
              setGroup((prev: any) => prev ? { ...prev, muted: newMuted } : null);
            }}
            className="flex-row items-center gap-2 py-2"
          >
            <BellOff size={16} color="#8e8e8e" />
            <Text className="text-sm text-foreground">{group?.muted ? 'Unmute group' : 'Mute group'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members panel */}
      {showMembers && (
        <View className="border-b border-border bg-muted/50 px-4 py-3 max-h-48">
          <View className="flex-row items-center gap-2 mb-2">
            <TextInput
              className="flex-1 bg-surface-elevated rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="Add member handles..."
              placeholderTextColor="#8e8e8e"
              value={addMemberInput}
              onChangeText={setAddMemberInput}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={handleAddMember}
              disabled={memberActionLoading || !addMemberInput.trim()}
              className="p-2 rounded-lg bg-brand"
            >
              {memberActionLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Plus size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={members}
            keyExtractor={(item) => item.did}
            renderItem={({ item }) => {
              const isSelf = item.did === session?.did;
              return (
                <View className="flex-row items-center gap-2 py-2">
                  <Avatar uri={item.avatar} name={item.displayName || item.handle} size="sm" />
                  <Text className="text-sm text-foreground flex-1" numberOfLines={1}>
                    {item.displayName || item.handle}
                  </Text>
                  {isSelf ? (
                    <Text className="text-xs text-muted-foreground px-2">You</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(item.did, item.displayName || item.handle)}
                      disabled={memberActionLoading}
                      className="p-1.5 rounded-lg text-muted-foreground"
                    >
                      <X size={14} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Invite panel */}
      {showInvite && (
        <View className="border-b border-border bg-muted/50 px-4 py-3">
          <Text className="text-sm font-semibold text-foreground mb-2">Invite Link</Text>
          {inviteCode ? (
            <View className="flex-row items-center gap-2">
              <View className="flex-1 bg-surface-elevated rounded-lg px-3 py-2">
                <Text className="text-sm font-mono text-foreground" selectable>{inviteCode}</Text>
              </View>
              <TouchableOpacity
                onPress={handleCopyCode}
                className="px-3 py-2 rounded-lg bg-brand flex-row items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check size={14} color="white" />
                    <Text className="text-white text-xs font-semibold">Copied</Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color="white" />
                    <Text className="text-white text-xs font-semibold">Copy</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleCreateInvite}
              disabled={inviteLoading}
              className="px-4 py-2 rounded-lg bg-brand self-start"
            >
              {inviteLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white text-xs font-semibold">Create Invite Link</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        className="flex-1 px-4"
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOwn = item.sender?.did === session?.did;
          return (
            <View className={`py-1.5 flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <View
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isOwn ? 'bg-brand rounded-br-md' : 'bg-surface-elevated rounded-bl-md'
                }`}
              >
                {!isOwn && (
                  <Text className="text-xs font-medium text-brand mb-0.5">
                    {item.sender?.displayName || item.sender?.handle || 'Unknown'}
                  </Text>
                )}
                <Text className={`text-sm leading-relaxed ${isOwn ? 'text-white' : 'text-foreground'}`}>
                  {item.text}
                </Text>
                <Text className={`text-[10px] mt-0.5 ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {relativeTime(item.sentAt)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="py-16 items-center">
            <Text className="text-muted-foreground">No messages yet</Text>
            <Text className="text-sm text-muted-foreground mt-1">Send a message to start the conversation</Text>
          </View>
        }
      />

      {/* Input */}
      <View className="flex-row items-center gap-2 px-4 py-3 border-t border-border bg-background">
        <TextInput
          className="flex-1 bg-surface-elevated rounded-xl px-4 py-2.5 text-sm text-foreground max-h-20"
          placeholder="Type a message..."
          placeholderTextColor="#8e8e8e"
          value={messageText}
          onChangeText={setMessageText}
          onKeyPress={handleKeyPress}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !messageText.trim()}
          className="h-10 w-10 rounded-xl bg-brand items-center justify-center"
        >
          {sending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Send size={18} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
