import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAttendance(month?: string) {
  return useQuery({
    queryKey: [api.attendance.list.path, month],
    queryFn: async () => {
      const url = month 
        ? buildUrl(api.attendance.list.path) + `?month=${month}`
        : api.attendance.list.path;
        
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب بيانات الحضور");
      return api.attendance.list.responses[200].parse(await res.json());
    },
  });
}

export function useCalculateAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.attendance.calculate.path, {
        method: api.attendance.calculate.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في عملية الاحتساب");
      return api.attendance.calculate.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      toast({
        title: "تمت العملية بنجاح",
        description: `تمت معالجة ${data.processedCount} سجل.`,
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء احتساب الحضور.",
        variant: "destructive",
      });
    },
  });
}

export function useExportAttendance() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.export.attendance.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تصدير البيانات");
      return await res.blob();
    },
  });
}

export function useExportSummary() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.export.summary.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تصدير الملخص");
      return await res.blob();
    },
  });
}
