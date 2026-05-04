export type ResponseFormat = "markdown" | "json";

export function asMarkdownJsonFence(value: unknown): string {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

