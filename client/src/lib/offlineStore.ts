import * as XLSX from "xlsx";
import type {
  DailyAttendance,
  Employee,
  InsertEmployee,
  InsertLeave,
  InsertMission,
  InsertPunch,
  InsertSpecialRule,
  Leave,
  Mission,
  Punch,
  SpecialRule,
} from "@shared/schema";

const STORAGE_KEY = "attendance-offline-state";

export const OFFLINE_MODE = import.meta.env.VITE_OFFLINE_MODE === "true";

const OFFLINE_FLAG_KEY = "attendance-offline-enabled";

export function isOfflineModeEnabled() {
  if (OFFLINE_MODE) return true;
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(OFFLINE_FLAG_KEY) === "true";
}

export function enableOfflineMode() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(OFFLINE_FLAG_KEY, "true");
}

type OfflineState = {
  employees: Employee[];
  punches: Punch[];
  missions: Mission[];
  leaves: Leave[];
  specialRules: SpecialRule[];
  attendance: DailyAttendance[];
  counters: {
    emp: number;
    punch: number;
    mission: number;
    leave: number;
    rule: number;
    att: number;
  };
};

const emptyState: OfflineState = {
  employees: [],
  punches: [],
  missions: [],
  leaves: [],
  specialRules: [],
  attendance: [],
  counters: {
    emp: 1,
    punch: 1,
    mission: 1,
    leave: 1,
    rule: 1,
    att: 1,
  },
};

function loadState(): OfflineState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...emptyState };
  try {
    const parsed = JSON.parse(raw) as OfflineState;
    return {
      ...emptyState,
      ...parsed,
      counters: { ...emptyState.counters, ...parsed.counters },
    };
  } catch {
    return { ...emptyState };
  }
}

function saveState(state: OfflineState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureEmployeeIds(state: OfflineState, employee: InsertEmployee): Employee {
  const existing = state.employees.find((emp) => emp.code === employee.code);
  if (existing) {
    return { ...existing, ...employee };
  }
  const id = state.counters.emp++;
  return { ...employee, id };
}

export function upsertEmployees(employees: InsertEmployee[]) {
  const state = loadState();
  employees.forEach((employee) => {
    const next = ensureEmployeeIds(state, employee);
    state.employees = state.employees.filter((emp) => emp.code !== next.code);
    state.employees.push(next);
  });
  saveState(state);
}

export function getEmployees(): Employee[] {
  return loadState().employees;
}

export function addPunches(punches: InsertPunch[]) {
  const state = loadState();
  punches.forEach((punch) => {
    state.punches.push({ ...punch, id: state.counters.punch++ });
  });
  saveState(state);
}

export function addMissions(missions: InsertMission[]) {
  const state = loadState();
  missions.forEach((mission) => {
    state.missions.push({ ...mission, id: state.counters.mission++ });
  });
  saveState(state);
}

export function addLeaves(leaves: InsertLeave[]) {
  const state = loadState();
  leaves.forEach((leave) => {
    state.leaves.push({ ...leave, id: state.counters.leave++ });
  });
  saveState(state);
}

export function addSpecialRules(rules: InsertSpecialRule[]) {
  const state = loadState();
  rules.forEach((rule) => {
    state.specialRules.push({
      ...rule,
      id: state.counters.rule++,
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 0,
      scopeValues: rule.scopeValues ?? null,
      daysOfWeek: rule.daysOfWeek ?? null,
      params: rule.params ?? null,
      notes: rule.notes ?? null,
    });
  });
  saveState(state);
}

export function updateSpecialRule(id: number, updates: Partial<InsertSpecialRule>) {
  const state = loadState();
  state.specialRules = state.specialRules.map((rule) =>
    rule.id === id ? { ...rule, ...updates } : rule,
  );
  saveState(state);
}

export function deleteSpecialRule(id: number) {
  const state = loadState();
  state.specialRules = state.specialRules.filter((rule) => rule.id !== id);
  saveState(state);
}

export function getSpecialRules(): SpecialRule[] {
  return loadState().specialRules;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => parseInt(part, 10));
  return hours * 60 + minutes;
}

