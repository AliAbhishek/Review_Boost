import client from './client'
import type { Bill } from '@/types/bill'
import type { VoucherValidation } from '@/types/voucher'

type Wrapped<T> = { status: string; data: T }
type Paginated<T> = { status: string; data: T[]; pagination: { page: number; limit: number; total: number; pages: number } }

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'custom'

export interface AnalyticsSummary {
  totalRevenue: number
  totalBills: number
  avgOrder: number
  totalItems: number
  prevRevenue: number
  prevBills: number
}

export interface TimelinePoint {
  label: string
  revenue: number
  bills: number
}

export interface LeaderboardItem {
  name: string
  category: string
  price: number
  originalPrice?: number
  discountPercent?: number
  quantity: number
  revenue: number
  orders: number
  isAvailable: boolean
  _id: string
}

export interface VoucherStats {
  issued: number
  redeemed: number
  pending: number
  totalDiscount: number
  redemptionRate: number
}

export interface AnalyticsData {
  summary: AnalyticsSummary
  vouchers: VoucherStats
  timeline: TimelinePoint[]
  leaderboard: LeaderboardItem[]
  period: { from: string; to: string }
}

export const billApi = {
  create: (data: {
    customer: { name: string; email?: string; phone?: string }
    items: { name: string; price: number; quantity: number }[]
    voucherCode?: string
  }) =>
    client
      .post<Wrapped<{ bill: Bill }>>('/api/bills', data)
      .then((r) => r.data.data.bill),

  validateVoucher: (code: string) =>
    client
      .get<Wrapped<VoucherValidation>>(`/api/bills/validate-voucher?code=${encodeURIComponent(code)}`)
      .then((r) => r.data.data),

  list: (page = 1) =>
    client
      .get<Paginated<Bill>>(`/api/bills?page=${page}&limit=20`)
      .then((r) => r.data),

  get: (id: string) =>
    client
      .get<Wrapped<{ bill: Bill }>>(`/api/bills/${id}`)
      .then((r) => r.data.data.bill),

  analytics: (period: AnalyticsPeriod, from?: string, to?: string) => {
    const params = new URLSearchParams({ period })
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    return client
      .get<Wrapped<AnalyticsData>>(`/api/bills/analytics?${params}`)
      .then((r) => r.data.data)
  },
}
