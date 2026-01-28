import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertEmployee, type Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: [api.employees.list.path],
    queryFn: () => localStore.getEmployees(),
  });
}

export function useUpsertEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertEmployee) => localStore.upsertEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.employees.list.path] });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ بيانات الموظف بنجاح.",
      });
    },
  });
}
