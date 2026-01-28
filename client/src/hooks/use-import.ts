import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";
import * as XLSX from "xlsx";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves';

export function useImportFile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, file }: { type: ImportType; file: File }) => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        if (type === "master") {
          const employees = rows.map(row => ({
            code: String(row.code || row.الكود || "").trim(),
            name: String(row.name || row.الاسم || "").trim(),
            department: String(row.department || row.القسم || ""),
            job: String(row.job || row.الوظيفة || ""),
            branch: String(row.branch || row.الفرع || ""),
          })).filter(e => e.code && e.name);
          
          for (const emp of employees) {
            await localStore.upsertEmployee(emp as any);
          }
        }
        // Add other types as needed
        return { success: true, count: rows.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: "تم الاستيراد بنجاح" });
    }
  });
}
