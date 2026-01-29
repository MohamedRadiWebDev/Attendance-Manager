import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";

// Helper to check if a date falls within a range
const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
  const date = new Date(dateStr).getTime();
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  return date >= start && date <= end;
};

export function useAttendance(month?: string) {
  return useQuery({
    queryKey: [api.attendance.list.path, month],
    queryFn: async () => {
      const all = await localStore.getDailyAttendance();
      if (!month) return all;
      return all.filter(d => d.date.startsWith(month));
    },
  });
}

export function useCalculateAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetDate?: string) => {
      const employees = await localStore.getEmployees();
      const punches = await localStore.getAllPunches();
      const missions = await localStore.getAllMissions();
      const leaves = await localStore.getAllLeaves();
      const rules = await localStore.getSpecialRules();
      
      const processedRecords = [];
      // If no date provided, calculate for all dates found in punches/missions/leaves
      const allDates = new Set<string>();
      if (targetDate) {
        allDates.add(targetDate);
      } else {
        punches.forEach(p => allDates.add(p.timestamp.split(' ')[0]));
        missions.forEach(m => allDates.add(m.date));
        leaves.forEach(l => {
          // Simplified: just add start date, or we could iterate range
          allDates.add(l.startDate);
        });
      }

      for (const date of Array.from(allDates)) {
        for (const emp of employees) {
          const empPunches = punches.filter(p => p.employeeCode === emp.code && p.timestamp.startsWith(date));
          const empMissions = missions.filter(m => m.employeeCode === emp.code && m.date === date);
          const empLeaves = leaves.filter(l => l.employeeCode === emp.code && isDateInRange(date, l.startDate, l.endDate));
          
          if (empPunches.length > 0 || empMissions.length > 0 || empLeaves.length > 0) {
            const sortedPunches = empPunches.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            
            // Basic logic: Mission/Leave overrides punches
            const isLeave = empLeaves.length > 0;
            const isMission = empMissions.length > 0;
            
            let firstPunch = sortedPunches[0]?.timestamp.split(' ')[1] || null;
            let lastPunch = sortedPunches[sortedPunches.length - 1]?.timestamp.split(' ')[1] || null;

            if (isMission && !firstPunch) firstPunch = "08:00";
            if (isMission && !lastPunch) lastPunch = "16:00";

            processedRecords.push({
              employeeCode: emp.code,
              date: date,
              firstPunch,
              lastPunch,
              shiftStart: emp.shiftStart || "08:00",
              shiftEnd: emp.shiftEnd || "16:00",
              isAbsent: !isLeave && !isMission && empPunches.length === 0,
              isMission,
              isLeave,
              totalDeduction: 0,
              totalOvertime: 0,
              logs: [`Audit: ${JSON.stringify({
                rawPunches: empPunches.map(p => p.timestamp),
                appliedMissions: empMissions.map(m => m.description),
                appliedLeaves: empLeaves.map(l => l.type),
                date: date,
                notes: ["تم الربط التلقائي بين البصمات والمأموريات والإجازات"]
              })}`]
            });
          }
        }
      }
      
      if (processedRecords.length > 0) {
        await localStore.saveDailyAttendance(processedRecords as any);
      }
      
      return { success: true, processedCount: processedRecords.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "تم تحديث البيانات",
        description: `تمت معالجة ${data.processedCount} سجل وربطهم بكافة المديولات.`,
      });
    },
  });
}

export function useExportAttendance() {
  return useMutation({
    mutationFn: async () => {
      return await localStore.getDailyAttendance();
    },
  });
}

export function useExportSummary() {
  return useMutation({
    mutationFn: async () => {
      const attendance = await localStore.getDailyAttendance();
      const employees = await localStore.getEmployees();
      
      return employees.map(emp => {
        const empAtt = attendance.filter(a => a.employeeCode === emp.code);
        return {
          "كود الموظف": emp.code,
          "الاسم": emp.name,
          "أيام الحضور": empAtt.filter(a => !a.isAbsent).length,
          "أيام الغياب": empAtt.filter(a => a.isAbsent).length,
          "إجمالي التأخير": empAtt.reduce((sum, a) => sum + (a.latePenalty || 0), 0),
          "إجمالي الإضافي": empAtt.reduce((sum, a) => sum + (a.totalOvertime || 0), 0),
        };
      });
    },
  });
}
