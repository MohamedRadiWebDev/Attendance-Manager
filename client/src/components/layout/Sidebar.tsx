import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  FileUp, 
  AlertTriangle, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "لوحة المعلومات", href: "/", icon: LayoutDashboard },
  { name: "الحضور والانصراف", href: "/attendance", icon: CalendarDays },
  { name: "استيراد البيانات", href: "/import", icon: FileUp },
  { name: "حالات خاصة", href: "/special-cases", icon: AlertTriangle },
  { name: "الموظفين", href: "/employees", icon: Users },
  { name: "التقارير", href: "/reports", icon: FileText },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full w-64 bg-card border-l border-border shadow-xl z-20">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold font-cairo text-foreground">نظام الموارد البشرية</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4">
          <p className="text-xs text-primary/80 font-medium">الإصدار ١.٠.٠</p>
          <p className="text-[10px] text-muted-foreground mt-1">جميع الحقوق محفوظة © ٢٠٢٤</p>
        </div>
      </div>
    </div>
  );
}
