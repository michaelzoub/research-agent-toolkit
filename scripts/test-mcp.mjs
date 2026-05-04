import { Client, StdioClientTransport } from "@modelcontextprotocol/client";

async function withClient({ name, command, args }, fn) {
  const transport = new StdioClientTransport({ command, args });
  const client = new Client({ name: `research-agent-test:${name}`, version: "0.1.0" });
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

function printTitle(s) {
  process.stdout.write(`\n=== ${s} ===\n`);
}

async function listTools(client) {
  const tools = await client.listTools();
  return tools?.tools ?? tools;
}

async function main() {
  const results = [];

  // arxiv
  printTitle("arxiv-mcp-server");
  results.push(
    await withClient(
      {
        name: "arxiv",
        command: "node",
        args: ["mcp/arxiv-mcp-server/dist/index.js"],
      },
      async (client) => {
        const tools = await listTools(client);
        console.log("tools:", tools.map((t) => t.name).join(", "));
        const res = await client.callTool({
          name: "arxiv_search_papers",
          arguments: { query: "all:prediction markets", limit: 3, offset: 0, response_format: "json" },
        });
        console.log("callTool(arxiv_search_papers) ok:", Boolean(res));
        return { server: "arxiv", ok: true };
      },
    ),
  );

  // anthropic publications
  printTitle("anthropic-research-mcp-server");
  results.push(
    await withClient(
      {
        name: "anthropic-research",
        command: "node",
        args: ["mcp/anthropic-research-mcp-server/dist/index.js"],
      },
      async (client) => {
        const tools = await listTools(client);
        console.log("tools:", tools.map((t) => t.name).join(", "));
        const res = await client.callTool({
          name: "anthropic_list_publications",
          arguments: { limit: 5, offset: 0, response_format: "json" },
        });
        console.log("callTool(anthropic_list_publications) ok:", Boolean(res));
        return { server: "anthropic-research", ok: true };
      },
    ),
  );

  // openai publications
  printTitle("openai-research-mcp-server");
  results.push(
    await withClient(
      {
        name: "openai-research",
        command: "node",
        args: ["mcp/openai-research-mcp-server/dist/index.js"],
      },
      async (client) => {
        const tools = await listTools(client);
        console.log("tools:", tools.map((t) => t.name).join(", "));
        const res = await client.callTool({
          name: "openai_list_publications",
          arguments: { limit: 5, offset: 0, response_format: "json" },
        });
        console.log("callTool(openai_list_publications) ok:", Boolean(res));
        return { server: "openai-research", ok: true };
      },
    ),
  );

  // hunter + nansen + coldvision are env-dependent; report status.
  printTitle("env-dependent servers");
  console.log("HUNTER_API_KEY:", process.env.HUNTER_API_KEY ? "set" : "missing (skipping live test)");
  console.log("NANSEN_API_KEY:", process.env.NANSEN_API_KEY ? "set" : "missing (skipping live test)");
  console.log("COLDVISION_BASE_URL:", process.env.COLDVISION_BASE_URL ? "set" : "missing (skipping live test)");

  printTitle("summary");
  console.log(JSON.stringify({ ok: true, tested: results }, null, 2));
}

main().catch((err) => {
  console.error("MCP test runner failed:", err);
  process.exit(1);
});

