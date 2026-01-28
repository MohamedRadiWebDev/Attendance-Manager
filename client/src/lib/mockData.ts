import { buildApiUrl } from "@/lib/api";

export const MOCK_MODE = false;

export const mockEmployees: any[] = [];
export const mockAttendance: any[] = [];
export const mockSpecialRules: any[] = [];

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export async function mockFetch(url: string, options?: RequestInit): Promise<Response> {
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (url.includes("/api/attendance/calculate")) {
    return jsonResponse({ success: true, processedCount: 0 });
  }
  if (url.includes("/api/import/clear")) {
    return jsonResponse({ success: true });
  }
  if (url.includes("/api/import/")) {
    return jsonResponse({ success: true, count: 0, errors: [] });
  }
  if (url.includes("/api/employees")) {
    return jsonResponse(mockEmployees);
  }
  if (url.includes("/api/attendance")) {
    return jsonResponse(mockAttendance);
  }
  if (url.includes("/api/special-rules")) {
    return jsonResponse(mockSpecialRules);
  }
  if (url.includes("/api/export/")) {
    return new Response(new Blob([]), { status: 200 });
  }

  return jsonResponse({ message: "Mock endpoint" });
}

export function getApiFetch() {
  if (MOCK_MODE) {
    return mockFetch;
  }
  return (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      return fetch(buildApiUrl(input), init);
    }
    const url = input instanceof Request ? input.url : input.toString();
    const request = input instanceof Request ? input : new Request(input);
    return fetch(new Request(buildApiUrl(url), request), init ?? request);
  };
}
