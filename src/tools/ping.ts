import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const PingInputSchema = z
  .object({
    message: z.string().max(200).optional().describe("Optional text to echo back."),
  })
  .strict();

/**
 * Trivial connectivity-check tool with no external dependencies. Useful
 * for confirming the server is wired up correctly in an MCP client
 * before debugging any real (network-dependent) tool.
 */
export function registerPing(server: McpServer): void {
  server.registerTool(
    "ping",
    {
      title: "Ping",
      description:
        "Connectivity check. Returns 'pong' plus an optional echoed message. Use this to confirm the MCP server is connected before using data-fetching tools.",
      inputSchema: PingInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ message }: { message?: string }) => {
      const text = message ? `pong: ${message}` : "pong";
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { text },
      };
    }
  );
}
