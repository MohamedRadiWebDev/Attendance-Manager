
import { 
  type Employee, type InsertEmployee,
  type Punch, type InsertPunch,
  type DailyAttendance,
  type SpecialRule, type InsertSpecialRule,
  type Mission, type InsertMission,
  type Permission, type InsertPermission,
  type Leave, type InsertLeave
} from "@shared/schema";

const KEYS = {
  EMPLOYEES: 'attendance_employees',
  PUNCHES: 'attendance_punches',
  ATTENDANCE: 'attendance_daily',
  MISSIONS: 'attendance_missions',
  PERMISSIONS: 'attendance_permissions',
  LEAVES: 'attendance_leaves',
  RULES: 'attendance_rules',
  ID_COUNTERS: 'attendance_counters'
};

const MAX_LOG_SIZE = 500;
const MAX_PUNCHES = 50000;
const MAX_ATTENDANCE = 10000;

class LocalStorageProvider {
  private getItem<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`[DEBUG] LocalStorage read error for key "${key}":`, e);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        this.emergencyCleanup();
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (retryError) {
          console.error(`[DEBUG] Retry failed after cleanup:`, retryError);
        }
      } else {
        console.error(`[DEBUG] LocalStorage write error for key "${key}":`, e);
      }
    }
  }

  private emergencyCleanup(): void {
    const punches = this.getItem<Punch[]>(KEYS.PUNCHES, []);
    if (punches.length > 10000) this.setItem(KEYS.PUNCHES, punches.slice(-10000));
    const att = this.getItem<DailyAttendance[]>(KEYS.ATTENDANCE, []);
    if (att.length > 2000) this.setItem(KEYS.ATTENDANCE, att.slice(-2000));
  }

  private getNextIds(type: string, count: number): number[] {
    const counters = this.getItem(KEYS.ID_COUNTERS, {} as any);
    const startId = (counters[type] || 1);
    const ids = Array.from({ length: count }, (_, i) => startId + i);
    counters[type] = startId + count;
    this.setItem(KEYS.ID_COUNTERS, counters);
    return ids;
  }

  private getNextId(type: string): number {
    return this.getNextIds(type, 1)[0];
  }

  async getEmployees(): Promise<Employee[]> {
    return this.getItem<Employee[]>(KEYS.EMPLOYEES, []);
  }

  async upsertEmployee(employee: InsertEmployee): Promise<Employee> {
    const employees = await this.getEmployees();
    const existingIdx = employees.findIndex(e => e.code === employee.code);
    let result: Employee;
    if (existingIdx > -1) {
      result = { ...employees[existingIdx], ...employee };
      employees[existingIdx] = result;
    } else {
      result = { ...employee, id: this.getNextId('emp') } as Employee;
      employees.push(result);
    }
    this.setItem(KEYS.EMPLOYEES, employees);
    return result;
  }

  async addPunches(newPunches: InsertPunch[]): Promise<void> {
    let punches = this.getItem<Punch[]>(KEYS.PUNCHES, []);
    const ids = this.getNextIds('punch', newPunches.length);
    newPunches.forEach((p, idx) => {
      punches.push({ ...p, id: ids[idx] } as Punch);
    });
    if (punches.length > MAX_PUNCHES) punches = punches.slice(-MAX_PUNCHES);
    this.setItem(KEYS.PUNCHES, punches);
  }

  async getAllPunches(): Promise<Punch[]> {
    return this.getItem(KEYS.PUNCHES, []);
  }

  async saveDailyAttendance(records: DailyAttendance[]): Promise<void> {
    let existing = this.getItem<DailyAttendance[]>(KEYS.ATTENDANCE, []);
    const map = new Map<string, DailyAttendance>();
    existing.forEach(d => map.set(`${d.employeeCode}_${d.date}`, d));
    const newRecordsToGenIds = records.filter(r => !map.has(`${r.employeeCode}_${r.date}`));
    const ids = this.getNextIds('att', newRecordsToGenIds.length);
    let idIdx = 0;
    records.forEach(r => {
      const key = `${r.employeeCode}_${r.date}`;
      const existingRecord = map.get(key);
      const id = existingRecord?.id || ids[idIdx++];
      const trimmedLogs = r.logs?.map(l => l.substring(0, MAX_LOG_SIZE)) || [];
      map.set(key, { ...r, id, logs: trimmedLogs } as DailyAttendance);
    });
    let allRecords = Array.from(map.values());
    if (allRecords.length > MAX_ATTENDANCE) allRecords = allRecords.slice(-MAX_ATTENDANCE);
    this.setItem(KEYS.ATTENDANCE, allRecords);
  }

  async getDailyAttendance(): Promise<DailyAttendance[]> {
    return this.getItem(KEYS.ATTENDANCE, []);
  }

  async addMissions(items: InsertMission[]): Promise<void> {
    const missions = this.getItem<Mission[]>(KEYS.MISSIONS, []);
    const ids = this.getNextIds('mission', items.length);
    items.forEach((i, idx) => missions.push({ ...i, id: ids[idx] } as Mission));
    this.setItem(KEYS.MISSIONS, missions);
  }

  async getAllMissions(): Promise<Mission[]> {
    return this.getItem<Mission[]>(KEYS.MISSIONS, []);
  }

  async addLeaves(items: InsertLeave[]): Promise<void> {
    const leaves = this.getItem<Leave[]>(KEYS.LEAVES, []);
    const ids = this.getNextIds('leave', items.length);
    items.forEach((i, idx) => leaves.push({ ...i, id: ids[idx] } as Leave));
    this.setItem(KEYS.LEAVES, leaves);
  }

  async getAllLeaves(): Promise<Leave[]> {
    return this.getItem<Leave[]>(KEYS.LEAVES, []);
  }

  async addPermissions(items: InsertPermission[]): Promise<void> {
    const perms = this.getItem<Permission[]>(KEYS.PERMISSIONS, []);
    const ids = this.getNextIds('perm', items.length);
    items.forEach((i, idx) => perms.push({ ...i, id: ids[idx] } as Permission));
    this.setItem(KEYS.PERMISSIONS, perms);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.getItem<Permission[]>(KEYS.PERMISSIONS, []);
  }

  async getSpecialRules(): Promise<SpecialRule[]> {
    return this.getItem<SpecialRule[]>(KEYS.RULES, []);
  }

  async addSpecialRule(rule: InsertSpecialRule): Promise<SpecialRule> {
    const rules = await this.getSpecialRules();
    const newRule: SpecialRule = { 
      ...rule, 
      id: this.getNextId('sc'),
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 0,
    } as SpecialRule;
    rules.push(newRule);
    this.setItem(KEYS.RULES, rules);
    return newRule;
  }

  async clearAll(): Promise<void> {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new Event('storage'));
  }
}

export const localStore = new LocalStorageProvider();
