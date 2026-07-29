// AT Protocol type definitions for Rose mobile
export type DID = string;
export type CID = string;
export type Handle = string;

export interface SessionData {
  did: DID;
  handle: Handle;
  accessJwt: string;
  refreshJwt: string;
  active?: boolean;
}

export interface PostRecord {
  $type: string;
  text: string;
  createdAt: string;
  facets?: Facet[];
  embed?: Embed;
  reply?: ReplyRef;
}

export interface Facet {
  index: { byteStart: number; byteEnd: number };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
}

export interface Embed {
  $type: string;
  images?: Array<{
    thumb: string;
    fullsize: string;
    alt: string;
    aspectRatio?: { width: number; height: number };
  }>;
  external?: {
    uri: string;
    title: string;
    description: string;
    thumb?: string;
  };
  record?: { uri: string; cid: string; author?: ActorView };
  playlist?: string;
  thumbnail?: string;
  video?: {
    cid: string;
    playlist?: string;
    thumbnail?: string;
    aspectRatio?: { width: number; height: number };
  };
}

export interface ReplyRef {
  root: { uri: string; cid: string };
  parent: { uri: string; cid: string };
}

export interface FeedItem {
  uri: string;
  cid: string;
  author: ActorView;
  record: PostRecord;
  embed?: Embed;
  indexedAt: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  viewer?: { like?: string; repost?: string };
  labels?: Label[];
  reason?: { $type: string; by: { handle: string; displayName?: string; avatar?: string } };
}

export interface ActorView {
  did: DID;
  handle: Handle;
  displayName?: string;
  avatar?: string;
  banner?: string;
  description?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  viewer?: { muted?: boolean; blockedBy?: boolean; following?: string; followedBy?: string };
  labels?: Label[];
  createdAt?: string;
}

export interface Label {
  src: DID;
  uri: string;
  val: string;
  cid?: string;
  cts: string;
}

export interface NotificationItem {
  uri: string;
  cid: string;
  author: ActorView;
  reason: 'like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote';
  reasonSubject?: string;
  record: PostRecord;
  isRead: boolean;
  indexedAt: string;
}

export interface FeedViewPost {
  post: FeedItem;
  reply?: { root: FeedItem; parent: FeedItem };
  reason?: { $type: string; by: ActorView };
}

export interface FeedSource {
  type: 'following' | 'discover' | 'trending' | 'custom' | 'list';
  uri?: string;
  label: string;
  icon?: string;
}
