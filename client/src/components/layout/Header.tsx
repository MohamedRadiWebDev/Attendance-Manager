import { Bell, Search, User } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="بحث..." 
            className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full ring-2 ring-card" />
        </button>
        
        <div className="h-8 w-px bg-border mx-2" />
        
        <div className="flex items-center gap-3">
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-foreground">مدير النظام</p>
            <p className="text-xs text-muted-foreground">قسم الموارد البشرية</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
