---
name: builder-finder
description: >
  Source potential builders/collaborators by combining Hunter contacts, GitHub activity, and on-chain footprint.
  Free-first, escalate to AgentCash enrichment (LinkedIn/social/etc.) when needed.
triggers:
  - "find builders"
  - "collaborators"
  - "reach out"
  - "shortlist"
---

# Builder Finder

## What this skill does

Builds a ranked shortlist of potential collaborators for a project, with context you can act on:
- who they are
- what they’ve built (GitHub signals)
- how to contact (Hunter)
- on-chain footprint (optional)
- confidence + why they’re a fit

## Free-first + paid escalation (AgentCash)

1) Start with free sources:
   - GitHub public activity (repos, commits, issues)
   - project websites/docs
2) Use Hunter for contact discovery/verification when you have a domain.
3) Escalate to AgentCash (stableenrich/stablesocial) only if:
   - identity resolution is ambiguous, or
   - contact paths are missing, or
   - you need LinkedIn/social enrichment for ranking.

## Inputs

- project description + role requirements
- desired geo/timezone (optional)
- target communities (Solana/EVM, prediction markets, MEV, etc.)

## Workflow

### Stage A — Candidate discovery

Generate candidates from:
- known OSS repos in the space
- conference talks / blog posts / research authors
- on-chain addresses linked to notable activity (if provided)

### Stage B — Evidence collection

For each candidate, collect:
- GitHub: top repos, recency, languages, stars/forks, issue/PR footprint
- Web: personal site, writing, talks
- Contact: domain → Hunter (emails + verification)
- On-chain: if address provided, label + notable interactions (via on-chain tooling)

### Stage C — Scoring + ranking

Score (0–5 each):
- relevance (domain match)
- demonstrated shipping velocity
- credibility (evidence quality)
- reachability (contactability)
- risk (unknowns, low-signal)

Output:
- top 10 ranked
- 10 “maybes”
- next steps (who to contact first, what to ask)

## Output format

- Shortlist table (name, handle, why fit, evidence links, contact, score)
- Followed by 1–2 paragraph briefs for top 5

