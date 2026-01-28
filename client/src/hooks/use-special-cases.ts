import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSpecialCase } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSpecialCases() {
  return useQuery({
    queryKey: [api.specialCases.list.path],
    queryFn: async () => {
      const res = await fetch(api.specialCases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب الحالات الخاصة");
      return api.specialCases.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSpecialCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSpecialCase) => {
      const res = await fetch(api.specialCases.create.path, {
        method: api.specialCases.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل إضافة الحالة الخاصة");
      return api.specialCases.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialCases.list.path] });
      toast({
        title: "تمت الإضافة",
        description: "تم إضافة الحالة الخاصة بنجاح.",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر إضافة الحالة الخاصة.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSpecialCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.specialCases.delete.path, { id });
      const res = await fetch(url, {
        method: api.specialCases.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل حذف الحالة");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialCases.list.path] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الحالة الخاصة بنجاح.",
      });
    },
  });
}
