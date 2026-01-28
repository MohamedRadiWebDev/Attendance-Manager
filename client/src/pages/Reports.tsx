import { useExportAttendance, useExportSummary } from "@/hooks/use-attendance";
import { FileDown, FileText, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

export default function Reports() {
  const { mutate: exportAttendance, isPending: loadingAttendance } = useExportAttendance();
  const { mutate: exportSummary, isPending: loadingSummary } = useExportSummary();

  const handleDownload = (data: any, filename: string) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-cairo text-foreground">التقارير</h1>
        <p className="text-muted-foreground mt-2">تصدير تقارير الحضور والملخصات الشهرية.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:border-primary/50 transition-colors group">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold font-cairo mb-2">تقرير الحضور التفصيلي</h3>
          <p className="text-muted-foreground mb-6 h-12">
            تصدير ملف Excel يحتوي على جميع سجلات الحضور اليومية، التأخيرات، والغياب.
          </p>
          <button
            onClick={() => exportAttendance(undefined, { onSuccess: (data) => handleDownload(data, 'attendance_detailed.xlsx') })}
            disabled={loadingAttendance}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loadingAttendance ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            تصدير التقرير
          </button>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:border-emerald-500/50 transition-colors group">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FileText className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold font-cairo mb-2">الملخص الشهري للرواتب</h3>
          <p className="text-muted-foreground mb-6 h-12">
            تصدير ملخص جاهز للمرتبات يحتوي على إجمالي أيام الخصم، الغياب، والإضافي لكل موظف.
          </p>
          <button
            onClick={() => exportSummary(undefined, { onSuccess: (data) => handleDownload(data, 'monthly_summary.xlsx') })}
            disabled={loadingSummary}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loadingSummary ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            تصدير التقرير
          </button>
        </div>
      </div>
    </div>
  );
}
