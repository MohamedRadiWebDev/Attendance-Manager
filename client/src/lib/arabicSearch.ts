export function normalizeArabic(text: string): string {
  if (!text) return "";
  
  return text
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ة]/g, "ه")
    .replace(/[ى]/g, "ي")
    .replace(/[ؤ]/g, "و")
    .replace(/[ئ]/g, "ي")
    .trim()
    .toLowerCase();
}

export function buildSearchIndex(fields: (string | undefined | null)[]): string {
  return fields
    .filter(Boolean)
    .map(f => normalizeArabic(f as string))
    .join(" ");
}

export function matchesSearch(searchIndex: string, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeArabic(query);
  return searchIndex.includes(normalizedQuery);
}

export function createDebouncedSearch<T>(
  data: T[],
  buildIndex: (item: T) => string,
  callback: (filtered: T[]) => void,
  delay = 200
) {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (query: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (!query) {
        callback(data);
        return;
      }
      
      const normalizedQuery = normalizeArabic(query);
      const filtered = data.filter(item => {
        const index = buildIndex(item);
        return index.includes(normalizedQuery);
      });
      callback(filtered);
    }, delay);
  };
}
