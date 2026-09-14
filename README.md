# social-intel-mcp-server

A "social intelligence" MCP (Model Context Protocol) server. It lets AI
assistants (Claude, ChatGPT, Gemini, etc.) query real-time social data to
answer competitive and creator-intelligence questions, e.g.:

- "What is [competitor] posting about this week?"
- "What are people saying about us on Reddit?"
- "Which creators in [niche] are gaining traction?" *(coming soon)*
- "What's trending in our category on YouTube right now?" *(coming soon)*

**v1 scope: Reddit + YouTube.** Instagram and X are intentionally out of
scope — Instagram's Graph API only covers accounts you own, and X's API is
costly at any tier useful for this. The data layer (see
[Architecture](#architecture)) is built so either can be added later as a
new client, without reworking any tool.

## Status

| Tool | Status |
|---|---|
| `ping` | ✅ working (connectivity check, no external calls) |
| `search_reddit_mentions` | ✅ working |
| `get_subreddit_sentiment` | 🚧 planned |
| `search_youtube_activity` | 🚧 planned |
| `find_trending_youtube_creators` | 🚧 planned |
| `get_channel_stats` | 🚧 planned |

SQLite response caching and rate-limit handling are planned before the
YouTube tools are added.

## Architecture

```
src/
  server.ts          MCP server entrypoint, registers tools
  config.ts           env-based API key management
  types.ts             shared data model + MentionSource interface
  clients/
    reddit.ts          Reddit API client (OAuth, implements MentionSource)
    youtube.ts          (planned) YouTube Data API v3 client
  tools/
    ping.ts             connectivity check
    search_reddit_mentions.ts
tests/                unit tests per tool with mocked API responses (planned)
```

Tools never call a platform SDK directly — they depend only on the
`MentionSource` interface defined in `src/types.ts`. Each platform (Reddit,
YouTube, and later Instagram/X or a licensed data provider) implements that
interface in its own file under `src/clients/`. This means a new data
source can be added as a new client file, with no changes to existing
tools.

## Prerequisites

- Node.js >= 18
- A Reddit account (to create an API app)

## 1. Get Reddit API credentials

1. Log in to Reddit and go to <https://www.reddit.com/prefs/apps>.
2. Click **create app** (or **create another app**) at the bottom.
3. Fill in:
   - **name**: anything, e.g. `social-intel-mcp-server`
   - **type**: select **script**
   - **redirect uri**: `http://localhost:8080` (required by the form, unused by this server)
4. Click **create app**.
5. You'll see:
   - **client ID**: the string under the app name, directly beneath "personal use script"
   - **client secret**: labeled "secret"

This server uses Reddit's app-only OAuth grant (`client_credentials`), which
is enough for read-only access to public endpoints like search — it does
not require a Reddit user login/password.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=social-intel-mcp-server:v0.1.0 (by /u/your_reddit_username)
```

Reddit requires a descriptive User-Agent on every request (unauthenticated
or generic ones get rate-limited harder) — keep the
`<platform>:<app id>:<version> (by /u/<username>)` format.

Never commit `.env` — it's already in `.gitignore`. Only `.env.example`
(with empty values) is checked in.

## 3. Install and build

```bash
npm install
npm run build
```

## 4. Add the server to Claude Desktop

Open Claude Desktop's MCP config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add an entry under `mcpServers` (create the file/key if it doesn't exist),
using the **absolute path** to this project:

```json
{
  "mcpServers": {
    "social-intel": {
      "command": "node",
      "args": ["/absolute/path/to/social-intel-mcp-server/dist/server.js"],
      "env": {
        "REDDIT_CLIENT_ID": "your_client_id",
        "REDDIT_CLIENT_SECRET": "your_client_secret",
        "REDDIT_USER_AGENT": "social-intel-mcp-server:v0.1.0 (by /u/your_reddit_username)"
      }
    }
  }
}
```

Claude Desktop launches the server as a subprocess and does not read your
`.env` file, so credentials must be repeated in the `env` block above.

Restart Claude Desktop completely (quit, not just close the window) after
editing the config.

## 5. Test it

In a new Claude Desktop conversation:

1. Confirm the server connected: look for a 🔌/tools icon indicating MCP
   tools are available, or ask Claude "what tools do you have access to?"
   — it should list `ping` and `search_reddit_mentions`.
2. Sanity check the connection: ask Claude to **use the ping tool**. It
   should return `pong`.
3. Try the real tool: ask something like *"Search Reddit for mentions of
   'Notion' from the past week"* or *"What's r/SaaS saying about
   Superhuman?"*. Claude should call `search_reddit_mentions` and
   summarize the results.

If the server doesn't appear in Claude Desktop:
- Double-check the config file path and that the JSON is valid (no trailing commas).
- Confirm `dist/server.js` exists (`npm run build`).
- Check Claude Desktop's MCP logs (Settings → Developer, or the app's log directory) for startup errors.

If Reddit calls fail, `search_reddit_mentions` returns a clear error
message (never a crash) — check it for rate-limit, auth, or outage
guidance.

## Development

```bash
npm run dev     # run directly with tsx, no build step
npm run build   # compile TypeScript to dist/
npm test        # run unit tests (once added)
```

## Constraints this project follows

- Official Reddit/YouTube APIs only, respecting their ToS and rate limits.
- All API keys via environment variables; `.env` is never committed.
- Every tool fails gracefully with a clear error message on rate-limit or
  API outage — it never crashes the MCP session.
