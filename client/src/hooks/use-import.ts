import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localStore } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { api } from "@shared/routes";
import { isValid, parse, format } from "date-fns";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves';

// Flexible column mapping
const MAPPINGS = {
  code: ["كود", "كود الموظف", "Code", "ID", "EmpCode", "رقم الموظف"],
  name: ["الاسم", "اسم الموظف", "Name", "Employee Name", "الاسـم"],
  timestamp: ["التاريخ والوقت", "تاريخ ووقت البصمة", "Timestamp", "Time", "التاريخ_والوقت", "وقت", "Check-in", "Check-out"],
  date: ["التاريخ", "تاريخ", "Date"],
  department: ["القسم", "ادارة", "Department", "الإدارة"],
  job: ["الوظيفة", "وظيفة", "Job", "المهنة"],
  branch: ["الفرع", "فرع", "Branch"],
  shiftStart: ["بداية الوردية", "ShiftStart", "بداية_الوردية", "الحضور"],
  shiftEnd: ["نهاية الوردية", "ShiftEnd", "نهاية_الوردية", "الانصراف"],
  description: ["الوصف", "المأمورية", "Description"],
  startDate: ["تاريخ البداية", "من تاريخ", "StartDate", "تاريخ_البداية"],
  endDate: ["تاريخ النهاية", "الى تاريخ", "EndDate", "تاريخ_النهاية"],
  type: ["نوع الاجازة", "النوع", "Type", "نوع_الاجازة"]
};

const getVal = (row: any, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
  }
  return "";
};

const parseExcelDate = (val: any) => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isValid(val)) return format(val, 'yyyy-MM-dd HH:mm:ss');
    return null;
  }
  if (typeof val === 'number') {
    try {
      const date = XLSX.utils.format_cell({ v: val, t: 'd' });
      const parsed = new Date(date);
      if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd HH:mm:ss');
    } catch (e) {}
  }
  const str = String(val).trim();
  const formats = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd HH:mm', 'dd/MM/yyyy HH:mm', 'MM/dd/yyyy HH:mm', 'yyyy-MM-dd', 'dd/MM/yyyy', 'M/d/yy HH:mm'];
  for (const f of formats) {
    try {
      const parsed = parse(str, f, new Date());
      if (isValid(parsed)) return format(parsed, f.includes('HH') ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd');
    } catch (e) {}
  }
  return str;
};

export function useImportFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ type, file }: { type: ImportType; file: File }) => {
      console.log(`[DEBUG] Import starting for ${type}`);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            console.log(`[DEBUG] Total rows in excel: ${jsonData.length}`);

            let count = 0;
            if (type === 'master') {
              for (const row of jsonData as any[]) {
                const code = getVal(row, MAPPINGS.code);
                if (!code) continue;
                await localStore.upsertEmployee({
                  code,
                  name: getVal(row, MAPPINGS.name),
                  department: getVal(row, MAPPINGS.department),
                  job: getVal(row, MAPPINGS.job),
                  branch: getVal(row, MAPPINGS.branch),
                  shiftStart: getVal(row, MAPPINGS.shiftStart) || "08:00",
                  shiftEnd: getVal(row, MAPPINGS.shiftEnd) || "16:00",
                } as any);
                count++;
              }
            } else if (type === 'punches') {
              const punches = (jsonData as any[]).map(row => ({
                employeeCode: getVal(row, MAPPINGS.code),
                timestamp: parseExcelDate(row[MAPPINGS.timestamp.find(k => row[k] !== undefined) || ""] || ""),
                location: "Excel Import",
                deviceId: "Manual"
              })).filter(p => p.employeeCode && p.timestamp);
              if (punches.length > 0) {
                await localStore.addPunches(punches as any);
                count = punches.length;
              }
            } else if (type === 'missions') {
              const missions = (jsonData as any[]).map(row => ({
                employeeCode: getVal(row, MAPPINGS.code),
                date: parseExcelDate(getVal(row, MAPPINGS.date)),
                description: getVal(row, MAPPINGS.description) || "مأمورية",
              })).filter(m => m.employeeCode && m.date);
              await localStore.addMissions(missions as any);
              count = missions.length;
            } else if (type === 'leaves') {
              const leaves = (jsonData as any[]).map(row => ({
                employeeCode: getVal(row, MAPPINGS.code),
                type: getVal(row, MAPPINGS.type) || "اعتيادي",
                startDate: parseExcelDate(getVal(row, MAPPINGS.startDate)),
                endDate: parseExcelDate(getVal(row, MAPPINGS.endDate)),
              })).filter(l => l.employeeCode && l.startDate);
              await localStore.addLeaves(leaves as any);
              count = leaves.length;
            }

            console.log(`[DEBUG] Import finished. Count: ${count}`);
            resolve({ count, errors: [] });
          } catch (err) {
            console.error("[DEBUG] Import error:", err);
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries();
      window.dispatchEvent(new Event('storage'));
      // Trigger calculation if punches or master were imported
      toast({ title: "تم الاستيراد بنجاح", description: `تم استيراد ${data.count} سجل.` });
    }
  });
}
