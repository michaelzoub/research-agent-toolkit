---
name: project-research
description: >
  Multi-stage research orchestrator for technical + crypto/prediction-market investigations.
  Pattern: discovery → parallel extraction → aggregation → synthesis → output.
  Always check MPP service catalog for paid sources before scraping; default to free first.
triggers:
  - "research"
  - "deep dive"
  - "write a memo"
  - "investigate"
  - "polymarket"
  - "prediction markets"
  - "on-chain"
---

# Project Research (Orchestrator)

## What this skill does

Runs a staged research workflow (inspired by “corpus discovery → parallel extraction → aggregation → synthesis”) optimized for crypto + prediction-market research, with evidence grounding and reusable outputs.

## Guardrails

- **Free-first**: use free/public sources first.
- **MPP-aware**: check `https://mpp.dev/services/llms.txt` (or the JSON API `https://mpp.dev/api/services`) for paid sources that can improve coverage or reduce scraping.
- **Spend control**: when using Tempo, always dry-run first and respect `--max-spend` if a budget is provided.
- **Provenance**: keep a citations list and attach evidence for non-trivial claims.

## Stages (high level)

- Stage 0: corpus discovery
- Stage 1: parallel extraction (per source type)
- Stage 2: aggregation (normalize + dedupe + score)
- Stage 3: synthesis (claims + counterclaims + uncertainty)
- Stage 4: output (choose template: research-paper / analytics-article)

---

## Stage 0 — Corpus discovery

### 0A) Define the research question

Produce:
- 1–3 sentence objective
- scope boundaries (time window, chains, markets, entities)
- “what would change my mind” criteria

### 0B) Check MPP service catalog (before scraping)

Fetch and parse:
- `https://mpp.dev/services/llms.txt` (fast list)
- optionally `https://mpp.dev/api/services` (full JSON with endpoints/pricing)

Identify relevant categories:
- `search`, `web`, `data`, `blockchain`, `media`

If a paid MPP service clearly matches the job (web search, scraping, enrichment, on-chain analytics), record it as an **escalation option**.

### 0C) Build a weighted corpus plan

Create a table (in text) of sources with weights and why:
- arXiv (academic grounding) — via `arxiv-mcp-server`
- on-chain analytics (flows/labels) — via `nansen-mcp-server` or MPP Nansen
- prediction-market market data (Polymarket) — via `coldvision-mcp-server`
- web/news (narrative + context) — free sources first; escalate to MPP search/scrape
- people/contacts (optional) — via `hunter-mcp-server` or MPP Hunter/StableEnrich

---

## Stage 1 — Parallel extraction

Run extraction in parallel by “lens” (each lens produces structured notes + citations):

### Lens A: Academic + theory
- Query arXiv with 2–4 targeted queries
- Pull abstracts for top hits
- Extract: key claims, methods, limitations, related work, keywords

### Lens B: Market + product reality (prediction markets)
- Pull relevant markets, timelines, notable volume/odds shifts
- Extract: market structure, participants, obvious manipulation vectors, oracle/settlement risks

### Lens C: On-chain + wallet intelligence
- Label key addresses, flows into/out of positions
- Extract: “who” (entities), “when” (timestamps), “how” (routes), confidence levels

### Lens D: Web context (free-first; MPP escalate if needed)
- Gather 5–15 high-signal links
- Extract: chronology, claims, contradictions, primary docs

Output format for each lens:
- `Findings[]` with `claim`, `evidence`, `source_id`, `confidence`, `notes`

---

## Stage 2 — Aggregation

- Normalize entities (people/orgs/addresses/markets)
- Dedupe near-duplicate claims
- Rank by impact × evidence strength
- Build a “claim graph”:
  - nodes: entities/claims
  - edges: supports/contradicts/depends_on

---

## Stage 3 — Synthesis

Produce:
- “best explanation” narrative
- top 5–10 findings with citations
- risks / unknowns / what to verify next
- alternative hypotheses and why they’re weaker

---

## Stage 4 — Output

Select output:
- **Academic**: use `research-paper` skill format
- **Narrative**: use `analytics-article` skill format

Always include:
- citations section
- a short “methods + provenance” appendix

