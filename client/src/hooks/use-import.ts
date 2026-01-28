import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getApiFetch, MOCK_MODE } from "@/lib/mockData";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves';

export function useImportFile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, file }: { type: ImportType; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const url = buildUrl(api.import.upload.path, { type });
      const apiFetch = getApiFetch();
      const res = await apiFetch(url, {
        method: api.import.upload.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("فشل رفع الملف");
      }
      const data = await res.json();
      return MOCK_MODE ? data : api.import.upload.responses[200].parse(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.employees.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      
      if (data.count === 0) {
        toast({
          title: "لم يتم استيراد أي سجلات",
          description: "تحقق من أسماء الأعمدة في ملف Excel.",
          variant: "destructive",
        });
      } else if (data.errors && data.errors.length > 0) {
        toast({
          title: "تم الاستيراد مع وجود تحذيرات",
          description: `تمت معالجة ${data.count} سجل، ولكن وجدت بعض الأخطاء.`,
          variant: "default",
        });
      } else {
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تمت معالجة ${data.count} سجل بنجاح.`,
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "خطأ في الاستيراد",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
