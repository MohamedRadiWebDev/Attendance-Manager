import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSpecialCaseSchema, type InsertSpecialCase } from "@shared/schema";
import { useSpecialCases, useCreateSpecialCase, useDeleteSpecialCase } from "@/hooks/use-special-cases";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Calendar,
  User,
  AlertOctagon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SpecialCases() {
  const [open, setOpen] = useState(false);
  const { data: cases, isLoading } = useSpecialCases();
  const { mutate: createCase, isPending: isCreating } = useCreateSpecialCase();
  const { mutate: deleteCase, isPending: isDeleting } = useDeleteSpecialCase();

  const form = useForm<InsertSpecialCase>({
    resolver: zodResolver(insertSpecialCaseSchema),
    defaultValues: {
      ruleType: "Exempt",
    }
  });

  const onSubmit = (data: InsertSpecialCase) => {
    createCase(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-foreground">حالات خاصة</h1>
          <p className="text-muted-foreground mt-2">إدارة الاستثناءات وقواعد الورديات الخاصة.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg hover:shadow-primary/25 hover:bg-primary/90 transition-all">
              <Plus className="w-5 h-5" />
              إضافة حالة جديدة
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-cairo text-right">إضافة حالة خاصة</DialogTitle>
              <DialogDescription className="text-right">
                أدخل تفاصيل الحالة الخاصة لتطبيقها على الموظف المحدد.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">كود الموظف</label>
                <input
                  {...form.register("employeeCode")}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="EMP-001"
                />
                {form.formState.errors.employeeCode && (
                  <p className="text-xs text-destructive">{form.formState.errors.employeeCode.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ البدء</label>
                  <input
                    type="date"
                    {...form.register("startDate")}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    {...form.register("endDate")}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  {form.formState.errors.endDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">نوع القاعدة</label>
                <select
                  {...form.register("ruleType")}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="Exempt">إعفاء من التوقيع (Exempt)</option>
                  <option value="CustomShift">وردية خاصة (CustomShift)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isCreating ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cases?.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
            <AlertOctagon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد حالات خاصة مسجلة حالياً</p>
          </div>
        ) : (
          cases?.map((item) => (
            <div key={item.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                  <User className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => deleteCase(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <h3 className="font-bold text-lg mb-1">{item.employeeCode}</h3>
                <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md font-medium">
                  {item.ruleType === 'Exempt' ? 'إعفاء من التوقيع' : 'وردية خاصة'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(item.startDate), 'dd MMM', { locale: ar })} - {format(new Date(item.endDate), 'dd MMM yyyy', { locale: ar })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
