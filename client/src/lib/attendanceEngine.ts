import { differenceInMinutes, format, isFriday, isSaturday, parse, addDays } from "date-fns";
import type {
  AuditTrace,
  DailyAttendance,
  Employee,
  Leave,
  Mission,
  Punch,
  SpecialRule,
} from "@shared/schema";

type RuleContext = {
  employee: Employee;
  date: string;
  dayOfWeek: number;
};

type RuleEffect = {
  customShift?: { start: string; end: string };
  attendanceExempt?: { countAsPresent: boolean; exemptPenalties: boolean };
  penaltyOverride?: {
    latePenalty?: number | "IGNORE";
    earlyPenalty?: number | "IGNORE";
    absencePenalty?: number | "IGNORE";
  };
  ignoreBiometric?: boolean;
  overnightOvertime?: { allowNextDayCheckout: boolean; maxOvernightHours: number };
};

type AppliedRule = { rule: SpecialRule; effect: RuleEffect };

function matchesScope(rule: SpecialRule, employee: Employee): boolean {
  const scopeValues = rule.scopeValues || [];

  switch (rule.scopeType) {
    case "all":
      return true;
    case "employee":
      return scopeValues.includes(employee.code);
    case "department":
      return employee.department ? scopeValues.includes(employee.department) : false;
    case "branch":
      return employee.branch ? scopeValues.includes(employee.branch) : false;
    default:
      return false;
  }
}

function matchesDateRange(rule: SpecialRule, date: string): boolean {
  return date >= rule.dateFrom && date <= rule.dateTo;
}

function matchesDayOfWeek(rule: SpecialRule, dayOfWeek: number): boolean {
  if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return true;
  return rule.daysOfWeek.includes(dayOfWeek);
}

function parseEffect(rule: SpecialRule): RuleEffect {
  const params = (rule.params as Record<string, unknown>) || {};
  const effect: RuleEffect = {};

  switch (rule.ruleType) {
    case "CUSTOM_SHIFT":
      effect.customShift = {
        start: (params.shiftStart as string) || "08:00",
        end: (params.shiftEnd as string) || "16:00",
      };
      break;
    case "ATTENDANCE_EXEMPT":
      effect.attendanceExempt = {
        countAsPresent: params.countAsPresent === true,
        exemptPenalties: params.exemptPenalties !== false,
      };
      break;
    case "PENALTY_OVERRIDE":
      effect.penaltyOverride = {
        latePenalty: params.latePenalty as number | "IGNORE" | undefined,
        earlyPenalty: params.earlyPenalty as number | "IGNORE" | undefined,
        absencePenalty: params.absencePenalty as number | "IGNORE" | undefined,
      };
      break;
    case "IGNORE_BIOMETRIC":
      effect.ignoreBiometric = params.ignore !== false;
      break;
    case "OVERTIME_OVERNIGHT":
      effect.overnightOvertime = {
        allowNextDayCheckout: params.allowNextDayCheckout === true,
        maxOvernightHours: (params.maxOvernightHours as number) || 24,
      };
      break;
  }

  return effect;
}

function getApplicableRules(rules: SpecialRule[], ctx: RuleContext): AppliedRule[] {
  const applicable: AppliedRule[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!matchesScope(rule, ctx.employee)) continue;
    if (!matchesDateRange(rule, ctx.date)) continue;
    if (!matchesDayOfWeek(rule, ctx.dayOfWeek)) continue;

    applicable.push({ rule, effect: parseEffect(rule) });
  }

  return applicable.sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0));
}

function mergeEffects(appliedRules: AppliedRule[]): RuleEffect {
  const merged: RuleEffect = {};

  appliedRules.forEach(({ effect }) => {
    if (effect.customShift && !merged.customShift) merged.customShift = effect.customShift;
    if (effect.attendanceExempt && !merged.attendanceExempt) merged.attendanceExempt = effect.attendanceExempt;
    if (effect.penaltyOverride) {
      merged.penaltyOverride = { ...merged.penaltyOverride, ...effect.penaltyOverride };
    }
    if (effect.ignoreBiometric && !merged.ignoreBiometric) merged.ignoreBiometric = effect.ignoreBiometric;
    if (effect.overnightOvertime && !merged.overnightOvertime) {
      merged.overnightOvertime = effect.overnightOvertime;
    }
  });

  return merged;
}

function buildAuditRules(appliedRules: AppliedRule[]): AuditTrace["appliedRules"] {
  return appliedRules.map(({ rule }) => ({
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.ruleType,
    priority: rule.priority ?? 0,
  }));
}

