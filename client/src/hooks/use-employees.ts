import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { getApiFetch, MOCK_MODE } from "@/lib/mockData";
import { enableOfflineMode, getEmployees as getOfflineEmployees, isOfflineModeEnabled } from "@/lib/offlineStore";

export function useEmployees() {
  return useQuery({
    queryKey: [api.employees.list.path],
    queryFn: async () => {
      if (isOfflineModeEnabled()) {
        return getOfflineEmployees();
      }
      const apiFetch = getApiFetch();
      try {
        const res = await apiFetch(api.employees.list.path, { credentials: "include" });
        if (!res.ok) throw new Error("فشل جلب بيانات الموظفين");
        const data = await res.json();
        return MOCK_MODE ? data : api.employees.list.responses[200].parse(data);
      } catch {
        enableOfflineMode();
        return getOfflineEmployees();
      }
    },
  });
}
