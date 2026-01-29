
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { localStore } from "./localStorage";

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
): Promise<Response> {
  const path = url.split("?")[0];

  // Purely Local Implementation - No actual network calls for /api
  let result: any = { message: "Success" };

  try {
    if (path === "/api/employees") {
      result = await localStore.upsertEmployee(data);
    } else if (path === "/api/punches/bulk") {
      await localStore.addPunches(data);
    } else if (path === "/api/attendance") {
      await localStore.saveDailyAttendance(data);
    } else if (path === "/api/missions/bulk") {
      await localStore.addMissions(data);
    } else if (path === "/api/permissions/bulk") {
      await localStore.addPermissions(data);
    } else if (path === "/api/leaves/bulk") {
      await localStore.addLeaves(data);
    } else if (path === "/api/special-rules") {
      result = await localStore.addSpecialRule(data);
    } else if (path.startsWith("/api/special-rules/")) {
      const id = parseInt(path.split("/").pop() || "0");
      await localStore.deleteSpecialRule(id);
    } else if (path === "/api/clear") {
      await localStore.clearAll();
    } else if (path === "/api/calculate") {
      // Logic for calculation moved to frontend
      result = { success: true, processedCount: 0 };
    }
  } catch (error) {
    console.error(`LocalStorage Error [${method} ${path}]:`, error);
    return new Response(JSON.stringify({ message: "Internal Error" }), { status: 500 });
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
    
    // Always return local data for /api paths
    if (path === "/api/employees") return await localStore.getEmployees();
    if (path === "/api/punches") return await localStore.getAllPunches();
    if (path === "/api/attendance") return await localStore.getDailyAttendance();
    if (path === "/api/missions") return await localStore.getAllMissions();
    if (path === "/api/permissions") return await localStore.getAllPermissions();
    if (path === "/api/leaves") return await localStore.getAllLeaves();
    if (path === "/api/special-rules") return await localStore.getSpecialRules();

    // Static assets fallback
    const res = await fetch(path);
    if (!res.ok) throw new Error("Not found");
    return res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({}),
      refetchOnWindowFocus: true,
      staleTime: 1000, // 1 second
      retry: false,
    },
  },
});
