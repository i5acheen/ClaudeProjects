/**
 * Platform-agnostic data model. Every client (Reddit, YouTube, and later
 * Instagram/X or a licensed data provider) maps its native API response
 * into these shapes, so tools never depend on a platform SDK directly.
 */

export type Platform = "reddit" | "youtube" | "instagram" | "x";

export type Timeframe = "hour" | "day" | "week" | "month" | "year" | "all";

export interface SocialPost {
  id: string;
  platform: Platform;
  /** Author display name/handle, without any leading "u/" or "@". */
  author: string;
  title?: string;
  text: string;
  url: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Upvotes, likes, or the platform's closest equivalent. */
  score?: number;
  commentCount?: number;
  /** Reddit-specific: the subreddit the post appeared in, without "r/". */
  subreddit?: string;
}

export interface MentionSearchParams {
  query: string;
  /** Restrict the search to a single subreddit/channel/community, without any leading marker. */
  community?: string;
  timeframe: Timeframe;
  limit: number;
}

/**
 * Shared contract every platform client implements. Tools call this
 * interface, never a platform SDK directly, so a new source (Instagram,
 * X, a licensed provider) can be dropped in as a new client without
 * touching tool code.
 */
export interface MentionSource {
  readonly platform: Platform;
  searchMentions(params: MentionSearchParams): Promise<SocialPost[]>;
}

export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly kind: "rate_limit" | "auth" | "not_found" | "upstream" | "network" | "unknown" = "unknown"
  ) {
    super(message);
    this.name = "DataSourceError";
  }
}
