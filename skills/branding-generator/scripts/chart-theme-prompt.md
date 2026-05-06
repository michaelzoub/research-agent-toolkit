# Copy-paste prompt: research chart theme (heatmap + bar)

Use this verbatim (or attach your data) when asking another agent to generate Matplotlib, Vega-Lite, React/SVG, or similar.

---

**Prompt:**

Create research charts in a **minimal, editorial** style using this **exact palette** (do not substitute near-greens or near-corals):

### Lifecycle heatmap / matrix (discrete 3-level cells)

- **Page / outer background:** `#F9F7F2`
- **Chart card background:** `#FFFFFF` with **1px** border `#E8E4DC`
- **Cell score 0 (absent):** `#EFEBE0` — rounded rect “pill”, generous padding/gutter between cells
- **Cell score 1 (partial / supporting):** `#80CBC4`
- **Cell score 2 (central capability):** `#EF6C51`
- **Gutter between pills:** match outer background `#F9F7F2` (so pills read as floating tiles)

### Typography (all chart text)

- **Primary text color (title, axis, row names, ticks, legend):** `#8B5A2B` (dark bronze; not black)
- **Secondary / meta line:** same hue at ~65–78% opacity, or `rgba(139, 90, 43, 0.65)` to `rgba(139, 90, 43, 0.78)`
- **Font:** clean geometric sans (system UI / Inter-like), title **bold** large, axis labels medium weight

### Grouped bar chart (when comparing two series)

- **Primary bars:** `#C87137` (burnt orange / terracotta)
- **Secondary bars:** `#E6B87D` (muted sandy tan)
- **All labels, title, tick values:** `#8B5A2B`
- **Plot background:** `#FFFFFF`
- **Horizontal grid only:** very light gray (e.g. `#ECEAE6` at low opacity), no vertical grid
- **Bars:** sharp corners, **no** stroke on bars

### Legend (heatmap)

Place bottom-left: three small rounded swatches using `#EFEBE0`, `#80CBC4`, `#EF6C51` with labels “0 absent”, “1 partial/supporting”, “2 central capability”.

### Deliverable

Export **SVG** (preferred) or **PNG** @2×; embed fonts as text (SVG), keep margins generous.

---

**Token summary (for quick pastes):**

`#F9F7F2` `#FFFFFF` `#E8E4DC` `#EFEBE0` `#80CBC4` `#EF6C51` `#8B5A2B` `#C87137` `#E6B87D` `#ECEAE6`
