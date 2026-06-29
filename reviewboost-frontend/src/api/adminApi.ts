import adminClient from './adminClient'
import type { Restaurant, CreateRestaurantDto, UpdateRestaurantDto } from '@/types/restaurant'

interface AdminAuthPayload {
  token: string
  admin: { _id: string; email: string; name: string }
}

interface AdminStats {
  totalRestaurants: number
  totalReviews: number
  activePlans: number
  revenue: number
}

type Wrapped<T> = { status: string; data: T }

export const adminApi = {
  login: (credentials: { email: string; password: string }) =>
    adminClient
      .post<Wrapped<AdminAuthPayload>>('/api/admin/auth/login', credentials)
      .then((r) => r.data.data),

  getRestaurants: () =>
    adminClient.get<unknown>('/api/admin/restaurants').then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = r.data as any
      if (Array.isArray(body)) return body as Restaurant[]
      if (Array.isArray(body?.data)) return body.data as Restaurant[]
      if (Array.isArray(body?.data?.restaurants)) return body.data.restaurants as Restaurant[]
      if (Array.isArray(body?.restaurants)) return body.restaurants as Restaurant[]
      return [] as Restaurant[]
    }),

  createRestaurant: (data: CreateRestaurantDto) =>
    adminClient
      .post<Wrapped<{ restaurant: Restaurant }>>('/api/admin/restaurant', data)
      .then((r) => r.data.data.restaurant),

  updateRestaurant: (id: string, data: UpdateRestaurantDto) =>
    adminClient
      .put<Wrapped<{ restaurant: Restaurant }>>(`/api/admin/restaurant/${id}`, data)
      .then((r) => r.data.data.restaurant),

  deleteRestaurant: (id: string) =>
    adminClient
      .delete<Wrapped<unknown>>(`/api/admin/restaurant/${id}`)
      .then((r) => r.data.data),

  getStats: () =>
    adminClient.get<Wrapped<AdminStats>>('/api/admin/stats').then((r) => r.data.data),
}
