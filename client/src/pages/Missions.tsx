import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useEmployees } from "@/hooks/use-employees";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plane } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { localStore } from "@/lib/localStorage";

export default function Missions() {
  const { data: missions, isLoading } = useQuery({
    queryKey: [api.missions.list.path],
    queryFn: () => localStore.getAllMissions(),
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
        <Plane className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-cairo">سجل المأموريات</h1>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-sm font-semibold font-cairo">الموظف</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">التاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">الوقت</th>
                <th className="px-6 py-4 text-sm font-semibold font-cairo">الوصف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {missions?.map((mission: any) => (
                <tr key={mission.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{employeeMap.get(mission.employeeCode) || mission.employeeCode}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{format(new Date(mission.date), 'dd MMMM yyyy', { locale: ar })}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{mission.startTime} - {mission.endTime}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{mission.description}</td>
                </tr>
              ))}
              {missions?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">لا توجد مأموريات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
