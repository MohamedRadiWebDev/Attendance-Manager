import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiFetch, MOCK_MODE } from "@/lib/mockData";

export function useAttendance(month?: string) {
  return useQuery({
    queryKey: [api.attendance.list.path, month],
    queryFn: async () => {
      const apiFetch = getApiFetch();
      const url = month 
        ? buildUrl(api.attendance.list.path) + `?month=${month}`
        : api.attendance.list.path;
        
      const res = await apiFetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب بيانات الحضور");
      const data = await res.json();
      return MOCK_MODE ? data : api.attendance.list.responses[200].parse(data);
    },
  });
}

export function useCalculateAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const apiFetch = getApiFetch();
      const res = await apiFetch(api.attendance.calculate.path, {
        method: api.attendance.calculate.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل في عملية الاحتساب");
      const data = await res.json();
      return MOCK_MODE ? data : api.attendance.calculate.responses[200].parse(data);
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
      const apiFetch = getApiFetch();
      const res = await apiFetch(api.export.attendance.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تصدير البيانات");
      return await res.blob();
    },
  });
}

export function useExportSummary() {
  return useMutation({
    mutationFn: async () => {
      const apiFetch = getApiFetch();
      const res = await apiFetch(api.export.summary.path, { credentials: "include" });
      if (!res.ok) throw new Error("فشل تصدير الملخص");
      return await res.blob();
    },
  });
}
