import { getAgent } from './agent';
import type { ActorView, FeedItem } from '@/types/atproto';

export async function searchActors(term: string, limit = 25): Promise<ActorView[]> {
  const agent = getAgent();
  const res = await agent.searchActors({ term, limit });
  return res.data.actors || [];
}

export async function searchPosts(q: string, cursor?: string, limit = 30): Promise<{ items: FeedItem[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.app.bsky.feed.searchPosts({ q, cursor, limit });
  return {
    items: (res.data.posts || []).map((p: any) => ({
      uri: p.uri,
      cid: p.cid,
      author: p.author,
      record: p.record,
      indexedAt: p.indexedAt,
      likeCount: p.likeCount || 0,
      replyCount: p.replyCount || 0,
      repostCount: p.repostCount || 0,
      viewer: p.viewer,
    })),
    cursor: res.data.cursor,
  };
}

export async function getFeedGenerators(query?: string, limit = 25): Promise<any[]> {
  const agent = getAgent();
  if (query) {
    const res = await (agent.app.bsky.feed as any).searchFeeds({ query, limit });
    return res.data.feeds || [];
  }
  const res = await agent.app.bsky.unspecced.getPopularFeedGenerators({ limit });
  return res.data.feeds || [];
}
