import { useState } from "react";
import { useAttendance, useCalculateAttendance } from "@/hooks/use-attendance";
import { useEmployees } from "@/hooks/use-employees";
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
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Attendance() {
  const [search, setSearch] = useState("");
  const { data: attendance, isLoading } = useAttendance();
  const { data: employees } = useEmployees();
  const { mutate: calculate, isPending: isCalculating } = useCalculateAttendance();

  // Helper to get employee name from code
  const getEmployeeName = (code: string) => {
    return employees?.find(e => e.code === code)?.name || code;
  };

  // Filter data based on search
  const filteredData = attendance?.filter(record => 
    record.employeeCode.includes(search) || 
    getEmployeeName(record.employeeCode).includes(search)
  ) || [];

  const getStatusBadge = (record: any) => {
    if (record.isAbsent) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
        <XCircle className="w-3 h-3" /> غياب
      </span>
    );
    if (record.isMission) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <Briefcase className="w-3 h-3" /> مأمورية
      </span>
    );
    if (record.totalDeduction && record.totalDeduction > 0) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3" /> جزاء/تأخير
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> حضور
      </span>
    );
  };

  return (
    <div className="space-y-8 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-foreground">الحضور والانصراف</h1>
          <p className="text-muted-foreground mt-2">عرض تفصيلي لسجلات الحضور اليومية.</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => calculate()}
            disabled={isCalculating}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            احتساب الحضور
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف أو الكود..."
            className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button className="p-2 hover:bg-muted rounded-lg border border-transparent hover:border-border transition-all">
          <Filter className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Data Grid */}
      <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">دخول</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">خروج</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الحالة</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الخصم</th>
                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground font-cairo">الإضافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">جاري تحميل البيانات...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-muted-foreground">
                    لا توجد سجلات مطابقة
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => (
                  <tr key={record.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">
                      {format(new Date(record.date), 'dd MMMM yyyy', { locale: ar })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">
                          {getEmployeeName(record.employeeCode)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {record.employeeCode}
                        </span>
                      </div>
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
                        <span className="text-rose-600 font-bold">
                          {record.totalDeduction} يوم
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                       {record.totalOvertime ? (
                        <span className="text-emerald-600 font-bold">
                          {record.totalOvertime} س
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
