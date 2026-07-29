import { getAgent } from './agent';
import type { GroupInfo } from '@/types/chat';

const CHAT_BASE = 'https://api.bsky.chat/xrpc';

function chatHeaders() {
  const agent = getAgent();
  if (!agent.session?.accessJwt) throw new Error('No session');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${agent.session.accessJwt}`,
  };
}

async function chatGet(endpoint: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${CHAT_BASE}/${endpoint}${qs}`, { headers: chatHeaders() });
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(text).message || msg; } catch {}
    throw new Error(msg);
  }
  return JSON.parse(text);
}

async function chatPost(endpoint: string, body?: Record<string, any>) {
  const res = await fetch(`${CHAT_BASE}/${endpoint}`, {
    method: 'POST',
    headers: chatHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = JSON.parse(text).message || msg; } catch {}
    throw new Error(msg);
  }
  return JSON.parse(text);
}

function normalizeGroupInfo(convo: any): GroupInfo {
  const memberNames = convo.members?.slice(0, 3).map((m: any) => m.displayName || m.handle) || [];
  return {
    convoId: convo.id,
    name: convo.name || memberNames.join(', ') || 'Group',
    memberCount: convo.members?.length || 0,
    members: convo.members || [],
    lastMessage: convo.lastMessage || null,
    unreadCount: convo.unreadCount || 0,
    muted: convo.muted || false,
    createdAt: convo.rev || new Date().toISOString(),
  };
}

export async function listGroups(cursor?: string, limit = 30): Promise<{ groups: GroupInfo[]; cursor?: string }> {
  try {
    const params: Record<string, string> = { limit: String(limit), kind: 'group', status: 'accepted' };
    if (cursor) params.cursor = cursor;
    const data = await chatGet('chat.bsky.convo.listConvos', params);
    return {
      groups: (data.convos || []).map((c: any) => normalizeGroupInfo(c)),
      cursor: data.cursor,
    };
  } catch {
    return { groups: [] };
  }
}

export async function getGroup(convoId: string): Promise<GroupInfo | null> {
  try {
    const data = await chatGet('chat.bsky.convo.getConvo', { convoId });
    return data.convo ? normalizeGroupInfo(data.convo) : null;
  } catch {
    return null;
  }
}

export async function getGroupMembers(convoId: string): Promise<any[]> {
  try {
    const data = await chatGet('chat.bsky.convo.getConvoMembers', { convoId });
    return data.members || [];
  } catch {
    return [];
  }
}

export async function getGroupMessages(convoId: string, cursor?: string, limit = 50): Promise<{ messages: any[]; cursor?: string }> {
  try {
    const params: Record<string, string> = { convoId, limit: String(limit) };
    if (cursor) params.cursor = cursor;
    const data = await chatGet('chat.bsky.convo.getMessages', params);
    return { messages: data.messages || [], cursor: data.cursor };
  } catch {
    return { messages: [] };
  }
}

export async function createGroup(name: string, memberIdentifiers: string[]): Promise<{ convoId?: string; error?: string }> {
  try {
    const agent = getAgent();
    const dids: string[] = [];
    for (const id of memberIdentifiers) {
      const clean = id.replace(/^@/, '');
      if (clean.startsWith('did:')) {
        dids.push(clean);
      } else {
        try {
          const resolved = await agent.api.com.atproto.identity.resolveHandle({ handle: clean });
          dids.push(resolved.data.did);
        } catch {
          return { error: `Could not resolve ${id}` };
        }
      }
    }
    if (dids.length === 0) return { error: 'Could not find any members' };

    const data = await chatPost('chat.bsky.group.createGroup', { members: dids, name });
    return { convoId: data.convo?.id };
  } catch (error: any) {
    const msg = error?.message || 'Failed to create group';
    if (msg.includes('AccountSuspended')) return { error: 'Your account is suspended.' };
    if (msg.includes('NewAccountCannotCreateGroup')) return { error: 'Your account is too new to create groups.' };
    return { error: msg };
  }
}

export async function sendMessage(convoId: string, text: string): Promise<{ message?: any; error?: string }> {
  try {
    const data = await chatPost('chat.bsky.convo.sendMessage', { convoId, message: { text } });
    return { message: data.message };
  } catch (error: any) {
    return { error: error?.message || 'Failed to send message' };
  }
}

export async function addGroupMembers(convoId: string, memberIdentifiers: string[]): Promise<{ error?: string }> {
  try {
    const agent = getAgent();
    const dids: string[] = [];
    for (const id of memberIdentifiers) {
      const clean = id.replace(/^@/, '');
      if (clean.startsWith('did:')) {
        dids.push(clean);
      } else {
        const resolved = await agent.api.com.atproto.identity.resolveHandle({ handle: clean });
        dids.push(resolved.data.did);
      }
    }
    if (dids.length === 0) return { error: 'Could not resolve any members' };
    await chatPost('chat.bsky.group.addMembers', { convoId, members: dids });
    return {};
  } catch (error: any) {
    return { error: error?.message || 'Failed to add members' };
  }
}

export async function removeGroupMembers(convoId: string, memberDids: string[]): Promise<{ error?: string }> {
  try {
    await chatPost('chat.bsky.group.removeMembers', { convoId, members: memberDids });
    return {};
  } catch (error: any) {
    return { error: error?.message || 'Failed to remove members' };
  }
}

export async function muteGroup(convoId: string): Promise<boolean> {
  try {
    await chatPost('chat.bsky.convo.muteConvo', { convoId });
    return true;
  } catch {
    return false;
  }
}

export async function unmuteGroup(convoId: string): Promise<boolean> {
  try {
    await chatPost('chat.bsky.convo.unmuteConvo', { convoId });
    return true;
  } catch {
    return false;
  }
}

export async function editGroupName(convoId: string, name: string): Promise<{ error?: string }> {
  try {
    await chatPost('chat.bsky.group.editGroup', { convoId, name });
    return {};
  } catch (error: any) {
    return { error: error?.message || 'Failed to update group name' };
  }
}

export async function joinGroupByInvite(code: string): Promise<{ convoId?: string; error?: string }> {
  try {
    const data = await chatPost('chat.bsky.convo.getConvoForMembers', { inviteCode: code });
    if (data.convo?.id) return { convoId: data.convo.id };
    return { error: 'Invalid or expired invite code' };
  } catch (error: any) {
    return { error: error?.message || 'Failed to join group' };
  }
}

export async function createJoinLink(convoId: string): Promise<{ code?: string; error?: string }> {
  try {
    const data = await chatPost('chat.bsky.group.createJoinLink', { convoId, joinRule: 'anyone', requireApproval: true });
    return { code: data.joinLink?.code };
  } catch (error: any) {
    return { error: error?.message || 'Failed to create invite link' };
  }
}
