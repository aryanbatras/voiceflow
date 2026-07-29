import { NextRequest, NextResponse } from 'next/server';
import { getAgentFromRequest } from '@/services/agent';
import {
  CURATED_FEEDS,
  FEED_CATEGORIES,
  getFeedGeneratorsInfo,
  getSuggestedFeeds,
  getPopularFeedGenerators,
} from '@/services/feeds';

async function imageToDataUri(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return url;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const mime = res.headers.get('Content-Type') || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return url;
  }
}

async function inlineAvatars(feeds: any[]): Promise<void> {
  await Promise.all(
    feeds.map(async (feed: any) => {
      if (feed.avatar) {
        feed.avatar = await imageToDataUri(feed.avatar);
      }
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentFromRequest(request);
    if (!agent) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'curated';
    const feedUrisParam = searchParams.get('uris');
    const query = searchParams.get('query');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100);

    // ─── Mode: Lookup specific feed URIs ──────────────────────────
    if (feedUrisParam) {
      const uris = feedUrisParam.split(',').map((u) => u.trim()).filter(Boolean);
      const feeds = await getFeedGeneratorsInfo(agent, uris);
      await inlineAvatars(feeds);
      return NextResponse.json({ feeds });
    }

    // ─── Mode: Suggested feeds ────────────────────────────────────
    if (mode === 'suggested') {
      const result = await getSuggestedFeeds(agent, limit, cursor || undefined);
      await inlineAvatars(result.feeds);
      return NextResponse.json({
        feeds: result.feeds,
        cursor: result.cursor,
      });
    }

    // ─── Mode: Popular / search feeds ─────────────────────────────
    if (mode === 'popular') {
      const result = await getPopularFeedGenerators(agent, {
        limit,
        cursor: cursor || undefined,
        query: query || undefined,
      });
      await inlineAvatars(result.feeds);
      return NextResponse.json({
        feeds: result.feeds,
        cursor: result.cursor,
      });
    }

    // ─── Mode: Categories with feed counts ───────────────────────
    if (mode === 'categories') {
      const counts: Record<string, number> = {};
      for (const cat of FEED_CATEGORIES) {
        counts[cat] = CURATED_FEEDS.filter((f) => f.category === cat).length;
      }
      return NextResponse.json({ categories: FEED_CATEGORIES, counts });
    }

    // ─── Mode: Curated feeds by category ──────────────────────────
    if (mode === 'curated') {
      const category = searchParams.get('category') || 'all';
      const filtered =
        category === 'all'
          ? CURATED_FEEDS
          : CURATED_FEEDS.filter((f) => f.category === category);

      const curatedUris = filtered.map((f) => f.uri);
      const liveFeeds = await getFeedGeneratorsInfo(agent, curatedUris);

      const merged = filtered.map((curated) => {
        const live = liveFeeds.find((f) => f.uri === curated.uri);
        return {
          uri: curated.uri,
          label: live?.label || curated.label,
          description: live?.description || curated.description,
          avatar: live?.avatar || curated.avatar,
          category: curated.category,
          likeCount: (live as any)?.likeCount ?? 0,
        };
      });

      await inlineAvatars(merged);

      return NextResponse.json({
        feeds: merged,
        category,
        total: CURATED_FEEDS.length,
      });
    }

    // ─── Fallback: curated all ────────────────────────────────────
    const curatedUris = CURATED_FEEDS.map((f) => f.uri);
    const liveFeeds = await getFeedGeneratorsInfo(agent, curatedUris);

    const merged = CURATED_FEEDS.map((curated) => {
      const live = liveFeeds.find((f) => f.uri === curated.uri);
      return {
        uri: curated.uri,
        label: live?.label || curated.label,
        description: live?.description || curated.description,
        avatar: live?.avatar || curated.avatar,
        category: curated.category,
      };
    });

    await inlineAvatars(merged);

    return NextResponse.json({ feeds: merged, total: CURATED_FEEDS.length });
  } catch (error) {
    console.error('Feed generators API error:', error);
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 });
  }
}
