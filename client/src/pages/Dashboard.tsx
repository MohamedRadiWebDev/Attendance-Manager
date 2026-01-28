import { useAttendance } from "@/hooks/use-attendance";
import { useEmployees } from "@/hooks/use-employees";
import { StatCard } from "@/components/ui/StatCard";
import { Users, AlertTriangle, Clock, XCircle } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { data: employees } = useEmployees();
  const { data: attendance } = useAttendance();

  const totalEmployees = employees?.length || 0;
  const missingPunches = attendance?.filter(r => !r.firstPunch && !r.isAbsent).length || 0;
  const lateArrivals = attendance?.filter(r => (r.latePenalty ?? 0) > 0).length || 0;
  const absentees = attendance?.filter(r => r.isAbsent).length || 0;

  const chartData = [
    { name: 'حضور', value: (attendance?.length || 0) - absentees - missingPunches, color: '#10b981' },
    { name: 'غياب', value: absentees, color: '#ef4444' },
    { name: 'تأخير', value: lateArrivals, color: '#f59e0b' },
    { name: 'نقص بصمة', value: missingPunches, color: '#64748b' },
  ].filter(d => d.value > 0);

  if (chartData.length === 0 && attendance?.length === 0) {
    chartData.push({ name: 'لا توجد بيانات', value: 1, color: '#e2e8f0' });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 rtl-grid">
      <div>
        <h1 className="text-3xl font-bold font-cairo text-foreground">لوحة المعلومات</h1>
        <p className="text-muted-foreground mt-2">نظرة عامة على حالة الحضور والانصراف لليوم.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي الموظفين" 
          value={totalEmployees} 
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard 
          title="نقص بصمات" 
          value={missingPunches} 
          icon={<AlertTriangle className="h-6 w-6" />}
          className="border-l-4 border-l-yellow-500"
        />
        <StatCard 
          title="تأخيرات اليوم" 
          value={lateArrivals} 
          icon={<Clock className="h-6 w-6" />}
          className="border-l-4 border-l-orange-500"
        />
        <StatCard 
          title="الغياب" 
          value={absentees} 
          icon={<XCircle className="h-6 w-6" />}
          className="border-l-4 border-l-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-bold font-cairo mb-6">إحصائيات الحضور</h3>
          <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: 'rtl' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-bold font-cairo mb-6">توزيع الحالات</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
