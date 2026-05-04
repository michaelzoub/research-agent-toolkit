# research-agent

This repository is a **central workspace for technical + startup-focused research** that turns “chat research” into a repeatable system for **article writing and drafting**.

It’s built to be opened as the working directory in **Claude Code / Codex**, so the agent can:

- use real tools (MCP servers + paid MPP rails) instead of guessing,
- follow consistent workflows (skills) instead of ad-hoc prompting,
- keep artifacts (templates, references, scripts) versioned and reusable.

## Why this was built / what problem it solves

Chatbots are great for ideation, but research work breaks down when you need:

- **repeatable workflows** (discovery → extraction → synthesis → output),
- **real data access** (APIs, internal systems, paid sources),
- **evidence grounding** (what came from where),
- and **artifact persistence** (skills, templates, reference images, scripts).

This repo turns that into a durable system you can run from **Claude Code** (or Codex) with the repo selected.

## Architecture

Focused research agent built for Claude Code using:

- Claude Code as the harness (no custom orchestrator runtime)
- Custom MCP servers for data access (TypeScript)
- Portable skills under `skills/` (portable across Claude Code, Claude.ai, Codex, and API agents)
- MPP payment rails (Tempo Wallet primary; AgentCash secondary)

## Skills

Skills live under `skills/` as **portable, folder-based workflows + output templates**. Every skill is designed to help agents perform tasks **more optimally** by:

- reducing prompt ambiguity (clear stages, inputs, outputs),
- enforcing provenance + citation discipline,
- and making the agent choose the right data source (free-first, paid escalation via MPP when coverage is insufficient).

- `skills/project-research`: staged orchestrator (discovery → extraction → synthesis → output), **MPP-aware** (checks `mpp.dev/services/llms.txt`), free-first with paid escalation.
- `skills/research-paper`: academic-style paper output (Markdown + optional LaTeX).
- `skills/analytics-article`: long-form narrative research article with embedded charts + methods appendix.
- `skills/branding-generator`: generates covers/headers/social graphics. You can add or replace style anchors in `skills/branding-generator/references/` (this skill ships with 8 reference images; cream base + rust accent `#D97843`).
- `skills/builder-finder`: sources builders/collaborators (Hunter + GitHub + optional on-chain) with AgentCash escalation for enrichment.

## Outputs

Put **generated deliverables** in `outputs/` at the repo root (create it when needed):

- research papers / memos / articles (Markdown, LaTeX, PDF exports),
- branding assets (covers, headers, social graphics),
- spreadsheets and data exports (Excel `.xlsx`, CSV, etc.).

That keeps skills + MCP code separate from one-off files an agent produces during a run.

**Git:** `outputs/` is listed in `.gitignore`, so those generated files are **not tracked** by default. Remove or adjust that line if you intentionally want to commit specific outputs.

## MCP servers

MCP servers live under `mcp/` as independent packages (stdio transport). This layer is intentionally **open-ended** — you can add as many MCP servers as you want over time.

Instead of treating the list as “complete”, use `mcp/` as a toolbox for the agent. In practice, the most useful MCP servers for this repo fall into a few buckets:

- **Papers + technical grounding**: arXiv / semantic scholar / citation graphs.
- **Web + news + scraping**: resilient fetch/extract, search, site crawls (free-first; escalate to MPP services like Exa/Firecrawl when needed).
- **On-chain intelligence**: wallet labels, flows, smart money, DEX trades, PnL.
- **Prediction markets**: markets/odds/volume, whale tracking, insider scoring, settlement/oracle events.
- **People + outreach**: contact discovery, email verification, enrichment.
- **Model lab publications**: research feeds for major labs (e.g. Anthropic/OpenAI) to seed reading lists.

If you want to see what’s currently implemented in this repo, look inside `mcp/` (each server has its own `README.md` and tool list).

## Development

Install and build everything:

```bash
npm install
npm run build
```

