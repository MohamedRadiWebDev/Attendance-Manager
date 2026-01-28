import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

type ImportType = 'punches' | 'master' | 'missions' | 'leaves';

export function useImportFile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ type, file }: { type: ImportType; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const url = buildUrl(api.import.upload.path, { type });
      const res = await fetch(url, {
        method: api.import.upload.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("فشل رفع الملف");
      }
      return api.import.upload.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "تم الاستيراد مع وجود تحذيرات",
          description: `تمت معالجة ${data.count} سجل، ولكن وجدت بعض الأخطاء.`,
          variant: "warning",
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
