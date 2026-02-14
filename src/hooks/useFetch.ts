/**
 * Generic fetch hook - wraps React Query for simple GET requests
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

export function useFetch<T>(
  queryKey: unknown[],
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey,
    queryFn: fetcher,
    ...options,
  });
}
