import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { localStore } from "@/lib/localStorage";
import { Loader2, Fingerprint, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useEmployees } from "@/hooks/use-employees";

export default function Punches() {
  const [search, setSearch] = useState("");
  const { data: punches, isLoading } = useQuery({
    queryKey: [api.punches.list.path],
    queryFn: () => localStore.getAllPunches(),
  });
  const { data: employees } = useEmployees();

  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    employees?.forEach(e => map.set(e.code, e.name));
    return map;
  }, [employees]);

  const filteredPunches = useMemo(() => {
    if (!punches) return [];
    // Sort by timestamp desc
    const sorted = [...punches].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (!search) return sorted;
    return sorted.filter(p => 
      p.employeeCode.includes(search) || 
      (employeeMap.get(p.employeeCode) || "").includes(search) ||
      p.timestamp.includes(search)
    );
  }, [punches, search, employeeMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold font-cairo">حركات البصمة</h1>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالكود أو الاسم..."
            className="w-full bg-card border border-border rounded-xl pl-4 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold font-cairo">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">التاريخ والوقت</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">القيمة الأصلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPunches.slice(0, 500).map((punch: any) => (
                <tr key={punch.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{employeeMap.get(punch.employeeCode) || "موظف غير مسجل"}</span>
                      <span className="text-xs text-muted-foreground font-mono">{punch.employeeCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                    {punch.timestamp}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {punch.originalValue || "-"}
                  </td>
                </tr>
              ))}
              {filteredPunches.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground font-cairo">
                    لا توجد حركات بصمة مسجلة
                  </td>
                </tr>
              )}
              {filteredPunches.length > 500 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-xs text-muted-foreground bg-muted/10 italic">
                    يتم عرض أول 500 حركة فقط من أصل {filteredPunches.length}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
