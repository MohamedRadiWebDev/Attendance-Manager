import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useEmployees() {
  return useQuery({
    queryKey: [api.employees.list.path],
    queryFn: async () => {
      const res = await fetch(api.employees.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب بيانات الموظفين");
      return api.employees.list.responses[200].parse(await res.json());
    },
  });
}
