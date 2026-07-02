export interface Customer {
  _id: string
  restaurantId: string
  name: string
  email: string
  phone?: string
  visitDate: string
  orderedItems?: string
  notes?: string
  emailSentAt?: string
  emailToken?: string
  emailClickedAt?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AddCustomerDto {
  name: string
  email: string
  phone?: string
  visitDate: string
  orderedItems?: string
  notes?: string
}

export type CustomerStatus = 'pending' | 'email-sent' | 'reviewed'

export function getCustomerStatus(c: Customer): CustomerStatus {
  if (c.reviewedAt) return 'reviewed'
  if (c.emailSentAt) return 'email-sent'
  return 'pending'
}
