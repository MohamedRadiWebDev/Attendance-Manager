import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";
import * as XLSX from "xlsx";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves' | 'attendance';

export function useImportFile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, file }: { type: ImportType; file: File }) => {
        console.log(`[DEBUG] Starting import for type: ${type}, file: ${file.name}`);
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        console.log(`[DEBUG] Total rows read from Excel: ${rows.length}`);
        if (rows.length > 0) {
          console.log(`[DEBUG] First row keys:`, Object.keys(rows[0]));
        }

        let processedCount = 0;

        if (type === "master") {
          const employees = rows.map(row => {
            const code = String(row.code || row.الكود || row["رقم الموظف"] || row["Employee Code"] || row["كود"] || "").trim();
            const name = String(row.name || row.الاسم || row["اسم الموظف"] || row["Employee Name"] || row["الاسم"] || "").trim();
            return {
              code,
              name,
              department: String(row.department || row.القسم || row.Department || ""),
              job: String(row.job || row.الوظيفة || row.Job || ""),
              branch: String(row.branch || row.الفرع || row.Branch || ""),
            };
          }).filter(e => e.code && e.name);
          
          for (const emp of employees) {
            await localStore.upsertEmployee(emp as any);
          }
          processedCount = employees.length;
        } else if (type === "punches") {
          const punches = rows.map(row => {
            const employeeCode = String(row.employeeCode || row.code || row.الكود || row["رقم الموظف"] || row["AC-No."] || row["كود"] || row["رقم_البصمة"] || "").trim();
            const timestamp = String(row.timestamp || row.time || row.الوقت || row["Date/Time"] || row["التاريخ_والوقت"] || row["وقت_البصمة"] || "");
            return {
              employeeCode,
              timestamp,
              originalValue: String(row.originalValue || row.value || ""),
            };
          }).filter(p => p.employeeCode && p.timestamp);
          
          await localStore.addPunches(punches as any[]);
          processedCount = punches.length;
        } else if (type === "missions") {
          const missions = rows.map(row => {
            const employeeCode = String(row.employeeCode || row.code || row.الكود || row["كود"] || row["رقم الموظف"] || "").trim();
            const date = String(row.date || row.التاريخ || row["تاريخ_المأمورية"] || "");
            return {
              employeeCode,
              date,
              startTime: String(row.startTime || row["وقت البداية"] || row["وقت_البداية"] || row["البداية"] || ""),
              endTime: String(row.endTime || row["وقت النهاية"] || row["وقت_النهاية"] || row["النهاية"] || ""),
              description: String(row.description || row.الوصف || row["ملاحظات"] || ""),
            };
          }).filter(m => m.employeeCode && m.date);
          
          await localStore.addMissions(missions as any[]);
          processedCount = missions.length;
        } else if (type === "leaves") {
          const leaves = rows.map(row => {
            const employeeCode = String(row.employeeCode || row.code || row.الكود || row["كود"] || row["رقم الموظف"] || "").trim();
            const startDate = String(row.startDate || row["تاريخ البداية"] || row["تاريخ_البداية"] || row["من"] || "");
            return {
              employeeCode,
              startDate,
              endDate: String(row.endDate || row["تاريخ النهاية"] || row["تاريخ_النهاية"] || row["إلى"] || row["الى"] || ""),
              type: String(row.type || row["نوع الاجازة"] || row["نوع_الاجازة"] || row["النوع"] || ""),
              details: String(row.details || row.ملاحظات || ""),
            };
          }).filter(l => l.employeeCode && l.startDate);
          
          await localStore.addLeaves(leaves as any[]);
          processedCount = leaves.length;
        } else if (type === "attendance") {
          const records = rows.map(row => {
            const employeeCode = String(row.employeeCode || row.code || row.الكود || row["كود"] || row["رقم الموظف"] || "").trim();
            const date = String(row.date || row.التاريخ || "");
            return {
              employeeCode,
              date,
              firstPunch: String(row.firstPunch || row.دخول || row["حضور"] || row["البصمة_الأولى"] || ""),
              lastPunch: String(row.lastPunch || row.خروج || row["انصراف"] || row["البصمة_الأخيرة"] || ""),
              shiftStart: String(row.shiftStart || ""),
              shiftEnd: String(row.shiftEnd || ""),
              isAbsent: row.isAbsent === "true" || row.isAbsent === true || row.غياب === "نعم",
              totalDeduction: Number(row.totalDeduction || row.الخصم || 0),
              totalOvertime: Number(row.totalOvertime || row.الإضافي || 0),
            };
          }).filter(r => r.employeeCode && r.date);
          
          await localStore.saveDailyAttendance(records as any[]);
          processedCount = records.length;
        }
        
        console.log(`[DEBUG] Import completed for ${type}. Final count saved: ${processedCount}`);
        return { success: true, count: processedCount, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({ 
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${data.count} سجل بنجاح في قسم ${data.type === 'master' ? 'الموظفين' : data.type === 'punches' ? 'البصمات' : data.type === 'missions' ? 'المأموريات' : 'الإجازات'}.`
      });
    },
    onError: (error) => {
      console.error("[DEBUG] Import Error:", error);
      toast({
        title: "فشل الاستيراد",
        description: "حدث خطأ أثناء معالجة الملف. تحقق من مسميات الأعمدة في الإكسيل.",
        variant: "destructive"
      });
    }
  });
}
