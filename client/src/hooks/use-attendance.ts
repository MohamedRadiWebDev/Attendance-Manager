import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiFetch, MOCK_MODE } from "@/lib/mockData";
import { calculateAttendance as calculateOfflineAttendance, enableOfflineMode, exportAttendance, exportSummary, getAttendance as getOfflineAttendance, isOfflineModeEnabled } from "@/lib/offlineStore";

export function useAttendance(month?: string) {
  return useQuery({
    queryKey: [api.attendance.list.path, month],
    queryFn: async () => {
      const apiFetch = getApiFetch();
      const url = month 
        ? buildUrl(api.attendance.list.path) + `?month=${month}`
        : api.attendance.list.path;

      if (isOfflineModeEnabled()) {
        return getOfflineAttendance(month);
      }

      try {
        const res = await apiFetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("فشل في جلب بيانات الحضور");
        const data = await res.json();
        return MOCK_MODE ? data : api.attendance.list.responses[200].parse(data);
      } catch {
        enableOfflineMode();
        return getOfflineAttendance(month);
      }
    },
  });
}

export function useCalculateAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (isOfflineModeEnabled()) {
        const records = calculateOfflineAttendance();
        return { success: true, processedCount: records.length };
      }

      const apiFetch = getApiFetch();
      try {
        const res = await apiFetch(api.attendance.calculate.path, {
          method: api.attendance.calculate.method,
          credentials: "include",
        });
        if (!res.ok) throw new Error("فشل في عملية الاحتساب");
        const data = await res.json();
        return MOCK_MODE ? data : api.attendance.calculate.responses[200].parse(data);
      } catch {
        enableOfflineMode();
        const records = calculateOfflineAttendance();
        return { success: true, processedCount: records.length };
      }
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
      if (isOfflineModeEnabled()) {
        return exportAttendance();
      }
      const apiFetch = getApiFetch();
      try {
        const res = await apiFetch(api.export.attendance.path, { credentials: "include" });
        if (!res.ok) throw new Error("فشل تصدير البيانات");
        return await res.blob();
      } catch {
        enableOfflineMode();
        return exportAttendance();
      }
    },
  });
}

export function useExportSummary() {
  return useMutation({
    mutationFn: async () => {
      if (isOfflineModeEnabled()) {
        return exportSummary();
      }
      const apiFetch = getApiFetch();
      try {
        const res = await apiFetch(api.export.summary.path, { credentials: "include" });
        if (!res.ok) throw new Error("فشل تصدير الملخص");
        return await res.blob();
      } catch {
        enableOfflineMode();
        return exportSummary();
      }
    },
  });
}
