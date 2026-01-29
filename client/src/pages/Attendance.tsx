import { useState, useMemo, useCallback } from "react";
import { useAttendance, useCalculateAttendance } from "@/hooks/use-attendance";
import { useEmployees } from "@/hooks/use-employees";
import { normalizeArabic, buildSearchIndex, matchesSearch } from "@/lib/arabicSearch";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Loader2, 
  RefreshCw, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Info,
  X,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AuditTrace = {
  rawPunches: string[];
  appliedMissions: string[];
  appliedPermissions: string[];
  appliedLeaves: string[];
  appliedRules: { ruleId: number; ruleName: string; ruleType: string; priority: number }[];
  shiftUsed: { start: string; end: string };
  firstStampSource: string;
  lastStampSource: string;
  penalties: { type: string; value: number; reason: string; suppressed: boolean }[];
  overtimeDetails: { type: string; minutes: number; reason: string }[];
  notes: string[];
};

function parseAudit(logs: string[] | null): AuditTrace | null {
  if (!logs) return null;
  const auditLog = logs.find(l => l.startsWith("Audit:"));
  if (!auditLog) return null;
  try {
    return JSON.parse(auditLog.replace("Audit: ", ""));
  } catch {
    return null;
  }
}

export default function Attendance() {
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: attendance, isLoading } = useAttendance();
  const { data: employees } = useEmployees();
  const { mutate: calculate, isPending: isCalculating } = useCalculateAttendance();

  // Auto-calculate if data was just imported
  useMemo(() => {
    const handler = () => {
      if (!isCalculating) {
        calculate(undefined);
      }
    };
    window.addEventListener('data_imported', handler);
    return () => window.removeEventListener('data_imported', handler);
  }, [calculate, isCalculating]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, { name: string; department: string; branch: string }>();
    employees?.forEach((e: any) => {
      map.set(e.code, { name: e.name, department: e.department || "", branch: e.branch || "" });
    });
    return map;
  }, [employees]);

  const getEmployeeInfo = useCallback((code: string) => {
    return employeeMap.get(code) || { name: code, department: "", branch: "" };
  }, [employeeMap]);

  const filteredData = useMemo(() => {
    if (!attendance) return [];
    
    // Sort attendance by date descending
    const sorted = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (!search) return sorted;

    const normalizedSearch = normalizeArabic(search);
    
    return sorted.filter(record => {
      const emp = getEmployeeInfo(record.employeeCode);
      const searchIndex = buildSearchIndex([
        record.employeeCode,
        emp.name,
        emp.department,
        emp.branch,
        record.date
      ]);
      return searchIndex.includes(normalizedSearch);
    });
  }, [attendance, search, getEmployeeInfo]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getStatusBadge = (record: any) => {
    if (record.isAbsent) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">
        <XCircle className="w-3 h-3" /> غياب
      </span>
    );
    if (record.isLeave) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
        إجازة
      </span>
    );
    if (record.isMission) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
        <Briefcase className="w-3 h-3" /> مأمورية
      </span>
    );
    if (record.totalDeduction && record.totalDeduction > 0) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
        <Clock className="w-3 h-3" /> جزاء/تأخير
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" /> حضور
      </span>
    );
  };

  const audit = selectedRecord ? parseAudit(selectedRecord.logs || null) : null;

  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-foreground">الحضور والانصراف</h1>
          <p className="text-muted-foreground mt-2">عرض تفصيلي لسجلات الحضور اليومية.</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={() => calculate(undefined)}
            disabled={isCalculating}
            data-testid="button-calculate"
          >
            {isCalculating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RefreshCw className="w-4 h-4 ml-2" />}
            احتساب الحضور
          </Button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الكود، القسم، أو الفرع..."
            className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            data-testid="input-search"
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredData.length} سجل
        </div>
      </div>

      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الوردية</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">دخول</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">خروج</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الحالة</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الخصم</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الإضافي</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">جاري تحميل البيانات...</p>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-20 text-muted-foreground">
                    لا توجد سجلات مطابقة
                  </td>
                </tr>
              ) : (
                paginatedData.map((record) => {
                  const emp = getEmployeeInfo(record.employeeCode);
                  const recordDate = new Date(record.date);
                  const formattedDate = isValid(recordDate) 
                    ? format(recordDate, 'dd MMMM yyyy', { locale: ar })
                    : record.date;
                    
                  return (
                    <tr key={record.id} className="group hover:bg-muted/30 transition-colors" data-testid={`row-attendance-${record.id}`}>
                      <td className="px-6 py-4 text-sm font-medium">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">
                            {emp.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {record.employeeCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {record.shiftStart} - {record.shiftEnd}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                        {record.firstPunch || '--:--'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                        {record.lastPunch || '--:--'}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(record)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {record.totalDeduction ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold">
                            {record.totalDeduction} يوم
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                         {record.totalOvertime ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {Number(record.totalOvertime).toFixed(1)} س
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedRecord(record)}
                          data-testid={`button-audit-${record.id}`}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                السابق
              </Button>
              <div className="flex items-center gap-1 px-4 text-sm font-medium">
                صفحة {page} من {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                التالي
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              عرض {paginatedData.length} من أصل {filteredData.length} سجل
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo text-right flex items-center gap-2">
              <Info className="w-5 h-5" />
              تفاصيل التدقيق
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4 pt-4 text-right">
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الموظف:</span>
                    <span className="font-bold mr-2">{getEmployeeInfo(selectedRecord.employeeCode).name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">التاريخ:</span>
                    <span className="font-bold mr-2">
                      {isValid(new Date(selectedRecord.date)) 
                        ? format(new Date(selectedRecord.date), 'dd MMMM yyyy', { locale: ar })
                        : selectedRecord.date}
                    </span>
                  </div>
                </div>
              </div>

              {audit && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      البصمات الأصلية
                    </h4>
                    <div className="bg-card p-3 rounded-lg border border-border text-sm font-mono">
                      {audit.rawPunches.length > 0 ? (
                        audit.rawPunches.map((p, i) => (
                          <div key={i}>{p}</div>
                        ))
                      ) : (
                        <span className="text-muted-foreground">لا توجد بصمات</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-sm">الوردية المستخدمة</h4>
                    <div className="bg-card p-3 rounded-lg border border-border text-sm">
                      {audit.shiftUsed.start} - {audit.shiftUsed.end}
                      <span className="text-muted-foreground mr-2">
                        (الدخول من: {audit.firstStampSource === 'biometric' ? 'البصمة' : 'مأمورية'}, 
                        الخروج من: {audit.lastStampSource === 'biometric' ? 'البصمة' : 'مأمورية'})
                      </span>
                    </div>
                  </div>

                  {audit.appliedRules.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm">القواعد المطبقة</h4>
                      <div className="space-y-1">
                        {audit.appliedRules.map((rule, i) => (
                          <div key={i} className="bg-primary/10 text-primary p-2 rounded text-sm flex justify-between">
                            <span>{rule.ruleName}</span>
                            <span className="text-xs opacity-70">أولوية: {rule.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {audit.appliedMissions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm">المأموريات</h4>
                      <div className="space-y-1">
                        {audit.appliedMissions.map((m, i) => (
                          <div key={i} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-2 rounded text-sm">
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {audit.appliedLeaves.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm">الإجازات</h4>
                      <div className="space-y-1">
                        {audit.appliedLeaves.map((l, i) => (
                          <div key={i} className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 p-2 rounded text-sm">
                            {l}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {audit.penalties.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm">الخصومات</h4>
                      <div className="space-y-1">
                        {audit.penalties.map((p, i) => (
                          <div key={i} className={cn(
                            "p-2 rounded text-sm flex justify-between",
                            p.suppressed 
                              ? "bg-muted text-muted-foreground line-through" 
                              : "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300"
                          )}>
                            <span>{p.reason}</span>
                            <span className="font-bold">{p.value} يوم</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {audit.overtimeDetails.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm">العمل الإضافي</h4>
                      <div className="space-y-1">
                        {audit.overtimeDetails.map((o, i) => (
                          <div key={i} className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-2 rounded text-sm flex justify-between">
                            <span>{o.reason}</span>
                            <span className="font-bold">{Math.round(o.minutes)} دقيقة</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {audit.notes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm">ملاحظات</h4>
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg text-sm">
                        {audit.notes.map((n, i) => (
                          <div key={i}>{n}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!audit && selectedRecord.logs && (
                <div className="space-y-2">
                  <h4 className="font-bold text-sm">سجل المعالجة</h4>
                  <div className="bg-card p-3 rounded-lg border border-border text-sm space-y-1">
                    {selectedRecord.logs.filter((l: string) => !l.startsWith("Audit:")).map((log: string, i: number) => (
                      <div key={i} className="text-muted-foreground">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
