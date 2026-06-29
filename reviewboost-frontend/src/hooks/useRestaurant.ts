import { useQuery } from '@tanstack/react-query'
import { reviewApi } from '@/api/reviewApi'

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: ['restaurant', slug],
    queryFn: () => reviewApi.getRestaurant(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  })
}
