import axios from 'axios'
import { staffClient } from './staffApi'

const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

type Wrapped<T> = { status: string; data: T }

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'billed' | 'cancelled'

export interface OrderItem {
  menuItemId?: string
  name: string
  price: number
  quantity: number
  subtotal: number
  notes?: string
}

export interface Order {
  _id: string
  restaurantId: string
  tableNumber?: string
  customer: { name: string; phone?: string; email?: string }
  items: OrderItem[]
  subtotal: number
  status: OrderStatus
  orderedBy: 'staff' | 'customer'
  staffName?: string
  kotNumber: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateOrderPayload {
  tableNumber?: string
  customer: { name: string; phone?: string; email?: string }
  items: { menuItemId?: string; name: string; price: number; quantity: number; notes?: string }[]
  notes?: string
  orderedBy?: 'staff' | 'customer'
}

export const orderApi = {
  // Staff creates an order (authenticated)
  create: (data: CreateOrderPayload) =>
    staffClient
      .post<Wrapped<{ order: Order }>>('/api/orders', data)
      .then((r) => r.data.data.order),

  // List active orders (kitchen / owner view)
  list: (status?: string, from?: string) =>
    staffClient
      .get<Wrapped<{ orders: Order[] }>>('/api/orders', {
        params: { ...(status ? { status } : {}), ...(from ? { from } : {}) },
      })
      .then((r) => r.data.data.orders),

  // Billed orders for a specific date (YYYY-MM-DD), defaults to today
  listBilledForDate: (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date()
    d.setHours(0, 0, 0, 0)
    const from = d.toISOString()
    const end = new Date(d)
    end.setHours(23, 59, 59, 999)
    const to = end.toISOString()
    return staffClient
      .get<Wrapped<{ orders: Order[] }>>('/api/orders', {
        params: { status: 'billed', from, to },
      })
      .then((r) => r.data.data.orders)
  },

  // Waiter's own orders for today
  listMine: () =>
    staffClient
      .get<Wrapped<{ orders: Order[] }>>('/api/orders/mine')
      .then((r) => r.data.data.orders),

  // Update order status (kitchen / waiter)
  updateStatus: (id: string, status: OrderStatus) =>
    staffClient
      .patch<Wrapped<{ order: Order }>>(`/api/orders/${id}/status`, { status })
      .then((r) => r.data.data.order),

  // Customer self-order (no auth)
  publicCreate: (slug: string, tableNumber: string, data: CreateOrderPayload) =>
    axios
      .post<Wrapped<{ order: Order }>>(`${base}/api/orders/public/${slug}/${tableNumber}`, data)
      .then((r) => r.data.data.order),
}
