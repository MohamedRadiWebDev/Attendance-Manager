import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertSpecialRule, type SpecialRule } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";

export function useSpecialRules() {
  return useQuery<SpecialRule[]>({
    queryKey: [api.specialRules.list.path],
    queryFn: () => localStore.getSpecialRules(),
  });
}

export function useCreateSpecialRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertSpecialRule) => localStore.addSpecialRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialRules.list.path] });
      toast({
        title: "تمت الإضافة",
        description: "تم إضافة القاعدة بنجاح.",
      });
    },
  });
}

export function useDeleteSpecialRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => localStore.deleteSpecialRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialRules.list.path] });
      toast({
        title: "تم الحذف",
        description: "تم حذف القاعدة بنجاح.",
      });
    },
  });
}

export function useImportSpecialRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      // Stub for local import
      return { success: true, count: 0, errors: [] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialRules.list.path] });
    }
  });
}