function getTimeParts(timestamp: string) {
  if (timestamp.includes("T")) {
    const [date, time] = timestamp.split("T");
    return { date, time: time.substring(0, 5) };
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "", time: "" };
  }
  const date = parsed.toISOString().split("T")[0];
  const time = parsed.toISOString().split("T")[1].substring(0, 5);
  return { date, time };
}

export function calculateAttendance(): DailyAttendance[] {
  const state = loadState();
  const punchMap = new Map<string, string[]>();
  const dates = new Set<string>();

  state.punches.forEach((punch) => {
    const { date, time } = getTimeParts(punch.timestamp);
    if (!date || !time) return;
    const key = `${punch.employeeCode}_${date}`;
    if (!punchMap.has(key)) {
      punchMap.set(key, []);
    }
    punchMap.get(key)?.push(time);
    dates.add(date);
  });

  const attendance: DailyAttendance[] = [];
  const sortedDates = Array.from(dates).sort();

  state.employees.forEach((employee) => {
    sortedDates.forEach((date) => {
      const key = `${employee.code}_${date}`;
      const times = (punchMap.get(key) || []).sort();
      if (times.length === 0) return;

      const shiftStart = employee.shiftStart || "08:00";
      const shiftEnd = employee.shiftEnd || "16:00";
      const firstPunch = times[0] ?? null;
      const lastPunch = times[times.length - 1] ?? null;

      let latePenalty = 0;
      let earlyPenalty = 0;
      let missingPunchPenalty = 0;
      let absencePenalty = 0;

      if (firstPunch && lastPunch) {
        const startMinutes = toMinutes(shiftStart);
        const endMinutes = toMinutes(shiftEnd);
        const inMinutes = toMinutes(firstPunch);
        const outMinutes = toMinutes(lastPunch);

        const lateMins = Math.max(0, inMinutes - startMinutes);
        if (lateMins > 60) latePenalty = 1.0;
        else if (lateMins > 30) latePenalty = 0.5;
        else if (lateMins > 15) latePenalty = 0.25;

        const earlyMins = Math.max(0, endMinutes - outMinutes);
        if (earlyMins > 5) earlyPenalty = 0.5;
      } else if (firstPunch || lastPunch) {
        missingPunchPenalty = 0.5;
      } else {
        absencePenalty = 1;
      }

      const totalDeduction = latePenalty + earlyPenalty + missingPunchPenalty + absencePenalty;

      attendance.push({
        id: state.counters.att++,
        employeeCode: employee.code,
        date,
        firstPunch,
        lastPunch,
        shiftStart,
        shiftEnd,
        actualStart: firstPunch,
        actualEnd: lastPunch,
        isAbsent: absencePenalty > 0,
        isMission: false,
        isPermission: false,
        isLeave: false,
        isWeekend: false,
        isHoliday: false,
        suppressPenalties: false,
        latePenalty,
        earlyPenalty,
        missingPunchPenalty,
        absencePenalty,
        totalDeduction,
        earlyOvertime: 0,
        lateOvertime: 0,
        totalOvertime: 0,
        logs: ["Offline calculation"],
      });
    });
  });

  state.attendance = attendance;
  saveState(state);
  return attendance;
}

export function getAttendance(month?: string): DailyAttendance[] {
  const state = loadState();
  if (!month) return state.attendance;
  return state.attendance.filter((record) => record.date.startsWith(month));
}

export function exportAttendance(): Blob {
  const data = getAttendance();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function exportSummary(): Blob {
  const attendance = getAttendance();
  const employees = getEmployees();
  const summary = employees.map((employee) => {
    const rows = attendance.filter((record) => record.employeeCode === employee.code);
    const absenceDays = rows.filter((row) => row.absencePenalty && row.absencePenalty > 0).length;
    const totalDeductions = rows.reduce((sum, row) => sum + (row.totalDeduction || 0), 0);
    const overtimeHours = rows.reduce((sum, row) => sum + (row.totalOvertime || 0), 0);
    return {
      employeeCode: employee.code,
      name: employee.name,
      department: employee.department ?? "",
      job: employee.job ?? "",
      absenceDays,
      lateMinutes: 0,
      penaltyDays: totalDeductions,
      overtimeHours,
      overtimeDays: 0,
      totalDeductions,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws, "Summary");
  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
