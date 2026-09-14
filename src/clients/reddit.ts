import axios, { AxiosError, AxiosInstance } from "axios";
import { DataSourceError, MentionSearchParams, MentionSource, SocialPost } from "../types.js";

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API_BASE_URL = "https://oauth.reddit.com";

interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  userAgent: string;
}

interface RedditAccessToken {
  accessToken: string;
  /** Epoch ms after which the token should be treated as expired. */
  expiresAt: number;
}

interface RedditListingChild {
  data: {
    id: string;
    author: string;
    title: string;
    selftext: string;
    subreddit: string;
    permalink: string;
    created_utc: number;
    score: number;
    num_comments: number;
  };
}

interface RedditListingResponse {
  data: {
    children: RedditListingChild[];
  };
}

/**
 * Reddit client using the app-only ("client_credentials") OAuth grant.
 * This is sufficient for read-only access to public endpoints like
 * search, and avoids storing a user's Reddit login. Implements the
 * shared MentionSource interface so tools stay platform-agnostic.
 */
export class RedditClient implements MentionSource {
  readonly platform = "reddit" as const;

  private readonly http: AxiosInstance;
  private readonly credentials: RedditCredentials;
  private token: RedditAccessToken | undefined;

  constructor(credentials: RedditCredentials) {
    this.credentials = credentials;
    this.http = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        "User-Agent": credentials.userAgent,
      },
    });
  }

  async searchMentions(params: MentionSearchParams): Promise<SocialPost[]> {
    const token = await this.getAccessToken();

    const endpoint = params.community
      ? `/r/${encodeURIComponent(params.community)}/search`
      : "/search";

    try {
      const response = await this.http.get<RedditListingResponse>(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: params.query,
          sort: "new",
          t: params.timeframe,
          limit: params.limit,
          restrict_sr: params.community ? "true" : undefined,
          type: "link",
        },
      });

      return response.data.data.children.map((child) => this.toSocialPost(child.data));
    } catch (error) {
      throw this.toDataSourceError(error);
    }
  }

  private toSocialPost(post: RedditListingChild["data"]): SocialPost {
    return {
      id: post.id,
      platform: "reddit",
      author: post.author,
      title: post.title,
      text: post.selftext,
      url: `https://www.reddit.com${post.permalink}`,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      score: post.score,
      commentCount: post.num_comments,
      subreddit: post.subreddit,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.accessToken;
    }

    try {
      const response = await axios.post<{ access_token: string; expires_in: number }>(
        TOKEN_URL,
        new URLSearchParams({ grant_type: "client_credentials" }).toString(),
        {
          auth: {
            username: this.credentials.clientId,
            password: this.credentials.clientSecret,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": this.credentials.userAgent,
          },
          timeout: 15000,
        }
      );

      this.token = {
        accessToken: response.data.access_token,
        // Refresh a little early to avoid racing expiry mid-request.
        expiresAt: Date.now() + (response.data.expires_in - 60) * 1000,
      };
      return this.token.accessToken;
    } catch (error) {
      throw this.toDataSourceError(error, "auth");
    }
  }

  private toDataSourceError(
    error: unknown,
    forcedKind?: DataSourceError["kind"]
  ): DataSourceError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (forcedKind === "auth" || status === 401 || status === 403) {
        return new DataSourceError(
          "Reddit authentication failed. Check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in your .env file.",
          "auth"
        );
      }
      if (status === 429) {
        return new DataSourceError(
          "Reddit API rate limit exceeded. Wait a minute before retrying, or reduce request frequency.",
          "rate_limit"
        );
      }
      if (status === 404) {
        return new DataSourceError(
          "Subreddit not found. Check the subreddit name and try again.",
          "not_found"
        );
      }
      if (status && status >= 500) {
        return new DataSourceError(
          `Reddit is currently unavailable (status ${status}). Try again shortly.`,
          "upstream"
        );
      }
      if (axiosError.code === "ECONNABORTED") {
        return new DataSourceError("Reddit request timed out. Try again.", "network");
      }
      return new DataSourceError(
        `Reddit API request failed${status ? ` (status ${status})` : ""}: ${axiosError.message}`,
        "unknown"
      );
    }
    return new DataSourceError(
      `Unexpected error querying Reddit: ${error instanceof Error ? error.message : String(error)}`,
      "unknown"
    );
  }
}
