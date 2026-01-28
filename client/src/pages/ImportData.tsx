import { useState } from "react";
import { useImportFile } from "@/hooks/use-import";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImportData() {
  const { mutate: uploadFile, isPending } = useImportFile();
  const [activeTab, setActiveTab] = useState<'punches' | 'master' | 'missions' | 'leaves'>('punches');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile({ type: activeTab, file: e.target.files[0] });
    }
  };

  const tabs = [
    { id: 'punches', label: 'حركات البصمة', icon: FileSpreadsheet },
    { id: 'master', label: 'بيانات الموظفين', icon: Upload },
    { id: 'missions', label: 'المأموريات', icon: FileSpreadsheet },
    { id: 'leaves', label: 'الأجازات', icon: FileSpreadsheet },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-cairo text-foreground">استيراد البيانات</h1>
        <p className="text-muted-foreground mt-2">رفع ملفات Excel الخاصة بالنظام.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                activeTab === tab.id
                  ? "bg-primary/5 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-2">
            اختر ملف {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p className="text-muted-foreground max-w-sm mb-8">
            يجب أن يكون الملف بصيغة Excel (.xlsx, .xls) ويحتوي على الأعمدة المطلوبة بالتنسيق الصحيح.
          </p>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isPending}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              disabled={isPending}
              className={cn(
                "px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 ease-out",
                isPending 
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {isPending ? "جاري الرفع..." : "اختر الملف من جهازك"}
            </button>
          </div>
        </div>

        <div className="bg-muted/30 p-6 border-t border-border">
          <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            تعليمات هامة
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>تأكد من عدم وجود صفوف فارغة في بداية الملف.</li>
            <li>صيغة التاريخ يجب أن تكون YYYY-MM-DD.</li>
            <li>تأكد من مطابقة كود الموظف في جميع الملفات.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
