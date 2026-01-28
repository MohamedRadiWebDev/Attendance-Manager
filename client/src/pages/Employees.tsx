import { useEmployees } from "@/hooks/use-employees";
import { Loader2, Search, User } from "lucide-react";
import { useState } from "react";

export default function Employees() {
  const { data: employees, isLoading } = useEmployees();
  const [search, setSearch] = useState("");

  const filtered = employees?.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.code.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-foreground">الموظفين</h1>
          <p className="text-muted-foreground mt-2">قائمة بجميع الموظفين المسجلين في النظام.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف أو الكود..."
            className="w-full bg-card border border-border rounded-xl pl-4 pr-10 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center">
             <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
             <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            لا يوجد موظفين مطابقين للبحث.
          </div>
        ) : (
          filtered.map(emp => (
            <div key={emp.id} className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground line-clamp-1">{emp.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{emp.code}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">القسم:</span>
                  <span className="font-medium">{emp.department || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">الوظيفة:</span>
                  <span className="font-medium">{emp.job || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">الوردية:</span>
                  <span className="font-medium" dir="ltr">{emp.shiftStart} - {emp.shiftEnd}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
