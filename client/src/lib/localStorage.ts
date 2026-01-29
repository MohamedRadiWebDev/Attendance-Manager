
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
      console.log(`[DEBUG] Saved to LocalStorage: ${key}`, value);
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(`[DEBUG] LocalStorage write error for key "${key}":`, e);
    }
  }

  private getNextId(type: string): number {
    const counters = this.getItem(KEYS.ID_COUNTERS, {} as any);
    const nextId = (counters[type] || 1);
    counters[type] = nextId + 1;
    this.setItem(KEYS.ID_COUNTERS, counters);
    return nextId;
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
    const punches = this.getItem<Punch[]>(KEYS.PUNCHES, []);
    newPunches.forEach(p => {
      punches.push({ ...p, id: this.getNextId('punch') } as Punch);
    });
    this.setItem(KEYS.PUNCHES, punches);
  }

  async getAllPunches(): Promise<Punch[]> {
    return this.getItem(KEYS.PUNCHES, []);
  }

  async saveDailyAttendance(records: DailyAttendance[]): Promise<void> {
    const existing = this.getItem<DailyAttendance[]>(KEYS.ATTENDANCE, []);
    const map = new Map<string, DailyAttendance>();
    existing.forEach(d => map.set(`${d.employeeCode}_${d.date}`, d));
    
    records.forEach(r => {
      const key = `${r.employeeCode}_${r.date}`;
      const id = map.get(key)?.id || this.getNextId('att');
      map.set(key, { ...r, id } as DailyAttendance);
    });
    
    this.setItem(KEYS.ATTENDANCE, Array.from(map.values()));
  }

  async getDailyAttendance(): Promise<DailyAttendance[]> {
    return this.getItem(KEYS.ATTENDANCE, []);
  }

  async addMissions(items: InsertMission[]): Promise<void> {
    const missions = this.getItem<Mission[]>(KEYS.MISSIONS, []);
    items.forEach(i => missions.push({ ...i, id: this.getNextId('mission') } as Mission));
    this.setItem(KEYS.MISSIONS, missions);
  }

  async getAllMissions(): Promise<Mission[]> {
    return this.getItem<Mission[]>(KEYS.MISSIONS, []);
  }

  async addLeaves(items: InsertLeave[]): Promise<void> {
    const leaves = this.getItem<Leave[]>(KEYS.LEAVES, []);
    items.forEach(i => leaves.push({ ...i, id: this.getNextId('leave') } as Leave));
    this.setItem(KEYS.LEAVES, leaves);
  }

  async getAllLeaves(): Promise<Leave[]> {
    return this.getItem<Leave[]>(KEYS.LEAVES, []);
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
