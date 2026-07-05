import adminClient from './adminClient'
import type { Restaurant, CreateRestaurantDto, UpdateRestaurantDto } from '@/types/restaurant'

interface AdminAuthPayload {
  token: string
  admin: { _id: string; email: string; name: string }
}

export interface AdminMenuItem {
  _id: string
  name: string
  category: string
  price: number
  originalPrice?: number
  discountPercent?: number
  isAvailable: boolean
}

export interface AdminOrder {
  _id: string
  kotNumber: string
  tableNumber?: string
  customer: { name: string; phone?: string; email?: string }
  items: { name: string; quantity: number; price: number }[]
  subtotal: number
  status: string
  orderedBy: string
  staffName?: string
  createdAt: string
}

export interface AdminBill {
  _id: string
  receiptNumber: string
  customer: { name: string; phone?: string; email?: string }
  items: { name: string; price: number; quantity: number; subtotal: number }[]
  subtotal: number
  grandTotal: number
  totalTax: number
  staffName?: string
  reviewedAt?: string
  createdAt: string
}

export interface AdminReview {
  _id: string
  stars: number
  reviewText: string
  submittedTo: string
  wasEdited: boolean
  timestamp: string
}

export interface AdminStaffStat {
  name: string
  bills: number
  revenue: number
}

export interface RestaurantOverview {
  restaurant: Restaurant
  menuItems: AdminMenuItem[]
  recentOrders: AdminOrder[]
  recentBills: AdminBill[]
  recentReviews: AdminReview[]
  staffStats: AdminStaffStat[]
  stats: {
    totalOrders: number
    totalBills: number
    totalRevenue: number
    totalReviews: number
    avgRating: number
    menuItemCount: number
  }
}

interface AdminStats {
  totalRestaurants: number
  totalReviews: number
  totalOrders: number
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

  getRestaurant: (slug: string) =>
    adminClient
      .get<Wrapped<{ restaurant: Restaurant; reviewStats: { count: number; avgStars: number } }>>(`/api/admin/restaurant/${slug}`)
      .then((r) => r.data.data),

  getRestaurantMenu: (id: string) =>
    adminClient
      .get<Wrapped<{ items: AdminMenuItem[] }>>(`/api/admin/restaurant/${id}/menu`)
      .then((r) => r.data.data.items),

  getRestaurantOverview: (id: string) =>
    adminClient
      .get<Wrapped<RestaurantOverview>>(`/api/admin/restaurant/${id}/overview`)
      .then((r) => r.data.data),
}
