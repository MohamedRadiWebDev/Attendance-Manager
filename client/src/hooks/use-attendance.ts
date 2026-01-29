import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";

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
    mutationFn: async () => {
      const employees = await localStore.getEmployees();
      const punches = await localStore.getAllPunches();
      const missions = await localStore.getAllMissions();
      const leaves = await localStore.getAllLeaves();
      const rules = await localStore.getSpecialRules();
      
      // Implement basic calculation logic for offline mode
      const processedRecords = [];
      const today = new Date().toISOString().split('T')[0];
      
      for (const emp of employees) {
        const empPunches = punches.filter(p => p.employeeCode === emp.code && p.timestamp.startsWith(today));
        const empMissions = missions.filter(m => m.employeeCode === emp.code && m.date === today);
        const empLeaves = leaves.filter(l => l.employeeCode === emp.code && today >= l.startDate && today <= l.endDate);
        
        if (empPunches.length > 0 || empMissions.length > 0 || empLeaves.length > 0) {
          const sortedPunches = empPunches.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          const firstPunch = sortedPunches[0]?.timestamp.split(' ')[1] || (empMissions.length > 0 ? "08:00" : null);
          const lastPunch = sortedPunches[sortedPunches.length - 1]?.timestamp.split(' ')[1] || (empMissions.length > 0 ? "16:00" : null);
          
          processedRecords.push({
            employeeCode: emp.code,
            date: today,
            firstPunch,
            lastPunch,
            shiftStart: emp.shiftStart || "08:00",
            shiftEnd: emp.shiftEnd || "16:00",
            isAbsent: empPunches.length === 0 && empMissions.length === 0 && empLeaves.length === 0,
            isMission: empMissions.length > 0,
            isLeave: empLeaves.length > 0,
            totalDeduction: 0,
            totalOvertime: 0,
            logs: [`Audit: ${JSON.stringify({
              rawPunches: empPunches.map(p => p.timestamp),
              appliedMissions: empMissions.map(m => m.description),
              appliedLeaves: empLeaves.map(l => l.type),
              appliedRules: [],
              shiftUsed: { start: emp.shiftStart || "08:00", end: emp.shiftEnd || "16:00" },
              firstStampSource: empPunches.length > 0 ? "biometric" : "mission",
              lastStampSource: empPunches.length > 0 ? "biometric" : "mission",
              penalties: [],
              overtimeDetails: [],
              notes: ["تم الاحتساب آلياً في وضع الأوفلاين"]
            })}`]
          });
        }
      }
      
      if (processedRecords.length > 0) {
        await localStore.saveDailyAttendance(processedRecords as any);
      }
      
      return { success: true, processedCount: processedRecords.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      toast({
        title: "تمت العملية بنجاح",
        description: `تمت معالجة ${data.processedCount} سجل.`,
        variant: "default",
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
