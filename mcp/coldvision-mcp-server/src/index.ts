import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { asMarkdownJsonFence, fetchJson, HttpError, ResponseFormat } from "@research-agent/mcp-shared";

const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown");

const ListMarketsInputSchema = z
  .object({
    limit: z.number().int().min(1).max(200).default(50).describe("Max markets to return."),
    offset: z.number().int().min(0).default(0).describe("Pagination offset."),
    status: z.string().min(1).max(40).optional().describe("Optional market status filter (implementation-specific)."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const GetMarketInputSchema = z
  .object({
    market_id: z.string().min(1).max(200).describe("Coldvision/Polymarket market identifier."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const GetWhalesInputSchema = z
  .object({
    market_id: z.string().min(1).max(200).optional().describe("Optional market id to scope whale activity."),
    limit: z.number().int().min(1).max(200).default(50).describe("Max results."),
    offset: z.number().int().min(0).default(0).describe("Pagination offset."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const GetInsiderScoreInputSchema = z
  .object({
    address: z.string().min(6).max(128).describe("Wallet address to score."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

function baseUrl(): string {
  const url = process.env.COLDVISION_BASE_URL;
  if (!url) throw new Error("Missing COLDVISION_BASE_URL. Set it before starting this MCP server.");
  return url.replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.COLDVISION_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function cvGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url =
    baseUrl() +
    path +
    (params ? "?" + new URLSearchParams(stringifyParams(params)).toString() : "");
  return await fetchJson<T>(url, undefined, {
    timeoutMs: 45_000,
    headers: { ...authHeaders(), Accept: "application/json" },
  });
}

function stringifyParams(params: Record<string, string | number | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

async function main() {
  const server = new McpServer({ name: "coldvision-mcp-server", version: "0.1.0" });

  server.registerTool(
    "coldvision_list_markets",
    {
      title: "List markets (Coldvision)",
      description: "List prediction markets from the internal Coldvision API (pagination supported).",
      inputSchema: ListMarketsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ limit, offset, status, response_format }) => {
      try {
        const data = await cvGet<any>("/markets", { limit, offset, status });
        const payload = { limit, offset, status, result: data };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Coldvision markets\n- limit: **${limit}** | offset: **${offset}**${status ? ` | status: \`${status}\`` : ""}\n\n` +
              asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 401
            ? "Check COLDVISION_API_KEY."
            : "Confirm COLDVISION_BASE_URL and that `/markets` exists on your internal API.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  server.registerTool(
    "coldvision_get_market",
    {
      title: "Get market (Coldvision)",
      description: "Fetch a single market by id from the internal Coldvision API.",
      inputSchema: GetMarketInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ market_id, response_format }) => {
      try {
        const data = await cvGet<any>(`/markets/${encodeURIComponent(market_id)}`);
        const payload = { market_id, market: data };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Coldvision market\n- market_id: \`${market_id}\`\n\n` + asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 404
            ? "Market not found. Confirm the market_id."
            : err instanceof HttpError && err.status === 401
              ? "Check COLDVISION_API_KEY."
              : "Confirm COLDVISION_BASE_URL and that `/markets/{id}` exists on your internal API.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  server.registerTool(
    "coldvision_get_whales",
    {
      title: "Get whale activity (Coldvision)",
      description: "Fetch whale tracking / large trader activity from the internal Coldvision API.",
      inputSchema: GetWhalesInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ market_id, limit, offset, response_format }) => {
      try {
        const data = await cvGet<any>("/whales", { market_id, limit, offset });
        const payload = { market_id, limit, offset, result: data };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Coldvision whales\n- limit: **${limit}** | offset: **${offset}**${market_id ? ` | market_id: \`${market_id}\`` : ""}\n\n` +
              asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 401
            ? "Check COLDVISION_API_KEY."
            : "Confirm COLDVISION_BASE_URL and that `/whales` exists on your internal API.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  server.registerTool(
    "coldvision_get_insider_score",
    {
      title: "Get insider score (Coldvision)",
      description: "Fetch an insider / informed-trader score for a wallet address from the internal Coldvision API.",
      inputSchema: GetInsiderScoreInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ address, response_format }) => {
      try {
        const data = await cvGet<any>("/insider-score", { address });
        const payload = { address, result: data };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Coldvision insider score\n- address: \`${address}\`\n\n` + asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 401
            ? "Check COLDVISION_API_KEY."
            : "Confirm COLDVISION_BASE_URL and that `/insider-score` exists on your internal API.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

