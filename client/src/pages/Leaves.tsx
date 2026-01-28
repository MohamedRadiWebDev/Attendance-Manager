import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useEmployees } from "@/hooks/use-employees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Leaves() {
  const { data: leaves, isLoading } = useQuery({
    queryKey: [api.leaves.list.path],
  });
  const { data: employees } = useEmployees();

  const employeeMap = new Map();
  employees?.forEach(e => employeeMap.set(e.code, e.name));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-cairo">سجل الإجازات</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-6 py-4 text-sm font-semibold">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold">من تاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold">إلى تاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold">النوع</th>
                <th className="px-6 py-4 text-sm font-semibold">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaves?.map((leave: any) => (
                <tr key={leave.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 text-sm">{employeeMap.get(leave.employeeCode) || leave.employeeCode}</td>
                  <td className="px-6 py-4 text-sm">{format(new Date(leave.startDate), 'dd MMMM yyyy', { locale: ar })}</td>
                  <td className="px-6 py-4 text-sm">{format(new Date(leave.endDate), 'dd MMMM yyyy', { locale: ar })}</td>
                  <td className="px-6 py-4 text-sm"><span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">{leave.type}</span></td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{leave.details}</td>
                </tr>
              ))}
              {leaves?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">لا توجد إجازات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
