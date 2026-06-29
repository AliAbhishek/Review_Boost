import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ownerApi } from '@/api/ownerApi'
import { reviewApi } from '@/api/reviewApi'
import type { ReviewLogPayload } from '@/types/review'

export function useOwnerReviews() {
  return useQuery({
    queryKey: ['owner-reviews'],
    queryFn: ownerApi.getReviews,
  })
}

export function useLogReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ReviewLogPayload) => reviewApi.logReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-reviews'] })
    },
  })
}

export function useOwnerStats() {
  return useQuery({
    queryKey: ['owner-stats'],
    queryFn: ownerApi.getStats,
  })
}
