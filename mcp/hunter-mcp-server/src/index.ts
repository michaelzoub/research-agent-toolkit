import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { asMarkdownJsonFence, fetchJson, HttpError, ResponseFormat } from "@research-agent/mcp-shared";

const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown");

const HunterDomainSearchInputSchema = z
  .object({
    domain: z.string().min(1).max(253).describe("Domain to search (e.g. 'example.com')."),
    limit: z.number().int().min(1).max(100).default(10).describe("Max results (1-100)."),
    offset: z.number().int().min(0).default(0).describe("Pagination offset."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const HunterEmailFinderInputSchema = z
  .object({
    domain: z.string().min(1).max(253).describe("Company domain (e.g. 'example.com')."),
    first_name: z.string().min(1).max(120).describe("First name."),
    last_name: z.string().min(1).max(120).describe("Last name."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const HunterEmailVerifierInputSchema = z
  .object({
    email: z.string().email().max(320).describe("Email address to verify."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

function requireHunterKey(): string {
  const key = process.env.HUNTER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing HUNTER_API_KEY. Set it in the environment before starting this MCP server.",
    );
  }
  return key;
}

async function hunterGet<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const apiKey = requireHunterKey();
  const url = "https://api.hunter.io/v2/" + path + "?" + new URLSearchParams({ ...stringifyParams(params), api_key: apiKey }).toString();
  return await fetchJson<T>(url, undefined, { timeoutMs: 30_000 });
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
  const server = new McpServer({ name: "hunter-mcp-server", version: "0.1.0" });

  server.registerTool(
    "hunter_domain_search",
    {
      title: "Search a domain for emails (Hunter)",
      description:
        "Search a domain for publicly available email addresses and metadata using Hunter.io Domain Search.",
      inputSchema: HunterDomainSearchInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain, limit, offset, response_format }) => {
      try {
        const data = await hunterGet<any>("domain-search", { domain, limit, offset });
        const rf: ResponseFormat = response_format;
        const payload = {
          domain,
          results: data?.data ?? null,
          meta: data?.meta ?? null,
        };
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Hunter domain search: \`${domain}\`\n\n` + asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 401
            ? "Check that HUNTER_API_KEY is valid."
            : "Try reducing limit or confirming the domain is correct.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  server.registerTool(
    "hunter_email_finder",
    {
      title: "Find an email (Hunter)",
      description:
        "Find the most likely email address for a person at a given domain using Hunter.io Email Finder.",
      inputSchema: HunterEmailFinderInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ domain, first_name, last_name, response_format }) => {
      try {
        const data = await hunterGet<any>("email-finder", { domain, first_name, last_name });
        const rf: ResponseFormat = response_format;
        const payload = { domain, first_name, last_name, result: data?.data ?? null, meta: data?.meta ?? null };
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Hunter email finder\n- domain: \`${domain}\`\n- name: ${first_name} ${last_name}\n\n` + asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 401
            ? "Check that HUNTER_API_KEY is valid."
            : "Try another spelling for the name, or confirm the domain.";
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}. ${hint}` }] };
      }
    },
  );

  server.registerTool(
    "hunter_email_verifier",
    {
      title: "Verify an email (Hunter)",
      description:
        "Verify deliverability of an email address using Hunter.io Email Verifier (returns status, score, and checks).",
      inputSchema: HunterEmailVerifierInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ email, response_format }) => {
      try {
        const data = await hunterGet<any>("email-verifier", { email });
        const rf: ResponseFormat = response_format;
        const payload = { email, result: data?.data ?? null, meta: data?.meta ?? null };
        const text =
          rf === "json"
            ? asMarkdownJsonFence(payload)
            : `## Hunter email verifier\n- email: \`${email}\`\n\n` + asMarkdownJsonFence(payload);
        return { content: [{ type: "text", text }], structuredContent: payload };
      } catch (err: any) {
        const hint =
          err instanceof HttpError && err.status === 401
            ? "Check that HUNTER_API_KEY is valid."
            : "Confirm the email is formatted correctly.";
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

