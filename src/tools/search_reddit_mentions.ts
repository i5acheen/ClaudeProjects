import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DataSourceError, MentionSource, Timeframe } from "../types.js";

const TIMEFRAMES: [Timeframe, ...Timeframe[]] = ["hour", "day", "week", "month", "year", "all"];

const SearchRedditMentionsInputSchema = z
  .object({
    query: z
      .string()
      .min(2, "query must be at least 2 characters")
      .max(200, "query must not exceed 200 characters")
      .describe('Brand, product, or topic to search for, e.g. "Notion" or "AI note taking app"'),
    subreddit: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe('Restrict the search to one subreddit, without "r/", e.g. "SaaS". Omit to search all of Reddit.'),
    timeframe: z
      .enum(TIMEFRAMES)
      .default("week")
      .describe('How far back to search: "hour", "day", "week", "month", "year", or "all". Default "week".'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25)
      .describe("Maximum number of posts to return (1-100, default 25)."),
  })
  .strict();

export type SearchRedditMentionsInput = z.infer<typeof SearchRedditMentionsInputSchema>;

/**
 * Registers the search_reddit_mentions tool. Takes the Reddit client as a
 * dependency (via the shared MentionSource interface) rather than
 * constructing it internally, so the tool stays swappable and testable.
 */
export function registerSearchRedditMentions(server: McpServer, reddit: MentionSource): void {
  server.registerTool(
    "search_reddit_mentions",
    {
      title: "Search Reddit Mentions",
      description: `Search Reddit for posts (submissions) that mention a brand, product, or topic.

Uses Reddit's official search API, which covers post titles and post bodies. Note: Reddit's official API does not expose comment search, so comment threads matching the query are not included — only posts. To read comment discussion, follow the returned post URLs.

Args:
  - query (string): Brand, product, or topic to search for.
  - subreddit (string, optional): Restrict to one subreddit (no "r/" prefix). Omit to search all of Reddit.
  - timeframe ('hour'|'day'|'week'|'month'|'year'|'all'): How far back to search. Default 'week'.
  - limit (number): Max posts to return, 1-100. Default 25.

Returns JSON with an array of posts, each including id, author, title, text (selftext), url, createdAt (ISO 8601), score, commentCount, and subreddit.

Examples:
  - "What is Notion posting about this week on Reddit?" -> query="Notion", timeframe="week"
  - "What are people saying about us in r/SaaS?" -> query="<your brand>", subreddit="SaaS"

Error Handling:
  - Returns a clear message (not a crash) on Reddit rate limits, auth failures, or outages.`,
      inputSchema: SearchRedditMentionsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: SearchRedditMentionsInput) => {
      try {
        const posts = await reddit.searchMentions({
          query: params.query,
          community: params.subreddit,
          timeframe: params.timeframe,
          limit: params.limit,
        });

        if (!posts.length) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No Reddit posts found matching "${params.query}"${
                  params.subreddit ? ` in r/${params.subreddit}` : ""
                } within the last ${params.timeframe}.`,
              },
            ],
          };
        }

        const output = {
          query: params.query,
          subreddit: params.subreddit ?? null,
          timeframe: params.timeframe,
          count: posts.length,
          posts,
        };

        const lines = [
          `# Reddit mentions of "${params.query}"${params.subreddit ? ` in r/${params.subreddit}` : ""} (${params.timeframe})`,
          "",
          `Found ${posts.length} post(s).`,
          "",
        ];
        for (const post of posts) {
          lines.push(`## ${post.title ?? "(untitled)"} — r/${post.subreddit}`);
          lines.push(`- **Author**: u/${post.author}`);
          lines.push(`- **Posted**: ${post.createdAt}`);
          lines.push(`- **Score**: ${post.score ?? 0} | **Comments**: ${post.commentCount ?? 0}`);
          lines.push(`- **URL**: ${post.url}`);
          if (post.text) {
            const snippet = post.text.length > 280 ? `${post.text.slice(0, 280)}...` : post.text;
            lines.push(`- **Excerpt**: ${snippet}`);
          }
          lines.push("");
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: output,
        };
      } catch (error) {
        const message =
          error instanceof DataSourceError
            ? `Error: ${error.message}`
            : `Error: Unexpected failure searching Reddit: ${error instanceof Error ? error.message : String(error)}`;
        return {
          content: [{ type: "text" as const, text: message }],
        };
      }
    }
  );
}
