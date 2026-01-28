import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useEmployees() {
  return useQuery({
    queryKey: [api.employees.list.path],
  });
}
