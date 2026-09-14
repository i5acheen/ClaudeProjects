#!/usr/bin/env node
/**
 * Social Intelligence MCP server.
 *
 * Exposes tools that let AI assistants query real-time social data
 * (Reddit, and later YouTube) to answer competitive and
 * creator-intelligence questions.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { RedditClient } from "./clients/reddit.js";
import { registerPing } from "./tools/ping.js";
import { registerSearchRedditMentions } from "./tools/search_reddit_mentions.js";

async function main(): Promise<void> {
  const env = getConfig();

  const server = new McpServer({
    name: "social-intel-mcp-server",
    version: "0.1.0",
  });

  const reddit = new RedditClient({
    clientId: env.REDDIT_CLIENT_ID,
    clientSecret: env.REDDIT_CLIENT_SECRET,
    userAgent: env.REDDIT_USER_AGENT,
  });

  registerPing(server);
  registerSearchRedditMentions(server, reddit);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("social-intel-mcp-server running via stdio");
}

main().catch((error) => {
  console.error("Fatal error starting social-intel-mcp-server:", error instanceof Error ? error.message : error);
  process.exit(1);
});
