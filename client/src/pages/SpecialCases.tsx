import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSpecialRuleSchema, type InsertSpecialRule, RULE_TYPES, SCOPE_TYPES } from "@shared/schema";
import { useSpecialRules, useCreateSpecialRule, useDeleteSpecialRule } from "@/hooks/use-special-rules";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Calendar,
  Settings2,
  Users,
  Building,
  Globe,
  User,
  AlertOctagon,
  Moon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const RULE_TYPE_LABELS: Record<string, string> = {
  'CUSTOM_SHIFT': 'وردية مخصصة',
  'ATTENDANCE_EXEMPT': 'إعفاء من الحضور',
  'PENALTY_OVERRIDE': 'تعديل الخصومات',
  'IGNORE_BIOMETRIC': 'تجاهل البصمة',
  'OVERTIME_OVERNIGHT': 'عمل إضافي ليلي',
};

const SCOPE_TYPE_LABELS: Record<string, string> = {
  'employee': 'موظف محدد',
  'department': 'قسم',
  'branch': 'فرع',
  'all': 'الجميع',
};

const SCOPE_ICONS: Record<string, any> = {
  'employee': User,
  'department': Users,
  'branch': Building,
  'all': Globe,
};

export default function SpecialCases() {
  const [open, setOpen] = useState(false);
  const { data: rules, isLoading } = useSpecialRules();
  const { mutate: createRule, isPending: isCreating } = useCreateSpecialRule();
  const { mutate: deleteRule } = useDeleteSpecialRule();

  const form = useForm<InsertSpecialRule>({
    resolver: zodResolver(insertSpecialRuleSchema),
    defaultValues: {
      name: "",
      enabled: true,
      priority: 0,
      scopeType: "all",
      scopeValues: [],
      dateFrom: format(new Date(), "yyyy-MM-dd"),
      dateTo: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      daysOfWeek: [],
      ruleType: "ATTENDANCE_EXEMPT",
      params: {},
      notes: "",
    }
  });

  const selectedRuleType = form.watch("ruleType");
  const selectedScopeType = form.watch("scopeType");

  const onSubmit = (data: InsertSpecialRule) => {
    createRule(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-foreground">القواعد الخاصة</h1>
          <p className="text-muted-foreground mt-2">إدارة قواعد الورديات والاستثناءات.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-rule">
                <Plus className="w-4 h-4 ml-2" />
                إضافة قاعدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-cairo text-right">إضافة قاعدة جديدة</DialogTitle>
                <DialogDescription className="text-right">
                  أدخل تفاصيل القاعدة لتطبيقها على الموظفين المحددين.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم القاعدة</label>
                  <input
                    {...form.register("name")}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                    placeholder="مثال: وردية مسائية للأمن"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نوع القاعدة</label>
                    <select
                      {...form.register("ruleType")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                    >
                      {RULE_TYPES.map(type => (
                        <option key={type} value={type}>{RULE_TYPE_LABELS[type]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الأولوية</label>
                    <input
                      type="number"
                      {...form.register("priority", { valueAsNumber: true })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نطاق التطبيق</label>
                    <select
                      {...form.register("scopeType")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                    >
                      {SCOPE_TYPES.map(type => (
                        <option key={type} value={type}>{SCOPE_TYPE_LABELS[type]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">من تاريخ</label>
                    <input
                      type="date"
                      {...form.register("dateFrom")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">إلى تاريخ</label>
                    <input
                      type="date"
                      {...form.register("dateTo")}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rules?.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
            <AlertOctagon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد قواعد خاصة مسجلة حالياً</p>
          </div>
        ) : (
          rules?.map((rule) => {
            const ScopeIcon = SCOPE_ICONS[rule.scopeType] || Globe;
            return (
              <div key={rule.id} className="bg-card rounded-xl border border-border p-5 shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                      {rule.ruleType === 'OVERTIME_OVERNIGHT' ? <Moon className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteRule(rule.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-2">{rule.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">
                      {RULE_TYPE_LABELS[rule.ruleType]}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                      <ScopeIcon className="w-3 h-3" />
                      {SCOPE_TYPE_LABELS[rule.scopeType]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(rule.dateFrom), 'dd MMM', { locale: ar })} - {format(new Date(rule.dateTo), 'dd MMM yyyy', { locale: ar })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
