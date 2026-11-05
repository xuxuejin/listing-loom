/** Remove Markdown presentation markers while preserving the listing copy. */
export function sanitizeListingText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\*{1,3}([^*\n]+?)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_\n]+?)_{1,3}/g, '$1')
    .replace(/~~([^~\n]+?)~~/g, '$1')
    .replace(/`{1,3}([^`\n]+?)`{1,3}/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
