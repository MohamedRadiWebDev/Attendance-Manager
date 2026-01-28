import { useState } from "react";
import { useImportFile } from "@/hooks/use-import";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildApiUrl } from "@/lib/api";
import { OFFLINE_MODE } from "@/lib/offlineStore";
import * as XLSX from "xlsx";

const columnSpecs = {
  master: {
    required: ["كود", "الاسم"],
    optional: ["القسم", "الوظيفة", "الفرع", "تاريخ_التعيين", "بداية_الوردية", "نهاية_الوردية"],
  },
  punches: {
    required: ["كود", "التاريخ_والوقت"],
    optional: [],
  },
  missions: {
    required: ["كود", "التاريخ"],
    optional: ["وقت_البداية", "وقت_النهاية", "الوصف"],
  },
  leaves: {
    required: ["كود", "تاريخ_البداية", "تاريخ_النهاية"],
    optional: ["نوع_الاجازة", "ملاحظات"],
  },
};

export default function ImportData() {
  const { mutate: uploadFile, isPending, data: lastResult } = useImportFile();
  const [activeTab, setActiveTab] = useState<'punches' | 'master' | 'missions' | 'leaves'>('master');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile({ type: activeTab, file: e.target.files[0] });
    }
  };

  const downloadTemplate = (type: string) => {
    if (!OFFLINE_MODE) {
      window.open(buildApiUrl(`/api/templates/${type}`), "_blank");
      return;
    }

    const wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet([[]]);
    let filename = "template.xlsx";

    if (type === "master") {
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "الاسم", "القسم", "الوظيفة", "الفرع", "تاريخ_التعيين", "بداية_الوردية", "نهاية_الوردية"],
        ["EMP001", "أحمد محمد", "الحسابات", "محاسب", "القاهرة", "2020-01-15", "08:00", "16:00"],
        ["EMP002", "محمد علي", "الموارد البشرية", "خدمات معاونة", "الجيزة", "2019-05-20", "08:00", "16:00"],
      ]);
      filename = "template_master_data.xlsx";
    } else if (type === "punches") {
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "التاريخ_والوقت"],
        ["EMP001", "2025-12-15 08:05:00"],
        ["EMP001", "2025-12-15 16:30:00"],
        ["EMP002", "2025-12-15 08:15:00"],
        ["EMP002", "2025-12-15 15:45:00"],
      ]);
      filename = "template_punches.xlsx";
    } else if (type === "missions") {
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "التاريخ", "وقت_البداية", "وقت_النهاية", "الوصف"],
        ["EMP001", "2025-12-16", "09:00", "14:00", "مأمورية خارجية"],
      ]);
      filename = "template_missions.xlsx";
    } else if (type === "leaves") {
      ws = XLSX.utils.aoa_to_sheet([
        ["كود", "تاريخ_البداية", "تاريخ_النهاية", "نوع_الاجازة", "ملاحظات"],
        ["EMP001", "2025-12-20", "2025-12-22", "اجازة عارضة", ""],
      ]);
      filename = "template_leaves.xlsx";
    }

    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'master', label: 'بيانات الموظفين', icon: Upload },
    { id: 'punches', label: 'حركات البصمة', icon: FileSpreadsheet },
    { id: 'missions', label: 'المأموريات', icon: FileSpreadsheet },
    { id: 'leaves', label: 'الأجازات', icon: FileSpreadsheet },
  ] as const;

  const currentSpec = columnSpecs[activeTab];

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
              data-testid={`tab-${tab.id}`}
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

        <div className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-2">
                رفع ملف {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                اسحب الملف هنا أو اضغط للاختيار
              </p>

              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isPending}
                  data-testid={`input-file-${activeTab}`}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button
                  disabled={isPending}
                  data-testid={`button-upload-${activeTab}`}
                  className={cn(
                    "px-6 py-2.5 rounded-lg font-semibold transition-all duration-200",
                    isPending 
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {isPending ? "جاري الرفع..." : "اختر الملف"}
                </button>
              </div>

              {lastResult && (
                <div className={cn(
                  "mt-6 p-4 rounded-lg w-full text-right",
                  lastResult.count > 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"
                )}>
                  <p className={cn(
                    "font-semibold",
                    lastResult.count > 0 ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
                  )}>
                    {lastResult.count > 0 ? (
                      <>تم استيراد {lastResult.count} سجل بنجاح</>
                    ) : (
                      <>لم يتم استيراد أي سجلات - تحقق من أسماء الأعمدة</>
                    )}
                  </p>
                  {lastResult.errors && lastResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-red-600 dark:text-red-400 space-y-1">
                      {lastResult.errors.slice(0, 5).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                      {lastResult.errors.length > 5 && (
                        <li>... و {lastResult.errors.length - 5} أخطاء أخرى</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="lg:w-80 space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="font-bold text-sm mb-3 text-foreground">الأعمدة المطلوبة</h4>
                <div className="flex flex-wrap gap-2">
                  {currentSpec.required.map((col) => (
                    <span key={col} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {currentSpec.optional.length > 0 && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <h4 className="font-bold text-sm mb-3 text-foreground">أعمدة اختيارية</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentSpec.optional.map((col) => (
                      <span key={col} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => downloadTemplate(activeTab)}
                data-testid={`button-download-template-${activeTab}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-accent-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                تحميل نموذج القالب
              </button>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-6 border-t border-border">
          <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            تعليمات هامة
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>تأكد من عدم وجود صفوف فارغة في بداية الملف.</li>
            <li>أسماء الأعمدة يجب أن تكون في الصف الأول تماماً.</li>
            <li>صيغة التاريخ: YYYY-MM-DD أو DD/MM/YYYY.</li>
            <li>صيغة الوقت: HH:mm أو HH:mm:ss.</li>
            <li>حمّل القالب واملأه ببياناتك للتأكد من التنسيق الصحيح.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
