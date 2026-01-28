import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSpecialRule, type SpecialRule } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiFetch, MOCK_MODE, mockSpecialRules } from "@/lib/mockData";

export function useSpecialRules() {
  return useQuery<SpecialRule[]>({
    queryKey: [api.specialRules.list.path],
    queryFn: async () => {
      if (MOCK_MODE) return mockSpecialRules;
      const res = await fetch(api.specialRules.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب القواعد");
      return res.json();
    },
  });
}

export function useCreateSpecialRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSpecialRule) => {
      const res = await apiRequest(api.specialRules.create.method, api.specialRules.create.path, data);
      return res as unknown as SpecialRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialRules.list.path] });
      toast({
        title: "تمت الإضافة",
        description: "تم إضافة القاعدة بنجاح.",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر إضافة القاعدة.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSpecialRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertSpecialRule> }) => {
      const url = buildUrl(api.specialRules.update.path, { id });
      const res = await apiRequest(api.specialRules.update.method, url, data);
      return res as unknown as SpecialRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.specialRules.list.path] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث القاعدة بنجاح.",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر تحديث القاعدة.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSpecialRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.specialRules.delete.path, { id });
      await apiRequest(api.specialRules.delete.method, url);
    },
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
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.specialRules.import.path, {
        method: api.specialRules.import.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("فشل استيراد القواعد");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.specialRules.list.path] });
      toast({
        title: "تم الاستيراد",
        description: `تم استيراد ${data.count} قاعدة بنجاح.`,
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر استيراد القواعد.",
        variant: "destructive",
      });
    },
  });
}
