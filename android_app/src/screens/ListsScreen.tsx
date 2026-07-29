import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Users, X } from 'lucide-react-native';
import { getAgent } from '@/services/agent';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';

interface ListView {
  uri: string;
  name: string;
  description?: string;
  avatar?: string;
  itemCount?: number;
  creator?: { did: string; handle: string; displayName?: string; avatar?: string };
}

export default function ListsScreen({ navigation }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [lists, setLists] = useState<ListView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLists = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const agent = getAgent();
      const res = await agent.api.app.bsky.graph.getLists({
        actor: agent.session?.did || '',
        limit: 50,
      });
      setLists((res.data.lists || []).map((l: any) => ({
        uri: l.uri,
        name: l.name,
        description: l.description,
        avatar: l.avatar,
        itemCount: l.itemCount || 0,
      })));
    } catch {}
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const handleCreate = useCallback(async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const agent = getAgent();
      const res = await agent.api.app.bsky.graph.list.create(
        { repo: agent.session?.did || '' },
        {
          name: newListName.trim(),
          description: newListDesc.trim(),
          purpose: 'app.bsky.graph.defs#curatelist',
          createdAt: new Date().toISOString(),
        }
      );
      if (res.uri) {
        setShowCreate(false);
        setNewListName('');
        setNewListDesc('');
        fetchLists();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create list');
    }
    setCreating(false);
  }, [newListName, newListDesc, fetchLists]);

  const handleDelete = useCallback(async (listUri: string, name: string) => {
    Alert.alert('Delete List', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const agent = getAgent();
            const rkey = listUri.split('/').pop()!;
            await agent.api.app.bsky.graph.list.delete({
              repo: agent.session?.did || '',
              rkey,
            });
            fetchLists();
          } catch {}
        },
      },
    ]);
  }, [fetchLists]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={22} color="#262626" /></TouchableOpacity>
          <Text className="text-lg font-bold text-foreground ml-3">Lists</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Users size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4">Sign in to manage your lists</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={22} color="#262626" /></TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Lists</Text>
        </View>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} className="p-2 rounded-full bg-brand/10">
          <Plus size={20} color="#f06" />
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View className="px-4 py-4 border-b border-border bg-muted">
          <Text className="text-sm font-semibold text-foreground mb-3">New List</Text>
          <TextInput
            className="bg-surface-elevated rounded-xl px-4 py-2.5 text-foreground text-sm mb-2"
            placeholder="List name"
            placeholderTextColor="#8e8e8e"
            value={newListName}
            onChangeText={setNewListName}
          />
          <TextInput
            className="bg-surface-elevated rounded-xl px-4 py-2.5 text-foreground text-sm mb-3"
            placeholder="Description (optional)"
            placeholderTextColor="#8e8e8e"
            value={newListDesc}
            onChangeText={setNewListDesc}
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl bg-muted items-center"
            >
              <Text className="text-foreground font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!newListName.trim() || creating}
              className="flex-1 py-2.5 rounded-xl bg-brand items-center"
            >
              {creating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-semibold text-sm">Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#f06" /></View>
      ) : lists.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Users size={48} color="#8e8e8e" />
          <Text className="text-muted-foreground text-lg mt-4">No lists yet</Text>
          <Text className="text-muted-foreground text-sm mt-1 text-center">Create a list to organize people you follow</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.uri}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 px-4 py-4 border-b border-border">
              <Avatar uri={item.avatar} name={item.name} size="md" />
              <View className="flex-1">
                <Text className="text-foreground font-semibold text-sm">{item.name}</Text>
                {item.description ? (
                  <Text className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>{item.description}</Text>
                ) : null}
                <Text className="text-muted-foreground text-[10px] mt-0.5">{item.itemCount || 0} members</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.uri, item.name)}>
                <Text className="text-destructive text-xs">Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
