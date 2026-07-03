import axios from 'axios'
import client from './client'
import type { AuthResponse, LoginCredentials, DashboardStats } from '@/types/owner'
import type { Restaurant, UpdateRestaurantDto } from '@/types/restaurant'
import type { ReviewLog } from '@/types/review'
import type { Customer, AddCustomerDto } from '@/types/customer'
import type { Voucher, UpsertVoucherDto } from '@/types/voucher'

type Wrapped<T> = { status: string; data: T }
type Paginated<T> = { status: string; data: T[]; pagination: { page: number; limit: number; total: number; pages: number } }

const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

export const publicApi = {
  requestDemo: (data: { businessName: string; email: string; businessType: string }) =>
    publicClient
      .post<Wrapped<{ message: string }>>('/api/public/request-demo', data)
      .then((r) => r.data.data),
}

export const ownerApi = {
  register: (data: { name: string; email: string; password: string; restaurantId: string }) =>
    publicClient
      .post<Wrapped<AuthResponse>>('/api/auth/register', data)
      .then((r) => r.data.data),

  login: (credentials: LoginCredentials) =>
    client
      .post<Wrapped<AuthResponse>>('/api/auth/login', credentials)
      .then((r) => r.data.data),

  getStats: () =>
    client
      .get<Wrapped<DashboardStats>>('/api/owner/stats')
      .then((r) => r.data.data),

  getReviews: () =>
    client
      .get<Wrapped<ReviewLog[]>>('/api/owner/reviews')
      .then((r) => r.data.data),

  getProfile: () =>
    client
      .get<Wrapped<Restaurant>>('/api/owner/profile')
      .then((r) => r.data.data),

  updateProfile: (data: UpdateRestaurantDto) =>
    client
      .put<Wrapped<Restaurant>>('/api/owner/profile', data)
      .then((r) => r.data.data),

  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('logo', file)
    return client
      .post<Wrapped<{ logoUrl: string }>>('/api/owner/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data.logoUrl)
  },

  deleteLogo: () => client.delete('/api/owner/logo'),

  getReviewQR: () =>
    client
      .get<{ status: string; data: { qrDataUrl: string; reviewUrl: string; restaurantName: string } }>('/api/owner/qr')
      .then((r) => r.data.data),

  setBillingPin: (pin: string) =>
    client
      .post<{ status: string; data: { message: string } }>('/api/owner/billing-pin', { pin })
      .then((r) => r.data.data),

  removeBillingPin: () => client.delete('/api/owner/billing-pin'),

  // ─── Customers ───────────────────────────────────────────────────────────────
  getCustomers: (page = 1) =>
    client
      .get<Paginated<Customer>>(`/api/customers?page=${page}&limit=30`)
      .then((r) => r.data),

  addCustomer: (data: AddCustomerDto) =>
    client
      .post<Wrapped<{ customer: Customer }>>('/api/customers', data)
      .then((r) => r.data.data.customer),

  bulkAddCustomers: (csv: string) =>
    client
      .post<Wrapped<{ inserted: number; errors: string[] }>>('/api/customers/bulk', { csv })
      .then((r) => r.data.data),

  deleteCustomer: (id: string) =>
    client.delete(`/api/customers/${id}`),

  getCustomer: (id: string) =>
    client
      .get<{ status: string; data: { customer: import('@/types/customer').Customer; bills: import('@/types/bill').Bill[] } }>(`/api/customers/${id}`)
      .then((r) => r.data.data),

  sendReviewForBill: (customerId: string, billId?: string) =>
    client
      .post<{ status: string; data: { message: string } }>(`/api/customers/${customerId}/send-review`, { billId })
      .then((r) => r.data.data),

  // ─── Voucher ─────────────────────────────────────────────────────────────────
  getVoucher: () =>
    client
      .get<Wrapped<{ voucher: Voucher | null }>>('/api/voucher')
      .then((r) => r.data.data.voucher),

  upsertVoucher: (data: UpsertVoucherDto) =>
    client
      .put<Wrapped<{ voucher: Voucher }>>('/api/voucher', data)
      .then((r) => r.data.data.voucher),

  deleteVoucher: () =>
    client.delete('/api/voucher'),
}
