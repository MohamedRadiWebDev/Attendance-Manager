import { useQuery } from "@tanstack/react-query";
import { localStore } from "@/lib/localStorage";
import { api } from "@shared/routes";
import { type Employee } from "@shared/schema";

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: [api.employees.list.path],
    queryFn: () => localStore.getEmployees(),
  });
}
