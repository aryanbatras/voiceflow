import { getAgent } from './agent';
import type { ActorView } from '@/types/atproto';

export async function getProfile(handle: string): Promise<any> {
  const agent = getAgent();
  const res = await agent.getProfile({ actor: handle });
  return res.data;
}

export async function getFollowers(actor: string, cursor?: string): Promise<{ items: ActorView[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.getFollowers({ actor, cursor, limit: 50 });
  return { items: res.data.followers as ActorView[], cursor: res.data.cursor };
}

export async function getFollows(actor: string, cursor?: string): Promise<{ items: ActorView[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.getFollows({ actor, cursor, limit: 50 });
  return { items: res.data.follows as ActorView[], cursor: res.data.cursor };
}

export async function follow(did: string): Promise<string> {
  const agent = getAgent();
  const res = await agent.follow(did);
  return res.uri;
}

export async function unfollow(followUri: string): Promise<void> {
  const agent = getAgent();
  await agent.deleteFollow(followUri);
}

export async function getSuggestions(limit = 25): Promise<ActorView[]> {
  const agent = getAgent();
  const res = await agent.getSuggestions({ limit });
  return res.data.actors as ActorView[];
}
