const rawBaseUrl = "";

const normalizedBaseUrl = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl;

export function buildApiUrl(path: string): string {
  if (!normalizedBaseUrl || path.startsWith("http")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${normalizedBaseUrl}${path}`;
  }
  return `${normalizedBaseUrl}/${path}`;
}
