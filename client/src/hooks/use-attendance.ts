import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { localStore } from "@/lib/localStorage";
import { isValid, parseISO, format } from "date-fns";
import { type SpecialRule } from "@shared/schema";

const safeParseDate = (dateStr: string) => {
  if (!dateStr) return null;
  let date = parseISO(dateStr);
  if (isValid(date)) return date;
  date = new Date(dateStr);
  if (isValid(date)) return date;
  return null;
};

const safeFormatDate = (dateStr: string) => {
  const date = safeParseDate(dateStr);
  return date ? format(date, "yyyy-MM-dd") : null;
};

const isDateInRange = (targetStr: string, startStr: string, endStr: string) => {
  const target = safeParseDate(targetStr);
  const start = safeParseDate(startStr);
  const end = safeParseDate(endStr);
  if (!target || !start || !end) return false;
  return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
};

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
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
      const perms = await localStore.getAllPermissions();
      const rules = await localStore.getSpecialRules();
      
      const processedRecords = [];
      const allDates = new Set<string>();
      
      if (targetDate) {
        const formatted = safeFormatDate(targetDate);
        if (formatted) allDates.add(formatted);
      } else {
        punches.forEach(p => { const d = safeFormatDate(p.timestamp.split(' ')[0]); if (d) allDates.add(d); });
        missions.forEach(m => { const d = safeFormatDate(m.date); if (d) allDates.add(d); });
        leaves.forEach(l => { const d = safeFormatDate(l.startDate); if (d) allDates.add(d); });
      }

      for (const date of Array.from(allDates)) {
        const dayOfWeek = new Date(date).getDay(); // 0=Sun, 6=Sat
        for (const emp of employees) {
          const empPunches = punches.filter(p => safeFormatDate(p.timestamp.split(' ')[0]) === date && p.employeeCode === emp.code);
          const empMissions = missions.filter(m => safeFormatDate(m.date) === date && m.employeeCode === emp.code);
          const empLeaves = leaves.filter(l => l.employeeCode === emp.code && isDateInRange(date, l.startDate, l.endDate));
          // perms not used in calculation yet
          const empRules = rules.filter((r: SpecialRule) => r.scopeValues?.includes(emp.code) && (!r.dateFrom || isDateInRange(date, r.dateFrom, r.dateTo || r.dateFrom)));

          // Rule engine: Excused Not Present
          const isLeave = empLeaves.length > 0;
          const isMission = empMissions.length > 0;
          const isExempt = empRules.some(r => r.ruleType === 'attendance_exempt');
          const isRest = dayOfWeek === 5; // Friday
          const isSuppressed = isLeave || isMission || isExempt || isRest;

          // Shift Rules
          let shiftStart = emp.shiftStart || "08:00";
          let shiftEnd = "16:00";
          if (dayOfWeek === 6) { // Saturday
            shiftEnd = emp.job === "خدمات معاونة" ? "15:00" : "14:00"; 
          } else {
            shiftEnd = "16:00";
          }
          
          const sortedPunches = empPunches.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          let firstPunch = sortedPunches[0]?.timestamp.split(' ')[1] || (isMission ? "08:00" : null);
          let lastPunch = sortedPunches[sortedPunches.length - 1]?.timestamp.split(' ')[1] || (isMission ? "16:00" : null);

          // Penalty Calculation
          let latePenalty = 0;
          let earlyPenalty = 0;
          let missingStampPenalty = 0;
          let absencePenalty = 0;
          let penalties: any[] = [];

          if (!isSuppressed) {
            if (!firstPunch && !lastPunch) {
              absencePenalty = 2; // Absence * 2
              penalties.push({ type: 'absence', value: 2, reason: 'غياب بدون اذن' });
            } else if (firstPunch && lastPunch === firstPunch) {
              missingStampPenalty = 0.5;
              penalties.push({ type: 'missing_stamp', value: 0.5, reason: 'عدم بصمة' });
            } else {
              const lateness = Math.max(0, timeToMinutes(firstPunch!) - timeToMinutes(shiftStart));
              if (lateness > 60) latePenalty = 1;
              else if (lateness > 30) latePenalty = 0.5;
              else if (lateness > 15) latePenalty = 0.25;
              if (latePenalty > 0) penalties.push({ type: 'late', value: latePenalty, reason: `تأخير ${lateness} دقيقة` });

              const early = Math.max(0, timeToMinutes(shiftEnd) - timeToMinutes(lastPunch!));
              if (early > 5) {
                earlyPenalty = 0.5;
                penalties.push({ type: 'early', value: 0.5, reason: `انصراف مبكر ${early} دقيقة` });
              }
            }
          }

          const totalDeduction = latePenalty + earlyPenalty + missingStampPenalty + absencePenalty;

          processedRecords.push({
            employeeCode: emp.code,
            date: date,
            firstPunch,
            lastPunch,
            shiftStart,
            shiftEnd,
            isAbsent: absencePenalty > 0,
            isMission,
            isLeave,
            totalDeduction,
            totalOvertime: 0,
            logs: [`Audit: ${JSON.stringify({
              rawPunches: empPunches.map(p => p.timestamp),
              appliedMissions: empMissions.map(m => m.description),
              appliedLeaves: empLeaves.map(l => l.type),
              penalties,
              shiftUsed: { start: shiftStart, end: shiftEnd },
              notes: isSuppressed ? ["تم إسقاط الجزاءات لوجود عذر (إجازة/مأمورية/راحة)"] : []
            })}`]
          });
        }
      }
      if (processedRecords.length > 0) await localStore.saveDailyAttendance(processedRecords as any);
      return { success: true, processedCount: processedRecords.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({ title: "تم التحديث", description: `تمت معالجة ${data.processedCount} سجل بناءً على القواعد المعتمدة.` });
    },
  });
}

export function useExportAttendance() { return useMutation({ mutationFn: async () => localStore.getDailyAttendance() }); }
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
          "إجمالي الخصم": empAtt.reduce((sum, a) => sum + (a.totalDeduction || 0), 0),
        };
      });
    },
  });
}
