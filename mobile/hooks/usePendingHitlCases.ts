import { useQuery } from "@tanstack/react-query";
import { fetchPendingHitlCases } from "@/lib/api";
import { useAuth } from "@/contexts/AuthProvider";

export function usePendingHitlCases() {
  const { authToken, apiKey } = useAuth();

  return useQuery({
    queryKey: ["hitl", "pending", authToken ?? "anon"],
    queryFn: () => fetchPendingHitlCases(authToken ?? undefined, apiKey),
    staleTime: 30_000,
  });
}
