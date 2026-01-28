import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useEmployees } from "@/hooks/use-employees";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { localStore } from "@/lib/localStorage";

export default function Leaves() {
  const { data: leaves, isLoading } = useQuery({
    queryKey: [api.leaves.list.path],
    queryFn: () => localStore.getAllLeaves(),
  });
  const { data: employees } = useEmployees();

  const employeeMap = new Map<string, string>();
  employees?.forEach(e => employeeMap.set(e.code, e.name));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <Calendar className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-cairo">سجل الإجازات</h1>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold font-cairo">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">من تاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">إلى تاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">النوع</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaves?.map((leave: any) => (
                <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{employeeMap.get(leave.employeeCode) || leave.employeeCode}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{format(new Date(leave.startDate), 'dd MMMM yyyy', { locale: ar })}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{format(new Date(leave.endDate), 'dd MMMM yyyy', { locale: ar })}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                      {leave.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{leave.details}</td>
                </tr>
              ))}
              {leaves?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">لا توجد إجازات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
