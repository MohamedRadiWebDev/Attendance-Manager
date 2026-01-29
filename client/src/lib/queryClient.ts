
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { localStore } from "./localStorage";

export async function apiRequest(
  method: string,
  url: string,
  data?: any,
): Promise<Response> {
  const path = url.split("?")[0];
  console.log(`[DEBUG] API Request: ${method} ${path}`, data);

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
    } else if (path === "/api/leaves/bulk") {
      await localStore.addLeaves(data);
    } else if (path === "/api/special-rules") {
      result = await localStore.addSpecialRule(data);
    } else if (path === "/api/clear") {
      await localStore.clearAll();
    }
  } catch (error) {
    console.error(`[DEBUG] LocalStorage Error [${method} ${path}]:`, error);
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
    console.log(`[DEBUG] Query Fetching: ${path}`);
    
    let data: any;
    if (path === "/api/employees") data = await localStore.getEmployees();
    else if (path === "/api/punches") data = await localStore.getAllPunches();
    else if (path === "/api/attendance") data = await localStore.getDailyAttendance();
    else if (path === "/api/missions") data = await localStore.getAllMissions();
    else if (path === "/api/leaves") data = await localStore.getAllLeaves();
    else if (path === "/api/special-rules") data = await localStore.getSpecialRules();
    else {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    }

    console.log(`[DEBUG] Query Result for ${path}:`, data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({}),
      refetchInterval: 1000,
      staleTime: 0,
      retry: false,
    },
  },
});
