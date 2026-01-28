
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We are using in-memory storage, but we define schemas for type consistency
// and potential future DB usage.

// === MASTER DATA ===
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Employee Code
  name: text("name").notNull(),
  department: text("department"),
  section: text("section"),
  job: text("job"),
  branch: text("branch"),
  hireDate: text("hire_date"), // YYYY-MM-DD
  terminationDate: text("termination_date"), // YYYY-MM-DD
  shiftStart: text("shift_start").default("08:00"),
  shiftEnd: text("shift_end").default("16:00"), // Default, overrides exist
});

// === RAW PUNCHES ===
export const punches = pgTable("punches", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  timestamp: text("timestamp").notNull(), // ISO Date Time
  originalValue: text("original_value"), // For audit
});

// === ADJUSTMENTS ===
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time"),
  endTime: text("end_time"),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  description: text("description"),
});

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  type: text("type").notNull(), // Paid, Unpaid, Sick
  details: text("details"),
});

// === SPECIAL CASES ===
export const specialCases = pgTable("special_cases", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  ruleType: text("rule_type").notNull(), // Exempt, CustomShift, etc.
  parameters: jsonb("parameters"), // e.g. { newShiftStart: "09:00" }
});

// === DAILY ATTENDANCE (Computed) ===
// This is the main output record
export const dailyAttendance = pgTable("daily_attendance", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  
  // Inputs
  firstPunch: text("first_punch"),
  lastPunch: text("last_punch"),
  
  // Computed Time Boundaries
  shiftStart: text("shift_start"),
  shiftEnd: text("shift_end"),
  actualStart: text("actual_start"), // Min(punch, mission, perm)
  actualEnd: text("actual_end"),     // Max(punch, mission, perm)
  
  // Status Flags
  isAbsent: boolean("is_absent").default(false),
  isMission: boolean("is_mission").default(false),
  isPermission: boolean("is_permission").default(false),
  isLeave: boolean("is_leave").default(false),
  isWeekend: boolean("is_weekend").default(false),
  isHoliday: boolean("is_holiday").default(false),
  suppressPenalties: boolean("suppress_penalties").default(false),
  
  // Penalties (Values are typically 0, 0.25, 0.5, 1)
  latePenalty: real("late_penalty"),
  earlyPenalty: real("early_penalty"),
  missingPunchPenalty: real("missing_punch_penalty"),
  absencePenalty: real("absence_penalty"), // Typically 1 * 2 in summary
  
  totalDeduction: real("total_deduction"),
  
  // Overtime
  earlyOvertime: real("early_overtime"), // Hours
  lateOvertime: real("late_overtime"),   // Hours
  totalOvertime: real("total_overtime"), // Hours
  
  // Audit
  logs: text("logs").array(), // Trace of calculation
});

// === ZOD SCHEMAS ===
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertPunchSchema = createInsertSchema(punches).omit({ id: true });
export const insertMissionSchema = createInsertSchema(missions).omit({ id: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });
export const insertLeaveSchema = createInsertSchema(leaves).omit({ id: true });
export const insertSpecialCaseSchema = createInsertSchema(specialCases).omit({ id: true });
export const insertDailyAttendanceSchema = createInsertSchema(dailyAttendance).omit({ id: true });

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Punch = typeof punches.$inferSelect;
export type InsertPunch = z.infer<typeof insertPunchSchema>;

export type Mission = typeof missions.$inferSelect;
export type InsertMission = z.infer<typeof insertMissionSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = z.infer<typeof insertLeaveSchema>;

export type SpecialCase = typeof specialCases.$inferSelect;
export type InsertSpecialCase = z.infer<typeof insertSpecialCaseSchema>;

export type DailyAttendance = typeof dailyAttendance.$inferSelect;

// === API DTOs ===
export type MonthlySummary = {
  employeeCode: text;
  name: text;
  department: text;
  job: text;
  absenceDays: number;
  lateMinutes: number;
  penaltyDays: number;
  overtimeHours: number;
  overtimeDays: number;
  totalDeductions: number; // "يوجد خصم" flag equivalent
};
