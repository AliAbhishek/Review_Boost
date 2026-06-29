export interface Voucher {
  _id: string
  restaurantId: string
  isActive: boolean
  title: string
  discountText: string
  description: string
  code: string
  expiryDays: number
  claimedCount: number
  createdAt: string
  updatedAt: string
}

export interface UpsertVoucherDto {
  isActive: boolean
  title: string
  discountText: string
  description?: string
  code: string
  expiryDays: number
}
