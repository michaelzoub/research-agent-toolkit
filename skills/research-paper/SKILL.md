---
name: research-paper
description: >
  Produces academic-style research papers in Markdown or optional LaTeX with
  abstract, methodology, findings, discussion, and citations. Use when writing
  a paper, academic analysis, methodology section, or citation-grounded report.
---

# Research Paper (Output)

## What this skill does

Transforms an evidence set (notes + citations) into a research-paper style artifact suitable for sharing.

## Inputs (what you should ask for / infer)

- topic + research question
- target audience (technical / investor / generalist)
- evidence bundle (findings with citations)
- desired format: **Markdown** (default) or **LaTeX**

---

## Output (Markdown)

Use this structure:

1) **Title**
2) **Abstract** (150–250 words)
3) **Methodology**
   - sources (what, why)
   - selection criteria
   - limitations / bias
4) **Findings**
   - numbered claims
   - each claim cites 1–3 sources
5) **Discussion**
   - implications
   - counterarguments
   - uncertainty
6) **Citations**
   - stable identifiers + URLs where applicable

---

## Output (LaTeX option)

If LaTeX requested, emit:
- a single `.tex` document body
- bibliography as a simple `thebibliography` block (no BibTeX required)

---

## Citation rules (non-negotiable)

- Every non-trivial claim must have a citation.
- If evidence is weak/second-hand, mark confidence explicitly.
