
import { 
  type Employee, type InsertEmployee,
  type Punch, type InsertPunch,
  type DailyAttendance,
  type SpecialRule, type InsertSpecialRule,
  type Mission, type InsertMission,
  type Permission, type InsertPermission,
  type Leave, type InsertLeave
} from "@shared/schema";

export interface IStorage {
  // Master Data
  getEmployees(): Promise<Employee[]>;
  getEmployee(code: string): Promise<Employee | undefined>;
  upsertEmployee(employee: InsertEmployee): Promise<Employee>;
  
  // Punches
  addPunches(punches: InsertPunch[]): Promise<void>;
  getPunches(employeeCode: string, date: string): Promise<Punch[]>;
  getAllPunches(): Promise<Punch[]>;
  
  // Daily Attendance (The Grid)
  saveDailyAttendance(records: DailyAttendance[]): Promise<void>;
  getDailyAttendance(month?: string): Promise<DailyAttendance[]>;
  
  // Adjustments
  addMissions(missions: InsertMission[]): Promise<void>;
  getMissions(employeeCode: string, date: string): Promise<Mission[]>;
  
  addPermissions(permissions: InsertPermission[]): Promise<void>;
  getPermissions(employeeCode: string, date: string): Promise<Permission[]>;
  
  addLeaves(leaves: InsertLeave[]): Promise<void>;
  getLeaves(employeeCode: string, date: string): Promise<Leave[]>;
  
  // Special Rules
  getSpecialRules(): Promise<SpecialRule[]>;
  getSpecialRule(id: number): Promise<SpecialRule | undefined>;
  addSpecialRule(rule: InsertSpecialRule): Promise<SpecialRule>;
  updateSpecialRule(id: number, rule: Partial<InsertSpecialRule>): Promise<SpecialRule | undefined>;
  deleteSpecialRule(id: number): Promise<void>;
  addSpecialRules(rules: InsertSpecialRule[]): Promise<void>;

  // Utility
  clearAll(): Promise<void>;
}

export class MemStorage implements IStorage {
  private employees: Map<string, Employee> = new Map();
  private punches: Punch[] = [];
  private dailyAttendance: DailyAttendance[] = [];
  private missions: Mission[] = [];
  private permissions: Permission[] = [];
  private leaves: Leave[] = [];
  private specialRules: SpecialRule[] = [];
  
  private idCounter = {
    emp: 1,
    punch: 1,
    att: 1,
    mission: 1,
    perm: 1,
    leave: 1,
    sc: 1
  };

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(code: string): Promise<Employee | undefined> {
    return this.employees.get(code);
  }

  async upsertEmployee(employee: InsertEmployee): Promise<Employee> {
    const existing = this.employees.get(employee.code);
    const id = existing ? existing.id : this.idCounter.emp++;
    const newEmp = { ...employee, id };
    this.employees.set(employee.code, newEmp);
    return newEmp;
  }

  async addPunches(newPunches: InsertPunch[]): Promise<void> {
    newPunches.forEach(p => {
      this.punches.push({ ...p, id: this.idCounter.punch++ });
    });
  }

  async getPunches(employeeCode: string, date: string): Promise<Punch[]> {
    // Basic string filtering YYYY-MM-DD
    return this.punches.filter(p => 
      p.employeeCode === employeeCode && 
      p.timestamp.startsWith(date)
    );
  }
  
  async getAllPunches(): Promise<Punch[]> {
    return this.punches;
  }

  async saveDailyAttendance(records: DailyAttendance[]): Promise<void> {
    // Replace existing for same employee+date
    const map = new Map<string, DailyAttendance>();
    
    // Index existing
    this.dailyAttendance.forEach(d => {
      map.set(`${d.employeeCode}_${d.date}`, d);
    });
    
    // Overwrite with new
    records.forEach(r => {
      const id = map.get(`${r.employeeCode}_${r.date}`)?.id || this.idCounter.att++;
      map.set(`${r.employeeCode}_${r.date}`, { ...r, id });
    });
    
    this.dailyAttendance = Array.from(map.values());
  }

  async getDailyAttendance(month?: string): Promise<DailyAttendance[]> {
    if (!month) return this.dailyAttendance;
    return this.dailyAttendance.filter(d => d.date.startsWith(month));
  }

  async addMissions(items: InsertMission[]): Promise<void> {
    items.forEach(i => this.missions.push({ ...i, id: this.idCounter.mission++ }));
  }
  
  async getMissions(code: string, date: string): Promise<Mission[]> {
    return this.missions.filter(m => m.employeeCode === code && m.date === date);
  }

  async addPermissions(items: InsertPermission[]): Promise<void> {
    items.forEach(i => this.permissions.push({ ...i, id: this.idCounter.perm++ }));
  }
  
  async getPermissions(code: string, date: string): Promise<Permission[]> {
    return this.permissions.filter(p => p.employeeCode === code && p.date === date);
  }

  async addLeaves(items: InsertLeave[]): Promise<void> {
    items.forEach(i => this.leaves.push({ ...i, id: this.idCounter.leave++ }));
  }
  
  async getLeaves(code: string, date: string): Promise<Leave[]> {
    // Simple range check
    return this.leaves.filter(l => 
      l.employeeCode === code && 
      date >= l.startDate && 
      date <= l.endDate
    );
  }

  async getSpecialRules(): Promise<SpecialRule[]> {
    return this.specialRules;
  }

  async getSpecialRule(id: number): Promise<SpecialRule | undefined> {
    return this.specialRules.find(r => r.id === id);
  }

  async addSpecialRule(rule: InsertSpecialRule): Promise<SpecialRule> {
    const sr: SpecialRule = { 
      ...rule, 
      id: this.idCounter.sc++,
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 0,
      scopeValues: rule.scopeValues ?? null,
      daysOfWeek: rule.daysOfWeek ?? null,
      params: rule.params ?? null,
      notes: rule.notes ?? null
    };
    this.specialRules.push(sr);
    return sr;
  }

  async updateSpecialRule(id: number, updates: Partial<InsertSpecialRule>): Promise<SpecialRule | undefined> {
    const idx = this.specialRules.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.specialRules[idx] = { ...this.specialRules[idx], ...updates };
    return this.specialRules[idx];
  }

  async deleteSpecialRule(id: number): Promise<void> {
    this.specialRules = this.specialRules.filter(s => s.id !== id);
  }

  async addSpecialRules(rules: InsertSpecialRule[]): Promise<void> {
    for (const rule of rules) {
      await this.addSpecialRule(rule);
    }
  }

  async clearAll(): Promise<void> {
    this.employees.clear();
    this.punches = [];
    this.dailyAttendance = [];
    this.missions = [];
    this.permissions = [];
    this.leaves = [];
    this.specialRules = [];
  }
}

export const storage = new MemStorage();
