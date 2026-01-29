import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";
import * as XLSX from "xlsx";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves' | 'attendance';

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
            code: String(row.code || row.الكود || row["رقم الموظف"] || row["Employee Code"] || "").trim(),
            name: String(row.name || row.الاسم || row["اسم الموظف"] || row["Employee Name"] || "").trim(),
            department: String(row.department || row.القسم || row.Department || ""),
            job: String(row.job || row.الوظيفة || row.Job || ""),
            branch: String(row.branch || row.الفرع || row.Branch || ""),
          })).filter(e => e.code && e.name);
          
          for (const emp of employees) {
            await localStore.upsertEmployee(emp as any);
          }
        } else if (type === "punches") {
          const punches = rows.map(row => ({
            employeeCode: String(row.employeeCode || row.code || row.الكود || row["رقم الموظف"] || row["AC-No."] || "").trim(),
            timestamp: String(row.timestamp || row.time || row.الوقت || row["Date/Time"] || ""),
            originalValue: String(row.originalValue || row.value || ""),
          })).filter(p => p.employeeCode && p.timestamp);
          
          await localStore.addPunches(punches as any[]);
        } else if (type === "missions") {
          const missions = rows.map(row => ({
            employeeCode: String(row.employeeCode || row.code || row.الكود || "").trim(),
            date: String(row.date || row.التاريخ || ""),
            startTime: String(row.startTime || row["وقت البداية"] || ""),
            endTime: String(row.endTime || row["وقت النهاية"] || ""),
            description: String(row.description || row.الوصف || ""),
          })).filter(m => m.employeeCode && m.date);
          
          await localStore.addMissions(missions as any[]);
        } else if (type === "leaves") {
          const leaves = rows.map(row => ({
            employeeCode: String(row.employeeCode || row.code || row.الكود || "").trim(),
            startDate: String(row.startDate || row["تاريخ البداية"] || ""),
            endDate: String(row.endDate || row["تاريخ النهاية"] || ""),
            type: String(row.type || row["نوع الاجازة"] || ""),
            details: String(row.details || row.ملاحظات || ""),
          })).filter(l => l.employeeCode && l.startDate);
          
          await localStore.addLeaves(leaves as any[]);
        } else if (type === "attendance") {
          const records = rows.map(row => ({
            employeeCode: String(row.employeeCode || row.code || row.الكود || "").trim(),
            date: String(row.date || row.التاريخ || ""),
            firstPunch: String(row.firstPunch || row.دخول || ""),
            lastPunch: String(row.lastPunch || row.خروج || ""),
            shiftStart: String(row.shiftStart || ""),
            shiftEnd: String(row.shiftEnd || ""),
            isAbsent: Boolean(row.isAbsent),
            totalDeduction: Number(row.totalDeduction || 0),
            totalOvertime: Number(row.totalOvertime || 0),
          })).filter(r => r.employeeCode && r.date);
          
          await localStore.saveDailyAttendance(records as any[]);
        }
        
        // Return details for toast
        return { success: true, count: rows.length, type };
    },
    onSuccess: (data) => {
      // Force immediate invalidation of all related queries
      queryClient.invalidateQueries();
      
      toast({ 
        title: "تم الاستيراد بنجاح",
        description: `تم استيراد ${data.count} سجل من نوع ${data.type}`
      });
    },
    onError: (error) => {
      console.error("Import Error:", error);
      toast({
        title: "فشل الاستيراد",
        description: "حدث خطأ أثناء معالجة الملف. تأكد من صحة البيانات.",
        variant: "destructive"
      });
    }
  });
}
