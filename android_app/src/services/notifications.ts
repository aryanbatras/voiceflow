import { getAgent } from './agent';
import type { NotificationItem } from '@/types/atproto';

export async function getNotifications(cursor?: string, limit = 50): Promise<{ items: NotificationItem[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.listNotifications({ cursor, limit });
  return {
    items: (res.data.notifications as unknown) as NotificationItem[],
    cursor: res.data.cursor,
  };
}

export async function updateSeenNotifications(): Promise<void> {
  const agent = getAgent();
  await agent.updateSeenNotifications();
}

export async function getUnreadCount(): Promise<number> {
  const agent = getAgent();
  const res = await agent.countUnreadNotifications();
  return res.data.count || 0;
}
