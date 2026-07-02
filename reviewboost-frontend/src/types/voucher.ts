export interface Voucher {
  _id: string
  restaurantId: string
  isActive: boolean
  title: string
  discountText: string
  description: string
  code: string
  discountPercent: number
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
  discountPercent: number
  expiryDays: number
}

export interface VoucherValidation {
  valid: boolean
  code: string
  discountPercent: number
  customerName: string
  customerEmail: string
  expiresAt: string
}
