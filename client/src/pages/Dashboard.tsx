import { useEmployees } from "@/hooks/use-employees";
import { usePunches } from "@/hooks/use-punches";
import { useAttendance } from "@/hooks/use-attendance";
import { localStore } from "@/lib/localStorage";
import { Button } from "@/components/ui/button";
import { Trash2, Database, Users, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const employeesQuery = useEmployees();
  const punchesQuery = usePunches();
  const attendanceQuery = useAttendance();

  const employees = employeesQuery.data || [];
  const punches = punchesQuery.data || [];
  const attendance = attendanceQuery.data || [];

  const clearData = () => {
    if (confirm("هل أنت متأكد من مسح جميع البيانات؟")) {
      localStore.clearAll().then(() => window.location.reload());
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-2">نظرة عامة على حالة النظام والبيانات الحالية (LocalStorage).</p>
        </div>
        <Button variant="destructive" onClick={clearData} className="gap-2" data-testid="button-clear-data">
          <Trash2 className="w-4 h-4" />
          مسح البيانات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-cairo">إجمالي الموظفين</CardTitle>
            <div className="bg-primary/10 p-2 rounded-lg">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-employees-count">{employees.length}</div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-cairo">إجمالي البصمات</CardTitle>
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-punches-count">{punches.length}</div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-cairo">سجلات الحضور</CardTitle>
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-attendance-count">{attendance.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/30 p-6 rounded-2xl border border-dashed border-border text-center">
        <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">تنبيه تقني</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          يتم تخزين جميع البيانات حالياً في ذاكرة المتصفح المحلية (LocalStorage).
          في حالة مسح بيانات المتصفح أو الانتقال لجهاز آخر، ستختفي البيانات.
          تأكد من استيراد ملفات الإكسيل بانتظام.
        </p>
      </div>
    </div>
  );
}
