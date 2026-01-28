
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { ruleEngine, type RuleContext, type RuleEffect } from "./ruleEngine";
import { api } from "../shared/routes";
import { z } from "zod";
import * as XLSX from "xlsx";
import { format, parse, isValid, parseISO, differenceInMinutes, addMinutes, addHours, isSaturday, isFriday, addDays } from "date-fns";
import type { AuditTrace, InsertSpecialRule } from "../shared/schema";

// Multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === IMPORT ===
  app.post(api.import.upload.path, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const type = req.params.type; // punches, master, missions, leaves
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let processedCount = 0;
      const errors: string[] = [];

      // Log first row keys for debugging
      if (data.length > 0) {
        console.log(`Import ${type}: First row keys:`, Object.keys(data[0] as any));
      }

      const normalizeKey = (value: unknown) =>
        String(value ?? "")
          .replace(/\uFEFF/g, "")
          .trim()
          .replace(/[\s_]+/g, "")
          .toLowerCase();

      const buildRowIndex = (row: Record<string, unknown>) => {
        const index: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          index[normalizeKey(key)] = value;
        });
        return index;
      };

      const readRowValue = (rowIndex: Record<string, unknown>, candidates: string[]) => {
        for (const candidate of candidates) {
          const key = normalizeKey(candidate);
          if (key in rowIndex) {
            return rowIndex[key];
          }
        }
        return undefined;
      };

      if (type === "master") {
        for (const row of data as any[]) {
          const rowIndex = buildRowIndex(row);
          // Expected columns - support multiple naming conventions
          const code = readRowValue(rowIndex, ["كود", "Code", "code", "الرقم", "الكود", "رقم الموظف"]);
          const name = readRowValue(rowIndex, ["الاسم", "Name", "name", "اسم الموظف"]);
          
          if (code && name) {
            await storage.upsertEmployee({
              code: String(code).trim(),
              name: String(name).trim(),
              department: readRowValue(rowIndex, ["القسم", "Department", "department"]) || "",
              section: readRowValue(rowIndex, ["القطاع", "Section"]) || "",
              job: readRowValue(rowIndex, ["الوظيفة", "Job", "job"]) || "",
              branch: readRowValue(rowIndex, ["الفرع", "Branch"]) || "",
              hireDate: readRowValue(rowIndex, ["تاريخ_التعيين", "تاريخ التعيين", "HireDate"]) || "",
              shiftStart: readRowValue(rowIndex, ["بداية_الوردية", "بداية الوردية", "ShiftStart"]) || "08:00",
              shiftEnd: readRowValue(rowIndex, ["نهاية_الوردية", "نهاية الوردية", "ShiftEnd"]) || "16:00",
            });
            processedCount++;
          } else {
            errors.push(`صف بدون كود أو اسم: ${JSON.stringify(row).substring(0, 100)}`);
          }
        }
      } else if (type === "punches") {
        for (const row of data as any[]) {
          const rowIndex = buildRowIndex(row);
          const code = readRowValue(rowIndex, ["كود", "AC-No.", "Code", "code", "الكود", "رقم الموظف"]);
          const timeRaw = readRowValue(rowIndex, ["التاريخ_والوقت", "التاريخ والوقت", "Time", "Date/Time", "الوقت", "DateTime"]);
          
          if (code && timeRaw) {
            let timestamp = "";
            
            if (typeof timeRaw === 'number') {
              // Excel serial date
              const date = XLSX.SSF.parse_date_code(timeRaw);
              timestamp = new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S).toISOString();
            } else {
              // Try parsing various string formats
              let parsed = new Date(timeRaw);
              
              // Handle DD/MM/YYYY format
              if (!isValid(parsed) && typeof timeRaw === 'string') {
                const parts = timeRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
                if (parts) {
                  let hours = parseInt(parts[4]);
                  if (parts[7]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
                  if (parts[7]?.toUpperCase() === 'AM' && hours === 12) hours = 0;
                  parsed = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), hours, parseInt(parts[5]), parseInt(parts[6] || '0'));
                }
              }
              
              if (isValid(parsed)) {
                timestamp = parsed.toISOString();
              } else {
                errors.push(`تنسيق تاريخ غير صالح للموظف ${code}: ${timeRaw}`);
                continue;
              }
            }

            await storage.addPunches([{
              employeeCode: String(code).trim(),
              timestamp: timestamp,
              originalValue: String(timeRaw)
            }]);
            processedCount++;
          } else {
            if (!code) errors.push(`صف بدون كود موظف`);
            if (!timeRaw) errors.push(`صف بدون تاريخ/وقت`);
          }
        }
      } else if (type === "missions") {
        for (const row of data as any[]) {
          const rowIndex = buildRowIndex(row);
          const code = readRowValue(rowIndex, ["كود", "Code", "الكود"]);
          const date = readRowValue(rowIndex, ["التاريخ", "Date"]);
          const startTime = readRowValue(rowIndex, ["وقت_البداية", "وقت البداية", "StartTime"]);
          const endTime = readRowValue(rowIndex, ["وقت_النهاية", "وقت النهاية", "EndTime"]);
          
          if (code && date) {
            await storage.addMissions([{
              employeeCode: String(code).trim(),
              date: String(date),
              startTime: startTime || "",
              endTime: endTime || "",
              description: readRowValue(rowIndex, ["الوصف", "Description"]) || ""
            }]);
            processedCount++;
          }
        }
      } else if (type === "leaves") {
        for (const row of data as any[]) {
          const rowIndex = buildRowIndex(row);
          const code = readRowValue(rowIndex, ["كود", "Code", "الكود"]);
          const startDate = readRowValue(rowIndex, ["تاريخ_البداية", "تاريخ البداية", "StartDate"]);
          const endDate = readRowValue(rowIndex, ["تاريخ_النهاية", "تاريخ النهاية", "EndDate"]);
          const leaveType = readRowValue(rowIndex, ["نوع_الاجازة", "نوع الاجازة", "Type"]);
          
          if (code && startDate && endDate) {
            await storage.addLeaves([{
              employeeCode: String(code).trim(),
              startDate: String(startDate),
              endDate: String(endDate),
              type: leaveType || "اجازة",
              details: readRowValue(rowIndex, ["ملاحظات", "Notes"]) || ""
            }]);
            processedCount++;
          }
        }
      }

      res.json({ success: true, count: processedCount, errors });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error processing file" });
    }
  });

  app.post(api.import.clear.path, async (req, res) => {
    await storage.clearAll();
    res.json({ success: true });
  });

  // === EMPLOYEES ===
  app.get(api.employees.list.path, async (req, res) => {
    const employees = await storage.getEmployees();
    res.json(employees);
  });

  // === ATTENDANCE CALCULATION ENGINE ===
  app.post(api.attendance.calculate.path, async (req, res) => {
    // Load rules once
    await ruleEngine.loadRules();
    
    const employees = await storage.getEmployees();
    const allPunches = await storage.getAllPunches();
    
    // Group punches by Emp + Date
    const punchMap = new Map<string, string[]>();
    allPunches.forEach(p => {
      const date = p.timestamp.split("T")[0];
      const key = `${p.employeeCode}_${date}`;
      if (!punchMap.has(key)) punchMap.set(key, []);
      punchMap.get(key)!.push(p.timestamp);
    });

    const results: any[] = [];
    const dates = new Set<string>();
    allPunches.forEach(p => dates.add(p.timestamp.split("T")[0]));
    
    for (const emp of employees) {
      for (const dateStr of dates) {
        const key = `${emp.code}_${dateStr}`;
        const punches = (punchMap.get(key) || []).sort();
        const dateObj = parse(dateStr, "yyyy-MM-dd", new Date());
        const dayOfWeek = dateObj.getDay();

        // Build rule context
        const ruleCtx: RuleContext = { employee: emp, date: dateStr, dayOfWeek };
        const appliedRules = ruleEngine.getApplicableRules(ruleCtx);
        const mergedEffect = ruleEngine.mergeEffects(appliedRules);

        // Build audit trace
        const audit: AuditTrace = {
          rawPunches: punches,
          appliedMissions: [],
          appliedPermissions: [],
          appliedLeaves: [],
          appliedRules: ruleEngine.buildAuditRules(appliedRules),
          shiftUsed: { start: "", end: "" },
          firstStampSource: "biometric",
          lastStampSource: "biometric",
          penalties: [],
          overtimeDetails: [],
          notes: []
        };

        const logs: string[] = [];
        logs.push(`معالجة ${emp.name} (${emp.code}) لتاريخ ${dateStr}`);

        // Apply IGNORE_BIOMETRIC rule
        let usePunches = punches;
        if (mergedEffect.ignoreBiometric) {
          usePunches = [];
          logs.push("تم تجاهل البصمة بموجب قاعدة IGNORE_BIOMETRIC");
          audit.notes.push("Biometric ignored by rule");
        }

        // Get shift (apply CUSTOM_SHIFT if present)
        let shiftStartStr = emp.shiftStart || "08:00";
        let shiftEndStr = emp.shiftEnd || "16:00";
        
        if (mergedEffect.customShift) {
          shiftStartStr = mergedEffect.customShift.start;
          shiftEndStr = mergedEffect.customShift.end;
          logs.push(`وردية مخصصة: ${shiftStartStr} - ${shiftEndStr}`);
        } else if (isSaturday(dateObj)) {
          const isService = emp.job?.includes("خدمات معاونة");
          if (shiftStartStr === "08:00") {
            shiftEndStr = isService ? "15:00" : "14:00";
          }
          logs.push(`السبت: وردية مختصرة إلى ${shiftEndStr}`);
        }
        
        audit.shiftUsed = { start: shiftStartStr, end: shiftEndStr };

        // Determine stamps
        let checkIn = usePunches.length > 0 ? usePunches[0].split("T")[1].substring(0,5) : null;
        let checkOut = usePunches.length > 0 ? usePunches[usePunches.length-1].split("T")[1].substring(0,5) : null;

        // Check missions
        const missions = await storage.getMissions(emp.code, dateStr);
        if (missions.length > 0) {
          audit.appliedMissions = missions.map(m => `${m.startTime}-${m.endTime}: ${m.description}`);
          if (missions[0].startTime && (!checkIn || missions[0].startTime < checkIn)) {
            checkIn = missions[0].startTime;
            audit.firstStampSource = "mission";
          }
          if (missions[0].endTime && (!checkOut || missions[0].endTime > checkOut)) {
            checkOut = missions[0].endTime;
            audit.lastStampSource = "mission";
          }
        }

        // Check leaves
        const leaves = await storage.getLeaves(emp.code, dateStr);
        audit.appliedLeaves = leaves.map(l => `${l.type}: ${l.startDate} - ${l.endDate}`);
        const isOnLeave = leaves.length > 0;

        logs.push(`البصمة: دخول=${checkIn || "لا يوجد"}, خروج=${checkOut || "لا يوجد"}`);

        // Calculate penalties
        let latePenalty = 0;
        let earlyPenalty = 0;
        let missingPenalty = 0;
        let absencePenalty = 0;
        let suppress = false;

        // Check ATTENDANCE_EXEMPT
        if (mergedEffect.attendanceExempt) {
          if (mergedEffect.attendanceExempt.countAsPresent) {
            checkIn = checkIn || shiftStartStr;
            checkOut = checkOut || shiftEndStr;
            audit.notes.push("Counted as present by ATTENDANCE_EXEMPT");
          }
          if (mergedEffect.attendanceExempt.exemptPenalties) {
            suppress = true;
            logs.push("إعفاء من الخصومات بموجب قاعدة ATTENDANCE_EXEMPT");
          }
        }

        if (isFriday(dateObj)) {
          suppress = true;
          logs.push("الجمعة - إجازة رسمية");
        }

        if (isOnLeave) {
          suppress = true;
          logs.push("الموظف في إجازة");
        }

        if (!suppress) {
          if (!checkIn && !checkOut) {
            absencePenalty = 1;
            logs.push("غياب كامل");
            audit.penalties.push({ type: "absence", value: 1, reason: "No punches", suppressed: false });
          } else if (checkIn && !checkOut) {
            missingPenalty = 0.5;
            logs.push("نسيان بصمة الخروج - خصم 0.5 يوم");
            audit.penalties.push({ type: "missingPunch", value: 0.5, reason: "Missing checkout", suppressed: false });
          } else if (checkIn && checkOut) {
            // Late penalty
            if (checkIn > shiftStartStr) {
              const shiftStartDate = parse(`${dateStr} ${shiftStartStr}`, "yyyy-MM-dd HH:mm", new Date());
              const checkInDate = parse(`${dateStr} ${checkIn}`, "yyyy-MM-dd HH:mm", new Date());
              const lateMins = differenceInMinutes(checkInDate, shiftStartDate);
              
              if (lateMins > 60) latePenalty = 1.0;
              else if (lateMins > 30) latePenalty = 0.5;
              else if (lateMins > 15) latePenalty = 0.25;
              
              if (latePenalty > 0) {
                logs.push(`تأخير ${lateMins} دقيقة - خصم ${latePenalty} يوم`);
                audit.penalties.push({ type: "late", value: latePenalty, reason: `${lateMins} minutes late`, suppressed: false });
              }
            }
            
            // Early leave penalty
            if (checkOut < shiftEndStr) {
              const shiftEndDate = parse(`${dateStr} ${shiftEndStr}`, "yyyy-MM-dd HH:mm", new Date());
              const checkOutDate = parse(`${dateStr} ${checkOut}`, "yyyy-MM-dd HH:mm", new Date());
              const earlyMins = differenceInMinutes(shiftEndDate, checkOutDate);
              
              if (earlyMins > 5) {
                earlyPenalty = 0.5;
                logs.push(`انصراف مبكر ${earlyMins} دقيقة - خصم ${earlyPenalty} يوم`);
                audit.penalties.push({ type: "early", value: earlyPenalty, reason: `${earlyMins} minutes early`, suppressed: false });
              }
            }
          }
        }

        // Apply PENALTY_OVERRIDE
        if (mergedEffect.penaltyOverride) {
          const po = mergedEffect.penaltyOverride;
          if (po.latePenalty === 'IGNORE') {
            audit.penalties = audit.penalties.map(p => p.type === 'late' ? { ...p, suppressed: true } : p);
            latePenalty = 0;
          } else if (typeof po.latePenalty === 'number') {
            latePenalty = po.latePenalty;
          }
          if (po.earlyPenalty === 'IGNORE') {
            audit.penalties = audit.penalties.map(p => p.type === 'early' ? { ...p, suppressed: true } : p);
            earlyPenalty = 0;
          } else if (typeof po.earlyPenalty === 'number') {
            earlyPenalty = po.earlyPenalty;
          }
          if (po.absencePenalty === 'IGNORE') {
            audit.penalties = audit.penalties.map(p => p.type === 'absence' ? { ...p, suppressed: true } : p);
            absencePenalty = 0;
          } else if (typeof po.absencePenalty === 'number') {
            absencePenalty = po.absencePenalty;
          }
          logs.push("تم تعديل الخصومات بموجب قاعدة PENALTY_OVERRIDE");
        }

        // Calculate overtime (including overnight)
        let earlyOvertime = 0;
        let lateOvertime = 0;
        
        if (checkIn && checkOut && !suppress) {
          // Early overtime (before shift start)
          if (checkIn < shiftStartStr) {
            const shiftStartDate = parse(`${dateStr} ${shiftStartStr}`, "yyyy-MM-dd HH:mm", new Date());
            const checkInDate = parse(`${dateStr} ${checkIn}`, "yyyy-MM-dd HH:mm", new Date());
            earlyOvertime = Math.max(0, differenceInMinutes(shiftStartDate, checkInDate) / 60);
          }
          
          // Late overtime (after shift end)
          if (checkOut > shiftEndStr) {
            const shiftEndDate = parse(`${dateStr} ${shiftEndStr}`, "yyyy-MM-dd HH:mm", new Date());
            const checkOutDate = parse(`${dateStr} ${checkOut}`, "yyyy-MM-dd HH:mm", new Date());
            lateOvertime = Math.max(0, differenceInMinutes(checkOutDate, shiftEndDate) / 60);
          }
          
          // Handle overnight overtime
          if (mergedEffect.overnightOvertime?.allowNextDayCheckout) {
            const nextDateStr = format(addDays(dateObj, 1), "yyyy-MM-dd");
            const nextDayPunches = punchMap.get(`${emp.code}_${nextDateStr}`) || [];
            if (nextDayPunches.length > 0) {
              const nextDayFirstPunch = nextDayPunches[0].split("T")[1].substring(0,5);
              const shiftEndDate = parse(`${dateStr} ${shiftEndStr}`, "yyyy-MM-dd HH:mm", new Date());
              const nextDayPunchDate = parse(`${nextDateStr} ${nextDayFirstPunch}`, "yyyy-MM-dd HH:mm", new Date());
              const overnightMins = differenceInMinutes(nextDayPunchDate, shiftEndDate);
              const maxMins = (mergedEffect.overnightOvertime.maxOvernightHours || 24) * 60;
              
              if (overnightMins > 0 && overnightMins <= maxMins) {
                lateOvertime = overnightMins / 60;
                audit.overtimeDetails.push({ 
                  type: "overnight", 
                  minutes: overnightMins, 
                  reason: `Linked to next day punch at ${nextDayFirstPunch}` 
                });
                logs.push(`عمل إضافي ليلي: ${Math.round(lateOvertime * 60)} دقيقة`);
              }
            }
          }
          
          if (earlyOvertime > 0) {
            audit.overtimeDetails.push({ type: "early", minutes: earlyOvertime * 60, reason: "Before shift start" });
          }
          if (lateOvertime > 0 && !audit.overtimeDetails.some(o => o.type === 'overnight')) {
            audit.overtimeDetails.push({ type: "late", minutes: lateOvertime * 60, reason: "After shift end" });
          }
        }

        const totalDeduction = latePenalty + earlyPenalty + missingPenalty + absencePenalty;
        const totalOvertime = earlyOvertime + lateOvertime;

        results.push({
          employeeCode: emp.code,
          date: dateStr,
          firstPunch: checkIn,
          lastPunch: checkOut,
          shiftStart: shiftStartStr,
          shiftEnd: shiftEndStr,
          actualStart: checkIn,
          actualEnd: checkOut,
          isAbsent: absencePenalty > 0,
          isMission: missions.length > 0,
          isLeave: isOnLeave,
          isWeekend: isFriday(dateObj) || isSaturday(dateObj),
          suppressPenalties: suppress,
          latePenalty,
          earlyPenalty,
          missingPunchPenalty: missingPenalty,
          absencePenalty,
          totalDeduction,
          earlyOvertime,
          lateOvertime,
          totalOvertime,
          logs: [...logs, `Audit: ${JSON.stringify(audit)}`]
        });
      }
    }

    await storage.saveDailyAttendance(results);
    res.json({ success: true, processedCount: results.length });
  });

  // === EXPORTS ===
  app.get(api.export.attendance.path, async (req, res) => {
    const data = await storage.getDailyAttendance();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map(d => ({
      'كود الموظف': d.employeeCode,
      'التاريخ': d.date,
      'الدخول': d.firstPunch,
      'الخروج': d.lastPunch,
      'الخصم (أيام)': d.totalDeduction,
      'الإضافي (ساعات)': Number(d.totalOvertime).toFixed(2),
      'الحالة': d.isAbsent ? 'غياب' : d.isLeave ? 'إجازة' : 'حضور'
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");
    res.send(buf);
  });

  app.get(api.export.summary.path, async (req, res) => {
    const data = await storage.getDailyAttendance();
    const employees = await storage.getEmployees();
    
    const summaryMap = new Map();
    employees.forEach(emp => {
      summaryMap.set(emp.code, {
        'كود الموظف': emp.code,
        'الاسم': emp.name,
        'القسم': emp.department,
        'إجمالي الغياب (أيام)': 0,
        'إجمالي الإجازات (أيام)': 0,
        'إجمالي الخصومات (أيام)': 0,
        'إجمالي الإضافي (ساعات)': 0
      });
    });

    data.forEach(d => {
      const s = summaryMap.get(d.employeeCode);
      if (s) {
        if (d.isAbsent) s['إجمالي الغياب (أيام)'] += 1;
        if (d.isLeave) s['إجمالي الإجازات (أيام)'] += 1;
        s['إجمالي الخصومات (أيام)'] += (d.totalDeduction || 0);
        s['إجمالي الإضافي (ساعات)'] += (Number(d.totalOvertime) || 0);
      }
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(Array.from(summaryMap.values()));
    XLSX.utils.book_append_sheet(wb, ws, "Salary Summary");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=salary_summary.xlsx");
    res.send(buf);
  });
  app.get("/api/templates/:type", async (req, res) => {
    const type = req.params.type;
    const wb = XLSX.utils.book_new();
    let ws;
    let filename = "template.xlsx";

    if (type === "master") {
      // Employee Master Data Template
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "الاسم", "القسم", "الوظيفة", "الفرع", "تاريخ_التعيين", "بداية_الوردية", "نهاية_الوردية"],
        ["EMP001", "أحمد محمد", "الحسابات", "محاسب", "القاهرة", "2020-01-15", "08:00", "16:00"],
        ["EMP002", "محمد علي", "الموارد البشرية", "خدمات معاونة", "الجيزة", "2019-05-20", "08:00", "16:00"],
      ]);
      filename = "template_master_data.xlsx";
    } else if (type === "punches") {
      // Biometric Punches Template
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "التاريخ_والوقت"],
        ["EMP001", "2025-12-15 08:05:00"],
        ["EMP001", "2025-12-15 16:30:00"],
        ["EMP002", "2025-12-15 08:15:00"],
        ["EMP002", "2025-12-15 15:45:00"],
      ]);
      filename = "template_punches.xlsx";
    } else if (type === "missions") {
      // Missions Template
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "التاريخ", "وقت_البداية", "وقت_النهاية", "الوصف"],
        ["EMP001", "2025-12-16", "09:00", "14:00", "مأمورية خارجية"],
      ]);
      filename = "template_missions.xlsx";
    } else if (type === "leaves") {
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "تاريخ_البداية", "تاريخ_النهاية", "نوع_الاجازة", "ملاحظات"],
        ["EMP001", "2025-12-20", "2025-12-22", "اجازة عارضة", ""],
      ]);
      filename = "template_leaves.xlsx";
    } else if (type === "special_rules") {
      ws = XLSX.utils.aoa_to_sheet([
        ["name", "enabled", "priority", "scopeType", "scopeValues", "dateFrom", "dateTo", "daysOfWeek", "ruleType", "params_json", "notes"],
        ["وردية مخصصة - قسم المبيعات", "true", "10", "department", "المبيعات", "2025-01-01", "2025-12-31", "", "CUSTOM_SHIFT", '{"shiftStart":"09:00","shiftEnd":"17:00"}', ""],
        ["إعفاء من الخصومات - محمد", "true", "5", "employee", "EMP001", "2025-01-01", "2025-01-31", "", "ATTENDANCE_EXEMPT", '{"countAsPresent":true,"exemptPenalties":true}', "فترة تجريبية"],
        ["عمل إضافي ليلي - الأمن", "true", "10", "department", "الأمن", "2025-01-01", "2025-12-31", "", "OVERTIME_OVERNIGHT", '{"allowNextDayCheckout":true,"maxOvernightHours":12}', ""],
      ]);
      filename = "template_special_rules.xlsx";
    } else {
      return res.status(400).json({ message: "Unknown template type" });
    }

    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // === SPECIAL RULES CRUD ===
  app.get("/api/special-rules", async (req, res) => {
    const rules = await storage.getSpecialRules();
    res.json(rules);
  });

  app.get("/api/special-rules/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const rule = await storage.getSpecialRule(id);
    if (!rule) return res.status(404).json({ message: "Rule not found" });
    res.json(rule);
  });

  app.post("/api/special-rules", async (req, res) => {
    try {
      const rule = await storage.addSpecialRule(req.body);
      res.json(rule);
    } catch (err) {
      res.status(400).json({ message: "Invalid rule data" });
    }
  });

  app.put("/api/special-rules/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const rule = await storage.updateSpecialRule(id, req.body);
    if (!rule) return res.status(404).json({ message: "Rule not found" });
    res.json(rule);
  });

  app.delete("/api/special-rules/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteSpecialRule(id);
    res.json({ success: true });
  });

  // === SPECIAL RULES IMPORT/EXPORT ===
  app.post("/api/special-rules/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

      let processedCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        try {
          const name = row["name"] || row["الاسم"];
          const ruleType = row["ruleType"] || row["نوع_القاعدة"];
          const dateFrom = row["dateFrom"] || row["من_تاريخ"];
          const dateTo = row["dateTo"] || row["إلى_تاريخ"];
          const scopeType = row["scopeType"] || row["نوع_النطاق"] || "all";

          if (!name || !ruleType || !dateFrom || !dateTo) {
            errors.push(`صف غير مكتمل: ${JSON.stringify(row).substring(0, 80)}`);
            continue;
          }

          let params = {};
          const paramsJson = row["params_json"] || row["البارامترات"];
          if (paramsJson) {
            try {
              params = JSON.parse(paramsJson);
            } catch {
              errors.push(`JSON غير صالح في params_json للقاعدة: ${name}`);
              continue;
            }
          }

          const scopeValuesRaw = row["scopeValues"] || row["قيم_النطاق"] || "";
          const scopeValues = scopeValuesRaw ? String(scopeValuesRaw).split(",").map((s: string) => s.trim()) : [];

          const daysRaw = row["daysOfWeek"] || row["أيام_الأسبوع"] || "";
          const daysOfWeek = daysRaw ? String(daysRaw).split(",").map((d: string) => parseInt(d.trim())).filter((n: number) => !isNaN(n)) : [];

          await storage.addSpecialRule({
            name: String(name),
            enabled: row["enabled"] !== false && row["enabled"] !== "false" && row["مفعل"] !== "لا",
            priority: parseInt(row["priority"] || row["الأولوية"] || "0") || 0,
            scopeType: String(scopeType),
            scopeValues: scopeValues.length > 0 ? scopeValues : null,
            dateFrom: String(dateFrom),
            dateTo: String(dateTo),
            daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null,
            ruleType: String(ruleType),
            params,
            notes: row["notes"] || row["ملاحظات"] || null
          });
          processedCount++;
        } catch (err) {
          errors.push(`خطأ في معالجة الصف: ${(err as Error).message}`);
        }
      }

      res.json({ success: true, count: processedCount, errors });
    } catch (err) {
      res.status(500).json({ message: "Error processing file" });
    }
  });

  app.get("/api/special-rules/export", async (req, res) => {
    const rules = await storage.getSpecialRules();
    const exportData = rules.map(r => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      priority: r.priority,
      scopeType: r.scopeType,
      scopeValues: r.scopeValues?.join(",") || "",
      dateFrom: r.dateFrom,
      dateTo: r.dateTo,
      daysOfWeek: r.daysOfWeek?.join(",") || "",
      ruleType: r.ruleType,
      params_json: JSON.stringify(r.params || {}),
      notes: r.notes || ""
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "rules");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=special_rules.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // === EXPORTS ===
  app.get(api.export.attendance.path, async (req, res) => {
    const data = await storage.getDailyAttendance();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    
    res.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  return httpServer;
}
