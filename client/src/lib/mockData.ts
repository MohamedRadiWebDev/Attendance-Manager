import * as XLSX from "xlsx";

const mockEnv = import.meta.env.VITE_MOCK_MODE;
export const MOCK_MODE = mockEnv ? mockEnv === "true" : true;

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

async function parseImportFile(options?: RequestInit) {
  if (!options?.body || !(options.body instanceof FormData)) {
    return { count: 0, errors: ["No file provided"] };
  }
  const file = options.body.get("file");
  if (!(file instanceof File)) {
    return { count: 0, errors: ["Invalid file"] };
  }
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  return { count: rows.length, errors: [] };
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
    const importResult = await parseImportFile(options);
    return jsonResponse({ success: true, ...importResult });
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
