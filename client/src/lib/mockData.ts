export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

export const mockEmployees: any[] = [];
export const mockAttendance: any[] = [];
export const mockSpecialRules: any[] = [];

export async function mockFetch(url: string, options?: RequestInit): Promise<Response> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (url.includes('/api/employees')) {
    return new Response(JSON.stringify(mockEmployees), { status: 200 });
  }
  if (url.includes('/api/attendance')) {
    return new Response(JSON.stringify(mockAttendance), { status: 200 });
  }
  if (url.includes('/api/special-rules')) {
    return new Response(JSON.stringify(mockSpecialRules), { status: 200 });
  }
  if (url.includes('/api/attendance/calculate')) {
    return new Response(JSON.stringify({ success: true, processedCount: 0 }), { status: 200 });
  }
  
  return new Response(JSON.stringify({ message: 'Mock endpoint' }), { status: 200 });
}

export function getApiFetch() {
  return MOCK_MODE ? mockFetch : fetch;
}
