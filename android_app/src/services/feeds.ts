import { getAgent } from './agent';
import type { FeedItem } from '@/types/atproto';

export const CURATED_FEEDS = [
  { uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot', label: 'What\'s Hot', description: 'Trending posts from across the network' },
  { uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/cats', label: 'Cats', description: 'Cat photos and videos' },
  { uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/art', label: 'Art', description: 'Creative artwork and illustrations' },
  { uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/tech', label: 'Tech', description: 'Technology and software development' },
  { uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/nature', label: 'Nature', description: 'Nature photography and landscapes' },
  { uri: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/food', label: 'Food', description: 'Food photography and recipes' },
];

function normalizePost(post: any): FeedItem {
  const p = post.post || post;
  const record = p.record || {};

  return {
    uri: p.uri,
    cid: p.cid,
    author: {
      did: p.author?.did || '',
      handle: p.author?.handle || '',
      displayName: p.author?.displayName,
      avatar: p.author?.avatar,
    },
    record: {
      $type: record.$type || 'app.bsky.feed.post',
      text: record.text || '',
      createdAt: record.createdAt || p.indexedAt,
      facets: record.facets,
      embed: p.embed || record.embed,
    },
    indexedAt: p.indexedAt,
    likeCount: p.likeCount || 0,
    replyCount: p.replyCount || 0,
    repostCount: p.repostCount || 0,
    viewer: p.viewer,
    labels: p.labels,
  };
}

export async function getTimeline(cursor?: string, limit = 30): Promise<{ items: FeedItem[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.getTimeline({ cursor, limit });
  return {
    items: res.data.feed.map(normalizePost),
    cursor: res.data.cursor,
  };
}

export async function getCustomFeed(feedUri: string, cursor?: string, limit = 30): Promise<{ items: FeedItem[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.app.bsky.feed.getFeed({ feed: feedUri, cursor, limit });
  return {
    items: res.data.feed.map(normalizePost),
    cursor: res.data.cursor,
  };
}

export async function getAuthorFeed(actor: string, cursor?: string, limit = 30): Promise<{ items: FeedItem[]; cursor?: string }> {
  const agent = getAgent();
  const res = await agent.getAuthorFeed({ actor, cursor, limit });
  return {
    items: res.data.feed.map(normalizePost),
    cursor: res.data.cursor,
  };
}

export async function getPostThread(uri: string): Promise<any> {
  const agent = getAgent();
  const res = await agent.getPostThread({ uri, depth: 6 });
  return res.data.thread;
}

export async function likePost(uri: string, cid: string): Promise<string> {
  const agent = getAgent();
  const res = await agent.like(uri, cid);
  return res.uri;
}

export async function unlikePost(likeUri: string): Promise<void> {
  const agent = getAgent();
  await agent.deleteLike(likeUri);
}

export async function repostPost(uri: string, cid: string): Promise<string> {
  const agent = getAgent();
  const res = await agent.repost(uri, cid);
  return res.uri;
}

export async function unrepostPost(repostUri: string): Promise<void> {
  const agent = getAgent();
  await agent.deleteRepost(repostUri);
}

export async function getLikedPosts(actor: string, cursor?: string, limit = 30): Promise<{ items: FeedItem[]; cursor?: string }> {
  try {
    const agent = getAgent();
    const res = await agent.app.bsky.feed.getActorLikes({ actor, cursor, limit });
    return {
      items: (res.data.feed || []).map(normalizePost),
      cursor: res.data.cursor,
    };
  } catch {
    return { items: [], cursor: undefined };
  }
}
