import publicClient from './publicClient'
import type { Restaurant } from '@/types/restaurant'
import type { GenerateReviewsResponse, ReviewLog, ReviewLogPayload } from '@/types/review'
import type { Voucher } from '@/types/voucher'

export const reviewApi = {
  getRestaurant: (slug: string) =>
    publicClient
      .get<{ status: string; data: { restaurant: Restaurant } }>(`/api/review/${slug}`)
      .then((r) => r.data.data.restaurant),

  generateReviews: (slug: string, stars: number, token?: string) =>
    publicClient
      .post<{ status: string; data: GenerateReviewsResponse }>(`/api/review/generate`, { slug, stars, ...(token && { token }) })
      .then((r) => r.data.data),

  logReview: (data: ReviewLogPayload & { token?: string }) =>
    publicClient
      .post<{ status: string; data: { reviewLog: ReviewLog; voucher: Voucher | null } }>('/api/review/log', data)
      .then((r) => r.data.data),

  submitPrivateFeedback: (data: { slug: string; stars: number; feedback: string; token?: string }) =>
    publicClient
      .post<{ status: string; data: { reviewLog: ReviewLog; voucher: Voucher | null } }>('/api/review/log', {
        slug:       data.slug,
        stars:      data.stars,
        reviewText: data.feedback,
        wasEdited:  false,
        token:      data.token,
      })
      .then((r) => r.data.data),
}
