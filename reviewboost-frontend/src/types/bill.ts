export interface BillItem {
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface TaxLine {
  label: string
  rate: number
  amount: number
}

export interface VoucherApplied {
  code: string
  discountPercent: number
  discountAmount: number
  customerName: string
}

export interface Bill {
  _id: string
  restaurantId: string
  receiptNumber: string
  customer: {
    name: string
    email?: string
    phone?: string
  }
  items: BillItem[]
  subtotal: number
  taxLines: TaxLine[]
  totalTax: number
  grandTotal: number
  voucherApplied?: VoucherApplied
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}
