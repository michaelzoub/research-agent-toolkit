import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import { asMarkdownJsonFence, fetchText, ResponseFormat } from "@research-agent/mcp-shared";

type ArxivPaper = {
  id: string;
  arxiv_id: string;
  title: string;
  summary: string;
  published?: string;
  updated?: string;
  authors: string[];
  categories: string[];
  doi?: string;
  pdf_url?: string;
  primary_category?: string;
};

const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown");

const ArxivSearchInputSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .max(400)
      .describe(
        "arXiv API search query (e.g. 'cat:cs.AI AND all:polymarket', 'ti:\"prediction markets\"')",
      ),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results (1-50)."),
    offset: z.number().int().min(0).default(0).describe("Pagination offset."),
    sort_by: z
      .enum(["relevance", "lastUpdatedDate", "submittedDate"])
      .default("relevance")
      .describe("arXiv sortBy parameter."),
    sort_order: z.enum(["ascending", "descending"]).default("descending").describe("arXiv sortOrder."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const ArxivGetPaperInputSchema = z
  .object({
    arxiv_id: z
      .string()
      .min(1)
      .max(64)
      .describe("arXiv identifier (e.g. '2106.01345' or 'hep-th/9901001')."),
    response_format: ResponseFormatSchema.describe("Output format: markdown or json."),
  })
  .strict();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeEntry(entry: any): ArxivPaper {
  const id: string = entry.id;
  const arxivId = typeof entry["arxiv:doi"] === "string" ? entry["arxiv:doi"] : undefined;
  const authors = toArray(entry.author).map((a) => a?.name).filter(Boolean);
  const categories = toArray(entry.category).map((c) => c?.["@_term"]).filter(Boolean);
  const links = toArray(entry.link);
  const pdfUrl = links.find((l) => l?.["@_title"] === "pdf" || l?.["@_type"] === "application/pdf")?.["@_href"];

  const primaryCategory =
    entry["arxiv:primary_category"]?.["@_term"] ??
    entry["arxiv:primary_category"]?.["@_term".toString()];

  const doi = entry["arxiv:doi"];

  return {
    id,
    arxiv_id: id?.split("/abs/")[1] ?? id,
    title: (entry.title ?? "").toString().replace(/\s+/g, " ").trim(),
    summary: (entry.summary ?? "").toString().replace(/\s+/g, " ").trim(),
    published: entry.published,
    updated: entry.updated,
    authors,
    categories,
    doi: typeof doi === "string" ? doi : undefined,
    pdf_url: typeof pdfUrl === "string" ? pdfUrl : undefined,
    primary_category: typeof primaryCategory === "string" ? primaryCategory : undefined,
  };
}

function renderMarkdownSearch(result: { total: number; count: number; offset: number; has_more: boolean; next_offset?: number; papers: ArxivPaper[] }) {
  const lines: string[] = [];
  lines.push(`## arXiv search results`);
  lines.push(
    `- total: **${result.total}** | returned: **${result.count}** | offset: **${result.offset}** | has_more: **${result.has_more}**`,
  );
  if (result.has_more && typeof result.next_offset === "number") {
    lines.push(`- next_offset: **${result.next_offset}**`);
  }
  lines.push("");
  for (const p of result.papers) {
    lines.push(`### ${p.title}`);
    lines.push(`- arxiv_id: \`${p.arxiv_id}\``);
    if (p.published) lines.push(`- published: ${p.published}`);
    if (p.updated) lines.push(`- updated: ${p.updated}`);
    if (p.primary_category) lines.push(`- primary_category: \`${p.primary_category}\``);
    if (p.categories?.length) lines.push(`- categories: ${p.categories.map((c) => `\`${c}\``).join(", ")}`);
    if (p.authors?.length) lines.push(`- authors: ${p.authors.join(", ")}`);
    if (p.doi) lines.push(`- doi: \`${p.doi}\``);
    if (p.pdf_url) lines.push(`- pdf: ${p.pdf_url}`);
    lines.push("");
    lines.push(p.summary ? p.summary.slice(0, 900) + (p.summary.length > 900 ? "…" : "") : "");
    lines.push("");
  }
  return lines.join("\n");
}

async function arxivQuery(queryUrl: string): Promise<{ total: number; entries: ArxivPaper[] }> {
  const xml = await fetchText(queryUrl, undefined, { timeoutMs: 30_000 });
  const doc = parser.parse(xml);
  const feed = doc?.feed;
  const total = Number(feed?.["opensearch:totalResults"] ?? 0);
  const entries = toArray(feed?.entry).map(normalizeEntry);
  return { total, entries };
}

async function main() {
  const server = new McpServer({ name: "arxiv-mcp-server", version: "0.1.0" });

  server.registerTool(
    "arxiv_search_papers",
    {
      title: "Search arXiv papers",
      description:
        "Search arXiv papers using the official arXiv API query syntax. Returns title, abstract, authors, categories, timestamps, and PDF link when available.",
      inputSchema: ArxivSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, limit, offset, sort_by, sort_order, response_format }) => {
      try {
        const url =
          "https://export.arxiv.org/api/query?" +
          new URLSearchParams({
            search_query: query,
            start: String(offset),
            max_results: String(limit),
            sortBy: sort_by,
            sortOrder: sort_order,
          }).toString();

        const { total, entries } = await arxivQuery(url);
        const result = {
          total,
          count: entries.length,
          offset,
          papers: entries,
          has_more: offset + entries.length < total,
          next_offset: offset + entries.length < total ? offset + entries.length : undefined,
        };

        const rf: ResponseFormat = response_format;
        const text = rf === "json" ? asMarkdownJsonFence(result) : renderMarkdownSearch(result);
        return { content: [{ type: "text", text }], structuredContent: result };
      } catch (err: any) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `Error: ${err?.message ?? String(err)}. ` +
                `Try a simpler query (e.g. 'all:prediction AND cat:cs.AI') or reduce limit.`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "arxiv_get_paper",
    {
      title: "Get an arXiv paper by id",
      description:
        "Fetch a single arXiv paper (title, abstract, authors, categories, PDF URL) by its arXiv identifier.",
      inputSchema: ArxivGetPaperInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ arxiv_id, response_format }) => {
      try {
        const url =
          "https://export.arxiv.org/api/query?" +
          new URLSearchParams({
            id_list: arxiv_id,
            max_results: "1",
          }).toString();

        const { total, entries } = await arxivQuery(url);
        const paper = entries[0];
        if (!paper) {
          const msg = `No paper found for arxiv_id='${arxiv_id}'.`;
          return { content: [{ type: "text", text: msg }], structuredContent: { total, paper: null } };
        }

        const result = { total, paper };
        const rf: ResponseFormat = response_format;
        const text =
          rf === "json"
            ? asMarkdownJsonFence(result)
            : `## ${paper.title}\n- arxiv_id: \`${paper.arxiv_id}\`\n- authors: ${paper.authors.join(
                ", ",
              )}\n- categories: ${paper.categories.map((c) => `\`${c}\``).join(", ")}\n${
                paper.pdf_url ? `- pdf: ${paper.pdf_url}\n` : ""
              }\n\n${paper.summary}`;
        return { content: [{ type: "text", text }], structuredContent: result };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}.` }],
        };
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

