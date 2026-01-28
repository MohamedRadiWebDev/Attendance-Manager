import { type SpecialRule, type Employee, type AuditTrace } from "../shared/schema";
import { storage } from "./storage";

export interface RuleContext {
  employee: Employee;
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=Sun, 6=Sat
}

export interface AppliedRule {
  rule: SpecialRule;
  effect: RuleEffect;
}

export interface RuleEffect {
  customShift?: { start: string; end: string };
  attendanceExempt?: { countAsPresent: boolean; exemptPenalties: boolean };
  penaltyOverride?: { 
    latePenalty?: number | 'IGNORE'; 
    earlyPenalty?: number | 'IGNORE'; 
    absencePenalty?: number | 'IGNORE';
  };
  ignoreBiometric?: boolean;
  overnightOvertime?: { allowNextDayCheckout: boolean; maxOvernightHours: number };
}

export class RuleEngine {
  private rules: SpecialRule[] = [];

  async loadRules(): Promise<void> {
    this.rules = await storage.getSpecialRules();
  }

  getApplicableRules(ctx: RuleContext): AppliedRule[] {
    const applicable: AppliedRule[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (!this.matchesScope(rule, ctx.employee)) continue;
      if (!this.matchesDateRange(rule, ctx.date)) continue;
      if (!this.matchesDayOfWeek(rule, ctx.dayOfWeek)) continue;

      const effect = this.parseEffect(rule);
      applicable.push({ rule, effect });
    }

    // Sort by priority descending (higher priority first)
    applicable.sort((a, b) => (b.rule.priority ?? 0) - (a.rule.priority ?? 0));

    return applicable;
  }

  private matchesScope(rule: SpecialRule, employee: Employee): boolean {
    const scopeType = rule.scopeType;
    const scopeValues = rule.scopeValues || [];

    switch (scopeType) {
      case 'all':
        return true;
      case 'employee':
        return scopeValues.includes(employee.code);
      case 'department':
        return employee.department ? scopeValues.includes(employee.department) : false;
      case 'branch':
        return employee.branch ? scopeValues.includes(employee.branch) : false;
      default:
        return false;
    }
  }

  private matchesDateRange(rule: SpecialRule, date: string): boolean {
    return date >= rule.dateFrom && date <= rule.dateTo;
  }

  private matchesDayOfWeek(rule: SpecialRule, dayOfWeek: number): boolean {
    if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) return true;
    return rule.daysOfWeek.includes(dayOfWeek);
  }

  private parseEffect(rule: SpecialRule): RuleEffect {
    const params = (rule.params as Record<string, unknown>) || {};
    const effect: RuleEffect = {};

    switch (rule.ruleType) {
      case 'CUSTOM_SHIFT':
        effect.customShift = {
          start: (params.shiftStart as string) || '08:00',
          end: (params.shiftEnd as string) || '16:00'
        };
        break;

      case 'ATTENDANCE_EXEMPT':
        effect.attendanceExempt = {
          countAsPresent: params.countAsPresent === true,
          exemptPenalties: params.exemptPenalties !== false
        };
        break;

      case 'PENALTY_OVERRIDE':
        effect.penaltyOverride = {
          latePenalty: params.latePenalty as (number | 'IGNORE') | undefined,
          earlyPenalty: params.earlyPenalty as (number | 'IGNORE') | undefined,
          absencePenalty: params.absencePenalty as (number | 'IGNORE') | undefined
        };
        break;

      case 'IGNORE_BIOMETRIC':
        effect.ignoreBiometric = params.ignore !== false;
        break;

      case 'OVERTIME_OVERNIGHT':
        effect.overnightOvertime = {
          allowNextDayCheckout: params.allowNextDayCheckout === true,
          maxOvernightHours: (params.maxOvernightHours as number) || 24
        };
        break;
    }

    return effect;
  }

  mergeEffects(appliedRules: AppliedRule[]): RuleEffect {
    const merged: RuleEffect = {};

    for (const { effect } of appliedRules) {
      if (effect.customShift && !merged.customShift) {
        merged.customShift = effect.customShift;
      }
      if (effect.attendanceExempt && !merged.attendanceExempt) {
        merged.attendanceExempt = effect.attendanceExempt;
      }
      if (effect.penaltyOverride) {
        merged.penaltyOverride = { ...merged.penaltyOverride, ...effect.penaltyOverride };
      }
      if (effect.ignoreBiometric && !merged.ignoreBiometric) {
        merged.ignoreBiometric = effect.ignoreBiometric;
      }
      if (effect.overnightOvertime && !merged.overnightOvertime) {
        merged.overnightOvertime = effect.overnightOvertime;
      }
    }

    return merged;
  }

  buildAuditRules(appliedRules: AppliedRule[]): AuditTrace['appliedRules'] {
    return appliedRules.map(({ rule }) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.ruleType,
      priority: rule.priority ?? 0
    }));
  }
}

export const ruleEngine = new RuleEngine();
