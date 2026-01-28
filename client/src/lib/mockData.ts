export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

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
  return MOCK_MODE ? mockFetch : fetch;
}
