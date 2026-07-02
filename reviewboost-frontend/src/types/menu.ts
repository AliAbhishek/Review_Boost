export interface MenuItem {
  _id: string
  restaurantId: string
  name: string
  category: string
  price: number
  originalPrice?: number
  discountPercent?: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export interface AddMenuItemDto {
  name: string
  category?: string
  price: number
  isAvailable?: boolean
}

export interface TaxConfig {
  gstEnabled: boolean
  cgst: number
  sgst: number
  useIgst: boolean
  igst: number
  serviceChargeEnabled: boolean
  serviceCharge: number
}
