import { useQuery } from "@tanstack/react-query";
import { localStore } from "@/lib/localStorage";
import { api } from "@shared/routes";
import { type Punch } from "@shared/schema";

export function usePunches() {
  return useQuery({
    queryKey: [api.punches.list.path],
    queryFn: async () => {
      return (await localStore.getAllPunches()) as Punch[];
    },
  });
}
