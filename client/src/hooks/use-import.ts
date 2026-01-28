import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiFetch, MOCK_MODE } from "@/lib/mockData";
import { OFFLINE_MODE, addLeaves, addMissions, addPunches, upsertEmployees } from "@/lib/offlineStore";
import * as XLSX from "xlsx";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves';

export function useImportFile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, file }: { type: ImportType; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const url = buildUrl(api.import.upload.path, { type });
      const apiFetch = getApiFetch();

      const normalizeKey = (value: unknown) =>
        String(value ?? "")
          .replace(/\uFEFF/g, "")
          .trim()
          .replace(/[\s_]+/g, "")
          .toLowerCase();

      const buildRowIndex = (row: Record<string, unknown>) => {
        const index: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          index[normalizeKey(key)] = value;
        });
        return index;
      };

      const readRowValue = (rowIndex: Record<string, unknown>, candidates: string[]) => {
        for (const candidate of candidates) {
          const key = normalizeKey(candidate);
          if (key in rowIndex) return rowIndex[key];
        }
        return undefined;
      };

      const handleOfflineImport = async () => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        let processedCount = 0;
        const errors: string[] = [];

        if (type === "master") {
          const employees = rows.map((row) => {
            const rowIndex = buildRowIndex(row as Record<string, unknown>);
            const code = readRowValue(rowIndex, ["كود", "Code", "code", "الرقم", "الكود", "رقم الموظف"]);
            const name = readRowValue(rowIndex, ["الاسم", "Name", "name", "اسم الموظف"]);
            if (!code || !name) {
              errors.push(`صف بدون كود أو اسم`);
              return null;
            }
            processedCount += 1;
            return {
              code: String(code).trim(),
              name: String(name).trim(),
              department: readRowValue(rowIndex, ["القسم", "Department", "department"]) || "",
              section: readRowValue(rowIndex, ["القطاع", "Section"]) || "",
              job: readRowValue(rowIndex, ["الوظيفة", "Job", "job"]) || "",
              branch: readRowValue(rowIndex, ["الفرع", "Branch"]) || "",
              hireDate: readRowValue(rowIndex, ["تاريخ_التعيين", "تاريخ التعيين", "HireDate"]) || "",
              shiftStart: readRowValue(rowIndex, ["بداية_الوردية", "بداية الوردية", "ShiftStart"]) || "08:00",
              shiftEnd: readRowValue(rowIndex, ["نهاية_الوردية", "نهاية الوردية", "ShiftEnd"]) || "16:00",
            };
          });

          upsertEmployees(employees.filter(Boolean) as any[]);
        } else if (type === "punches") {
          const punches = rows.flatMap((row) => {
            const rowIndex = buildRowIndex(row as Record<string, unknown>);
            const code = readRowValue(rowIndex, ["كود", "AC-No.", "Code", "code", "الكود", "رقم الموظف"]);
            const timeRaw = readRowValue(rowIndex, ["التاريخ_والوقت", "التاريخ والوقت", "Time", "Date/Time", "الوقت", "DateTime"]);
            if (!code || !timeRaw) {
              if (!code) errors.push("صف بدون كود موظف");
              if (!timeRaw) errors.push("صف بدون تاريخ/وقت");
              return [];
            }

            let timestamp = "";
            if (typeof timeRaw === "number") {
              const date = XLSX.SSF.parse_date_code(timeRaw);
              timestamp = new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S).toISOString();
            } else {
              const parsed = new Date(timeRaw as string);
              if (!Number.isNaN(parsed.getTime())) {
                timestamp = parsed.toISOString();
              }
            }

            if (!timestamp) {
              errors.push(`تنسيق تاريخ غير صالح للموظف ${code}: ${timeRaw}`);
              return [];
            }

            processedCount += 1;
            return [
              {
                employeeCode: String(code).trim(),
                timestamp,
                originalValue: String(timeRaw),
              },
            ];
          });

          addPunches(punches);
        } else if (type === "missions") {
          const missions = rows.flatMap((row) => {
            const rowIndex = buildRowIndex(row as Record<string, unknown>);
            const code = readRowValue(rowIndex, ["كود", "Code", "الكود"]);
            const date = readRowValue(rowIndex, ["التاريخ", "Date"]);
            const startTime = readRowValue(rowIndex, ["وقت_البداية", "وقت البداية", "StartTime"]);
            const endTime = readRowValue(rowIndex, ["وقت_النهاية", "وقت النهاية", "EndTime"]);
            if (!code || !date) return [];
            processedCount += 1;
            return [
              {
                employeeCode: String(code).trim(),
                date: String(date),
                startTime: startTime || "",
                endTime: endTime || "",
                description: readRowValue(rowIndex, ["الوصف", "Description"]) || "",
              },
            ];
          });

          addMissions(missions);
        } else if (type === "leaves") {
          const leaves = rows.flatMap((row) => {
            const rowIndex = buildRowIndex(row as Record<string, unknown>);
            const code = readRowValue(rowIndex, ["كود", "Code", "الكود"]);
            const startDate = readRowValue(rowIndex, ["تاريخ_البداية", "تاريخ البداية", "StartDate"]);
            const endDate = readRowValue(rowIndex, ["تاريخ_النهاية", "تاريخ النهاية", "EndDate"]);
            const leaveType = readRowValue(rowIndex, ["نوع_الاجازة", "نوع الاجازة", "Type"]);
            if (!code || !startDate || !endDate) return [];
            processedCount += 1;
            return [
              {
                employeeCode: String(code).trim(),
                startDate: String(startDate),
                endDate: String(endDate),
                type: leaveType || "اجازة",
                details: readRowValue(rowIndex, ["ملاحظات", "Notes"]) || "",
              },
            ];
          });

          addLeaves(leaves);
        }

        return { success: true, count: processedCount, errors };
      };

      if (OFFLINE_MODE) {
        return handleOfflineImport();
      }

      try {
        const res = await apiFetch(url, {
          method: api.import.upload.method,
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("فشل رفع الملف");
        }
        const data = await res.json();
        return MOCK_MODE ? data : api.import.upload.responses[200].parse(data);
      } catch (error) {
        const data = await handleOfflineImport();
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.employees.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      
      if (data.count === 0) {
        toast({
          title: "لم يتم استيراد أي سجلات",
          description: "تحقق من أسماء الأعمدة في ملف Excel.",
          variant: "destructive",
        });
      } else if (data.errors && data.errors.length > 0) {
        toast({
          title: "تم الاستيراد مع وجود تحذيرات",
          description: `تمت معالجة ${data.count} سجل، ولكن وجدت بعض الأخطاء.`,
          variant: "default",
        });
      } else {
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تمت معالجة ${data.count} سجل بنجاح.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في الاستيراد",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
