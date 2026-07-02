import client from './client'
import type { MenuItem, AddMenuItemDto } from '@/types/menu'

type Wrapped<T> = { status: string; data: T }

export const menuApi = {
  list: () =>
    client
      .get<Wrapped<{ items: MenuItem[] }>>('/api/menu')
      .then((r) => r.data.data.items),

  add: (data: AddMenuItemDto) =>
    client
      .post<Wrapped<{ item: MenuItem }>>('/api/menu', data)
      .then((r) => r.data.data.item),

  update: (id: string, data: Partial<AddMenuItemDto>) =>
    client
      .put<Wrapped<{ item: MenuItem }>>(`/api/menu/${id}`, data)
      .then((r) => r.data.data.item),

  remove: (id: string) =>
    client.delete(`/api/menu/${id}`),

  bulkAdd: (csv: string) =>
    client
      .post<Wrapped<{ inserted: number; errors: string[] }>>('/api/menu/bulk', { csv })
      .then((r) => r.data.data),

  applyOffer: (id: string, discountPercent: number) =>
    client
      .post<Wrapped<{ item: MenuItem }>>(`/api/menu/${id}/offer`, { discountPercent })
      .then((r) => r.data.data.item),

  bulkApplyOffer: (itemIds: string[], discountPercent: number) =>
    client
      .post<Wrapped<{ updated: number }>>('/api/menu/bulk-offer', { itemIds, discountPercent })
      .then((r) => r.data.data),
}
