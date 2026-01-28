import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSpecialRule, type SpecialRule } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiFetch, MOCK_MODE, mockSpecialRules } from "@/lib/mockData";
import {
  addSpecialRules,
  deleteSpecialRule,
  enableOfflineMode,
  getSpecialRules as getOfflineSpecialRules,
  isOfflineModeEnabled,
  updateSpecialRule,
} from "@/lib/offlineStore";
import * as XLSX from "xlsx";

export function useSpecialRules() {
  return useQuery<SpecialRule[]>({
    queryKey: [api.specialRules.list.path],
    queryFn: async () => {
      if (MOCK_MODE) return mockSpecialRules;
      if (isOfflineModeEnabled()) return getOfflineSpecialRules();
      const apiFetch = getApiFetch();
      try {
        const res = await apiFetch(api.specialRules.list.path, { credentials: "include" });
        if (!res.ok) throw new Error("فشل جلب القواعد");
        return res.json();
      } catch {
        enableOfflineMode();
        return getOfflineSpecialRules();
      }
    },
  });
}

export function useCreateSpecialRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSpecialRule) => {
      if (isOfflineModeEnabled()) {
        addSpecialRules([data]);
        return data as unknown as SpecialRule;
      }
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
      if (isOfflineModeEnabled()) {
        updateSpecialRule(id, data);
        return { id, ...data } as SpecialRule;
      }
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
      if (isOfflineModeEnabled()) {
        deleteSpecialRule(id);
        return;
      }
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

      const parseOfflineRules = async () => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const rules: InsertSpecialRule[] = [];
        const errors: string[] = [];

        rows.forEach((row) => {
          const name = row["name"] || row["الاسم"];
          const ruleType = row["ruleType"] || row["نوع_القاعدة"];
          const dateFrom = row["dateFrom"] || row["من_تاريخ"];
          const dateTo = row["dateTo"] || row["إلى_تاريخ"];
          const scopeType = row["scopeType"] || row["نوع_النطاق"] || "all";

          if (!name || !ruleType || !dateFrom || !dateTo) {
            errors.push(`صف غير مكتمل: ${JSON.stringify(row).substring(0, 80)}`);
            return;
          }

          let params = {};
          const paramsJson = row["params_json"] || row["البارامترات"];
          if (paramsJson) {
            try {
              params = JSON.parse(paramsJson);
            } catch {
              errors.push(`JSON غير صالح في params_json للقاعدة: ${name}`);
              return;
            }
          }

          const scopeValuesRaw = row["scopeValues"] || row["قيم_النطاق"] || "";
          const scopeValues = scopeValuesRaw
            ? String(scopeValuesRaw)
                .split(",")
                .map((s: string) => s.trim())
            : [];

          const daysRaw = row["daysOfWeek"] || row["أيام_الأسبوع"] || "";
          const daysOfWeek = daysRaw
            ? String(daysRaw)
                .split(",")
                .map((d: string) => parseInt(d.trim(), 10))
                .filter((n: number) => !Number.isNaN(n))
            : [];

          rules.push({
            name: String(name),
            enabled: row["enabled"] !== false && row["enabled"] !== "false" && row["مفعل"] !== "لا",
            priority: parseInt(row["priority"] || row["الأولوية"] || "0", 10) || 0,
            scopeType: String(scopeType),
            scopeValues: scopeValues.length > 0 ? scopeValues : null,
            dateFrom: String(dateFrom),
            dateTo: String(dateTo),
            daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null,
            ruleType: String(ruleType),
            params,
            notes: row["notes"] || row["ملاحظات"] || null,
          });
        });

        addSpecialRules(rules);
        return { success: true, count: rules.length, errors };
      };

      if (isOfflineModeEnabled()) {
        return parseOfflineRules();
      }

      const apiFetch = getApiFetch();
      try {
        const res = await apiFetch(api.specialRules.import.path, {
          method: api.specialRules.import.method,
          body: formData,
          credentials: "include",
        });

        if (!res.ok) throw new Error("فشل استيراد القواعد");
        return res.json();
      } catch {
        enableOfflineMode();
        return parseOfflineRules();
      }
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
