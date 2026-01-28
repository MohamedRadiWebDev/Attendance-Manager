
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { localStore } from "./localStorage";

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
): Promise<Response> {
  let result: any;
  const path = url.split("?")[0];

  console.log(`API Request: ${method} ${path}`, data);

  // Map Requests to LocalStorage
  if (path === "/api/employees" && (method === "POST" || method === "PATCH")) {
    result = await localStore.upsertEmployee(data);
  } else if (path === "/api/punches/bulk" && method === "POST") {
    await localStore.addPunches(data);
    result = { message: "Success" };
  } else if (path === "/api/attendance" && method === "POST") {
    await localStore.saveDailyAttendance(data);
    result = { message: "Success" };
  } else if (path === "/api/missions/bulk" && method === "POST") {
    await localStore.addMissions(data);
    result = { message: "Success" };
  } else if (path === "/api/permissions/bulk" && method === "POST") {
    await localStore.addPermissions(data);
    result = { message: "Success" };
  } else if (path === "/api/leaves/bulk" && method === "POST") {
    await localStore.addLeaves(data);
    result = { message: "Success" };
  } else if (path === "/api/special-rules" && method === "POST") {
    result = await localStore.addSpecialRule(data);
  } else if (path.startsWith("/api/special-rules/") && method === "DELETE") {
    const id = parseInt(path.split("/").pop() || "0");
    await localStore.deleteSpecialRule(id);
    result = { message: "Success" };
  } else if (path === "/api/clear" && method === "POST") {
    await localStore.clearAll();
    result = { message: "Success" };
  } else {
    // Fallback if some endpoint is not mapped
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    return res;
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

export const getQueryFn: <T>(options: any) => QueryFunction<T> =
  () =>
  async ({ queryKey }) => {
    const path = queryKey[0] as string;
    let data: any;

    console.log(`Query Fetch: ${path}`);

    if (path === "/api/employees") data = await localStore.getEmployees();
    else if (path === "/api/punches") data = await localStore.getAllPunches();
    else if (path === "/api/attendance") data = await localStore.getDailyAttendance();
    else if (path === "/api/missions") data = await localStore.getAllMissions();
    else if (path === "/api/permissions") data = await localStore.getAllPermissions();
    else if (path === "/api/leaves") data = await localStore.getAllLeaves();
    else if (path === "/api/special-rules") data = await localStore.getSpecialRules();
    else {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    }

    console.log(`Query Result for ${path}:`, data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: 1000, // Frequent polling for local storage changes
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
