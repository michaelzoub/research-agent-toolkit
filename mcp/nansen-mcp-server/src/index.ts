import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { asMarkdownJsonFence, fetchJson, HttpError, ResponseFormat } from "@research-agent/mcp-shared";

const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown");

const NansenWalletLabelsInputSchema = z
  .object({
    address: z
      .string()
      .min(6)
      .max(128)
      .describe("Wallet address (EVM or chain-specific as supported by your Nansen plan)."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const NansenSmartMoneyFlowsInputSchema = z
  .object({
    chain: z.string().min(2).max(32).describe("Chain identifier used by Nansen (e.g. 'ethereum', 'base')."),
    token_address: z.string().min(6).max(128).describe("Token contract address."),
    start_time: z.string().min(1).max(64).describe("Start time (ISO string)."),
    end_time: z.string().min(1).max(64).describe("End time (ISO string)."),
    limit: z.number().int().min(1).max(200).default(50).describe("Max results."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

function requireNansenKey(): string {
  const key = process.env.NANSEN_API_KEY;
  if (!key) throw new Error("Missing NANSEN_API_KEY. Set it in the environment before starting this MCP server.");
  return key;
}

function baseUrl(): string {
  return process.env.NANSEN_BASE_URL?.replace(/\/+$/, "") || "https://api.nansen.ai";
}

async function nansenGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url =
    baseUrl() +
    path +
    (params ? "?" + new URLSearchParams(stringifyParams(params)).toString() : "");
  return await fetchJson<T>(url, undefined, {
    timeoutMs: 45_000,
    headers: {
      "X-API-KEY": requireNansenKey(),
      Accept: "application/json",
    },
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
  const server = new McpServer({ name: "nansen-mcp-server", version: "0.1.0" });

  server.registerTool(
    "nansen_get_wallet_labels",
    {
      title: "Get Nansen wallet labels",
      description:
        "Fetch Nansen labels/tags for a wallet address (e.g., exchange, fund, smart money, known entity).",
      inputSchema: NansenWalletLabelsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ address, response_format }) => {
      try {
        // Endpoint names vary by plan; keep this as a thin wrapper around the documented route.
        const data = await nansenGet<any>(`/api/v1/wallets/${encodeURIComponent(address)}/labels`);
        const payload = { address, labels: data };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Nansen wallet labels\n- address: \`${address}\`\n\n` + asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 404
            ? "This endpoint may differ for your Nansen plan. Confirm the correct route in your Nansen API docs."
            : err instanceof HttpError && err.status === 401
              ? "Check that NANSEN_API_KEY is valid."
              : "Try again or confirm your Nansen plan supports this route.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  server.registerTool(
    "nansen_get_smart_money_flows",
    {
      title: "Get Nansen smart money flows (token)",
      description:
        "Fetch token flows for smart money entities over a time window. Exact fields depend on Nansen API plan and route.",
      inputSchema: NansenSmartMoneyFlowsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ chain, token_address, start_time, end_time, limit, response_format }) => {
      try {
        const data = await nansenGet<any>("/api/v1/smart-money/flows", {
          chain,
          token_address,
          start_time,
          end_time,
          limit,
        });
        const payload = { chain, token_address, start_time, end_time, limit, result: data };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Nansen smart money flows\n- chain: \`${chain}\`\n- token: \`${token_address}\`\n- window: ${start_time} → ${end_time}\n\n` +
              asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 404
            ? "This endpoint may differ for your Nansen plan. Confirm the correct route in your Nansen API docs."
            : err instanceof HttpError && err.status === 401
              ? "Check that NANSEN_API_KEY is valid."
              : "Try narrowing the time window or confirm the chain/token identifiers.";
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

