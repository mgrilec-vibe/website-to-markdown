const encoder = new TextEncoder();

/**
 * Return a model-agnostic, UTF-8-size-based token estimate for display only.
 */
export function estimateMarkdownTokens(markdown: string): number {
  return Math.ceil(encoder.encode(markdown).byteLength / 4);
}
