import { NextRequest, NextResponse } from 'next/server';
import { publicGetFeedGenerators, publicGetPopularFeedGenerators } from '@/services/public-api';
import { CURATED_FEEDS } from '@/services/feeds';

async function imageToDataUri(url: string): Promise<string> {
  if (!url) return url;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'curated';
    const cursor = searchParams.get('cursor') || undefined;
    const limit = parseInt(searchParams.get('limit') || '25');

    if (mode === 'popular') {
      const data = await publicGetPopularFeedGenerators(cursor, limit);
      return NextResponse.json({
        feeds: data.feeds || [],
        cursor: data.cursor,
      });
    }

    // Default: curated feeds with live metadata
    const curatedUris = CURATED_FEEDS.map((f) => f.uri);
    const liveData = await publicGetFeedGenerators(curatedUris);
    const liveFeeds = liveData.feeds || [];

    const merged = CURATED_FEEDS.map((curated) => {
      const live = liveFeeds.find((f: any) => f.uri === curated.uri);
      return {
        uri: curated.uri,
        label: live?.displayName || curated.label,
        description: live?.description || curated.description,
        avatar: live?.avatar || curated.avatar,
        category: curated.category,
        likeCount: (live as any)?.likeCount ?? 0,
      };
    });

    // Inline avatars as data URIs so WebGL can use them without CORS proxy
    await Promise.all(
      merged.map(async (feed) => {
        if (feed.avatar) {
          feed.avatar = await imageToDataUri(feed.avatar);
        }
      })
    );

    return NextResponse.json({ feeds: merged, total: CURATED_FEEDS.length });
  } catch (error) {
    console.error('Public discover API error:', error);
    return NextResponse.json({ feeds: [], cursor: undefined });
  }
}
