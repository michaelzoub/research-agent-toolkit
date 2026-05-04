# coldvision-mcp-server

MCP server wrapping the internal Coldvision API (Polymarket data, whale tracking, insider scoring).

## Config

Set:

- `COLDVISION_BASE_URL` (required) e.g. `https://coldvision.internal/api`
- `COLDVISION_API_KEY` (optional) if your internal API uses bearer auth

## Tools

- `coldvision_get_market`
- `coldvision_list_markets`
- `coldvision_get_whales`
- `coldvision_get_insider_score`