export function calculateAttendanceRecords(params: {
  employees: Employee[];
  punches: Punch[];
  missions: Mission[];
  leaves: Leave[];
  specialRules: SpecialRule[];
}): DailyAttendance[] {
  const punchMap = new Map<string, string[]>();
  const dates = new Set<string>();

  params.punches.forEach((punch) => {
    const [date, time] = punch.timestamp.split("T");
    if (!date || !time) return;
    const key = `${punch.employeeCode}_${date}`;
    if (!punchMap.has(key)) {
      punchMap.set(key, []);
    }
    punchMap.get(key)?.push(punch.timestamp);
    dates.add(date);
  });

  const results: DailyAttendance[] = [];
  const dateList = Array.from(dates);

  params.employees.forEach((employee) => {
    dateList.forEach((dateStr) => {
      const key = `${employee.code}_${dateStr}`;
      const punches = (punchMap.get(key) || []).sort();
      const dateObj = parse(dateStr, "yyyy-MM-dd", new Date());
      const dayOfWeek = dateObj.getDay();

      const ruleCtx: RuleContext = { employee, date: dateStr, dayOfWeek };
      const appliedRules = getApplicableRules(params.specialRules, ruleCtx);
      const mergedEffect = mergeEffects(appliedRules);

      const audit: AuditTrace = {
        rawPunches: punches,
        appliedMissions: [],
        appliedPermissions: [],
        appliedLeaves: [],
        appliedRules: buildAuditRules(appliedRules),
        shiftUsed: { start: "", end: "" },
        firstStampSource: "biometric",
        lastStampSource: "biometric",
        penalties: [],
        overtimeDetails: [],
        notes: [],
      };

      const logs: string[] = [];

      let usePunches = punches;
      if (mergedEffect.ignoreBiometric) {
        usePunches = [];
        audit.notes.push("Biometric ignored by rule");
      }

      let shiftStartStr = employee.shiftStart || "08:00";
      let shiftEndStr = employee.shiftEnd || "16:00";

      if (mergedEffect.customShift) {
        shiftStartStr = mergedEffect.customShift.start;
        shiftEndStr = mergedEffect.customShift.end;
      } else if (isSaturday(dateObj)) {
        const isService = employee.job?.includes("خدمات معاونة");
        if (shiftStartStr === "08:00") {
          shiftEndStr = isService ? "15:00" : "14:00";
        }
      }

      audit.shiftUsed = { start: shiftStartStr, end: shiftEndStr };

      let checkIn = usePunches.length > 0 ? usePunches[0].split("T")[1].substring(0, 5) : null;
      let checkOut = usePunches.length > 0 ? usePunches[usePunches.length - 1].split("T")[1].substring(0, 5) : null;

      const missions = params.missions.filter((m) => m.employeeCode === employee.code && m.date === dateStr);
      if (missions.length > 0) {
        audit.appliedMissions = missions.map((m) => `${m.startTime}-${m.endTime}: ${m.description}`);
        if (missions[0].startTime && (!checkIn || missions[0].startTime < checkIn)) {
          checkIn = missions[0].startTime;
          audit.firstStampSource = "mission";
        }
        if (missions[0].endTime && (!checkOut || missions[0].endTime > checkOut)) {
          checkOut = missions[0].endTime;
          audit.lastStampSource = "mission";
        }
      }

      const leaves = params.leaves.filter(
        (leave) => leave.employeeCode === employee.code && dateStr >= leave.startDate && dateStr <= leave.endDate,
      );
      audit.appliedLeaves = leaves.map((l) => `${l.type}: ${l.startDate} - ${l.endDate}`);
      const isOnLeave = leaves.length > 0;

      let latePenalty = 0;
      let earlyPenalty = 0;
      let missingPenalty = 0;
      let absencePenalty = 0;
      let suppress = false;

      if (mergedEffect.attendanceExempt) {
        if (mergedEffect.attendanceExempt.countAsPresent) {
          checkIn = checkIn || shiftStartStr;
          checkOut = checkOut || shiftEndStr;
          audit.notes.push("Counted as present by ATTENDANCE_EXEMPT");
        }
        if (mergedEffect.attendanceExempt.exemptPenalties) {
          suppress = true;
        }
      }

      if (isFriday(dateObj)) suppress = true;
      if (isOnLeave) suppress = true;

      if (!suppress) {
        if (!checkIn && !checkOut) {
          absencePenalty = 1;
          audit.penalties.push({ type: "absence", value: 1, reason: "No punches", suppressed: false });
        } else if (checkIn && !checkOut) {
          missingPenalty = 0.5;
          audit.penalties.push({ type: "missingPunch", value: 0.5, reason: "Missing checkout", suppressed: false });
        } else if (checkIn && checkOut) {
          if (checkIn > shiftStartStr) {
            const shiftStartDate = parse(`${dateStr} ${shiftStartStr}`, "yyyy-MM-dd HH:mm", new Date());
            const checkInDate = parse(`${dateStr} ${checkIn}`, "yyyy-MM-dd HH:mm", new Date());
            const lateMins = differenceInMinutes(checkInDate, shiftStartDate);

            if (lateMins > 60) latePenalty = 1.0;
            else if (lateMins > 30) latePenalty = 0.5;
            else if (lateMins > 15) latePenalty = 0.25;

            if (latePenalty > 0) {
              audit.penalties.push({ type: "late", value: latePenalty, reason: `${lateMins} minutes late`, suppressed: false });
            }
          }

          if (checkOut < shiftEndStr) {
            const shiftEndDate = parse(`${dateStr} ${shiftEndStr}`, "yyyy-MM-dd HH:mm", new Date());
            const checkOutDate = parse(`${dateStr} ${checkOut}`, "yyyy-MM-dd HH:mm", new Date());
            const earlyMins = differenceInMinutes(shiftEndDate, checkOutDate);
            if (earlyMins > 5) {
              earlyPenalty = 0.5;
              audit.penalties.push({ type: "early", value: earlyPenalty, reason: `${earlyMins} minutes early`, suppressed: false });
            }
          }
        }
      }

      if (mergedEffect.penaltyOverride) {
        const po = mergedEffect.penaltyOverride;
        if (po.latePenalty === "IGNORE") {
          audit.penalties = audit.penalties.map((p) => (p.type === "late" ? { ...p, suppressed: true } : p));
          latePenalty = 0;
        } else if (typeof po.latePenalty === "number") {
          latePenalty = po.latePenalty;
        }
        if (po.earlyPenalty === "IGNORE") {
          audit.penalties = audit.penalties.map((p) => (p.type === "early" ? { ...p, suppressed: true } : p));
          earlyPenalty = 0;
        } else if (typeof po.earlyPenalty === "number") {
          earlyPenalty = po.earlyPenalty;
        }
        if (po.absencePenalty === "IGNORE") {
          audit.penalties = audit.penalties.map((p) => (p.type === "absence" ? { ...p, suppressed: true } : p));
          absencePenalty = 0;
        } else if (typeof po.absencePenalty === "number") {
          absencePenalty = po.absencePenalty;
        }
      }

      let earlyOvertime = 0;
      let lateOvertime = 0;

      if (checkIn && checkOut && !suppress) {
        if (checkIn < shiftStartStr) {
          const shiftStartDate = parse(`${dateStr} ${shiftStartStr}`, "yyyy-MM-dd HH:mm", new Date());
          const checkInDate = parse(`${dateStr} ${checkIn}`, "yyyy-MM-dd HH:mm", new Date());
          earlyOvertime = Math.max(0, differenceInMinutes(shiftStartDate, checkInDate) / 60);
        }

        if (checkOut > shiftEndStr) {
          const shiftEndDate = parse(`${dateStr} ${shiftEndStr}`, "yyyy-MM-dd HH:mm", new Date());
          const checkOutDate = parse(`${dateStr} ${checkOut}`, "yyyy-MM-dd HH:mm", new Date());
          lateOvertime = Math.max(0, differenceInMinutes(checkOutDate, shiftEndDate) / 60);
        }

        if (mergedEffect.overnightOvertime?.allowNextDayCheckout) {
          const nextDateStr = format(addDays(dateObj, 1), "yyyy-MM-dd");
          const nextDayPunches = punchMap.get(`${employee.code}_${nextDateStr}`) || [];
          if (nextDayPunches.length > 0) {
            const nextDayFirstPunch = nextDayPunches[0].split("T")[1].substring(0, 5);
            const shiftEndDate = parse(`${dateStr} ${shiftEndStr}`, "yyyy-MM-dd HH:mm", new Date());
            const nextDayPunchDate = parse(`${nextDateStr} ${nextDayFirstPunch}`, "yyyy-MM-dd HH:mm", new Date());
            const overnightMins = differenceInMinutes(nextDayPunchDate, shiftEndDate);
            const maxMins = (mergedEffect.overnightOvertime.maxOvernightHours || 24) * 60;

            if (overnightMins > 0 && overnightMins <= maxMins) {
              lateOvertime = overnightMins / 60;
              audit.overtimeDetails.push({
                type: "overnight",
                minutes: overnightMins,
                reason: `Linked to next day punch at ${nextDayFirstPunch}`,
              });
            }
          }
        }

        if (earlyOvertime > 0) {
          audit.overtimeDetails.push({ type: "early", minutes: earlyOvertime * 60, reason: "Before shift start" });
        }
        if (lateOvertime > 0 && !audit.overtimeDetails.some((o) => o.type === "overnight")) {
          audit.overtimeDetails.push({ type: "late", minutes: lateOvertime * 60, reason: "After shift end" });
        }
      }

      const totalDeduction = latePenalty + earlyPenalty + missingPenalty + absencePenalty;
      const totalOvertime = earlyOvertime + lateOvertime;

      results.push({
        id: 0,
        employeeCode: employee.code,
        date: dateStr,
        firstPunch: checkIn,
        lastPunch: checkOut,
        shiftStart: shiftStartStr,
        shiftEnd: shiftEndStr,
        actualStart: checkIn,
        actualEnd: checkOut,
        isAbsent: absencePenalty > 0,
        isMission: missions.length > 0,
        isPermission: false,
        isLeave: isOnLeave,
        isWeekend: isFriday(dateObj) || isSaturday(dateObj),
        isHoliday: false,
        suppressPenalties: suppress,
        latePenalty,
        earlyPenalty,
        missingPunchPenalty: missingPenalty,
        absencePenalty,
        totalDeduction,
        earlyOvertime,
        lateOvertime,
        totalOvertime,
        logs: [...logs, `Audit: ${JSON.stringify(audit)}`],
      });
    });
  });

  return results;
}
