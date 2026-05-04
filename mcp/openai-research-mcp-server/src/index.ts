import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cheerio from "cheerio";
import { asMarkdownJsonFence, fetchText, ResponseFormat } from "@research-agent/mcp-shared";

const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown");

const ListPublicationsInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(25).describe("Max results to return (1-100)."),
    offset: z.number().int().min(0).default(0).describe("Pagination offset."),
    query: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe("Optional substring filter on title (case-insensitive)."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const GetPublicationInputSchema = z
  .object({
    url: z.string().url().describe("Publication URL (usually from openai_list_publications)."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

type PublicationListItem = {
  title: string;
  url: string;
};

type PublicationDetail = PublicationListItem & {
  date?: string;
  headings: string[];
  excerpt?: string;
};

const RESEARCH_URL = "https://openai.com/research/";
const CHARACTER_LIMIT = 18_000;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function absolutize(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `https://openai.com${href}`;
  return `${RESEARCH_URL}${href}`;
}

async function fetchResearchHtml(): Promise<string> {
  return await fetchText(RESEARCH_URL, undefined, {
    timeoutMs: 45_000,
    headers: { "User-Agent": "research-agent-mcp (+https://github.com/michaelzoub/research-agent)" },
  });
}

function parsePublications(html: string): PublicationListItem[] {
  const $ = cheerio.load(html);
  const items: PublicationListItem[] = [];
  const seen = new Set<string>();

  // Heuristic: OpenAI research pages are under /research/<slug>
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href) return;
    if (!href.startsWith("/research/")) return;
    if (href === "/research/") return;
    const url = absolutize(href);
    if (seen.has(url)) return;

    const title = normalizeWhitespace($(el).text() || "");
    if (!title || title.length < 6) return;

    seen.add(url);
    items.push({ title, url });
  });

  return items
    .filter((it) => it.title.length <= 220)
    .slice(0, 500);
}

async function fetchPublicationDetail(url: string): Promise<PublicationDetail> {
  const html = await fetchText(url, undefined, {
    timeoutMs: 45_000,
    headers: { "User-Agent": "research-agent-mcp (+https://github.com/michaelzoub/research-agent)" },
  });
  const $ = cheerio.load(html);

  const title =
    normalizeWhitespace($("main h1").first().text()) ||
    normalizeWhitespace($("h1").first().text()) ||
    normalizeWhitespace($("title").text());

  const headings: string[] = [];
  $("main h2, main h3").each((_, el) => {
    const t = normalizeWhitespace($(el).text());
    if (t) headings.push(t);
  });

  const excerpt =
    normalizeWhitespace($('meta[name="description"]').attr("content") ?? "") ||
    normalizeWhitespace($("main p").first().text());

  const date =
    normalizeWhitespace($("main time").first().attr("datetime") ?? $("main time").first().text() ?? "") || undefined;

  return {
    title: title || url,
    url,
    date,
    headings: headings.slice(0, 40),
    excerpt: excerpt ? excerpt.slice(0, 600) : undefined,
  };
}

function renderListMarkdown(result: {
  total: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
  items: PublicationListItem[];
}) {
  const lines: string[] = [];
  lines.push("## OpenAI Research publications");
  lines.push(
    `- total: **${result.total}** | returned: **${result.count}** | offset: **${result.offset}** | has_more: **${result.has_more}**`,
  );
  if (result.has_more && typeof result.next_offset === "number") lines.push(`- next_offset: **${result.next_offset}**`);
  lines.push("");
  for (const it of result.items) {
    lines.push(`- ${it.title} (${it.url})`);
  }
  return lines.join("\n").slice(0, CHARACTER_LIMIT);
}

async function main() {
  const server = new McpServer({ name: "openai-research-mcp-server", version: "0.1.0" });

  server.registerTool(
    "openai_list_publications",
    {
      title: "List OpenAI Research publications",
      description:
        "List publication links from OpenAI Research. Supports simple substring filtering by title and offset/limit pagination.",
      inputSchema: ListPublicationsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ limit, offset, query, response_format }) => {
      try {
        const html = await fetchResearchHtml();
        let items = parsePublications(html);
        if (query) {
          const q = query.toLowerCase();
          items = items.filter((it) => it.title.toLowerCase().includes(q));
        }

        const total = items.length;
        const page = items.slice(offset, offset + limit);
        const result = {
          total,
          count: page.length,
          offset,
          items: page,
          has_more: offset + page.length < total,
          next_offset: offset + page.length < total ? offset + page.length : undefined,
        };

        const rf: ResponseFormat = response_format;
        const text = rf === "json" ? asMarkdownJsonFence(result) : renderListMarkdown(result);
        return { content: [{ type: "text", text }], structuredContent: result };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Error: ${err?.message ?? String(err)}. ` +
                `Try again later or use an MPP web search/scrape service for resilient extraction.`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "openai_get_publication",
    {
      title: "Get OpenAI publication details",
      description:
        "Fetch a single OpenAI Research publication page and extract title, date (if present), headings, and a short excerpt.",
      inputSchema: GetPublicationInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url, response_format }) => {
      try {
        const detail = await fetchPublicationDetail(url);
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(detail)
            : `## ${detail.title}\n- url: ${detail.url}\n${detail.date ? `- date: ${detail.date}\n` : ""}${
                detail.excerpt ? `\n${detail.excerpt}\n` : "\n"
              }\n### Headings\n${detail.headings.map((h) => `- ${h}`).join("\n")}`.slice(0, CHARACTER_LIMIT);
        return { content: [{ type: "text", text }], structuredContent: detail };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}.` }] };
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

