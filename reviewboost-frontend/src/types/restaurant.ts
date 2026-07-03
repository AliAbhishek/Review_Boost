export const BUSINESS_TYPES = ['restaurant', 'salon', 'spa', 'clinic', 'gym', 'hotel', 'other'] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]

export const BUSINESS_CONFIG: Record<BusinessType, { label: string; question: string; serviceLabel: string }> = {
  restaurant: { label: 'Restaurant', question: 'How was your meal?',        serviceLabel: 'Dishes'     },
  salon:      { label: 'Salon',      question: 'How was your experience?',  serviceLabel: 'Services'   },
  spa:        { label: 'Spa',        question: 'How was your session?',     serviceLabel: 'Treatments' },
  clinic:     { label: 'Clinic',     question: 'How was your visit?',       serviceLabel: 'Services'   },
  gym:        { label: 'Gym',        question: 'How was your session?',     serviceLabel: 'Facilities' },
  hotel:      { label: 'Hotel',      question: 'How was your stay?',        serviceLabel: 'Amenities'  },
  other:      { label: 'Business',   question: 'How was your experience?',  serviceLabel: 'Services'   },
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

export interface Restaurant {
  _id: string
  name: string
  slug: string
  businessType: BusinessType
  services: string[]
  description?: string
  cuisine?: string
  city?: string
  state?: string
  googleMapsUrl?: string
  googleReviewUrl?: string
  zomatoUrl?: string
  logoColor: string
  logoUrl?: string
  taxConfig?: TaxConfig
  plan: 'trial' | 'basic' | 'pro'
  isActive: boolean
  createdAt: string
  ownerEmail?: string
  ownerPhone?: string
}

// Only 3 fields needed to create a business — everything else is filled in later
export interface CreateRestaurantDto {
  name: string
  businessType: BusinessType
  ownerEmail: string
}

export interface UpdateRestaurantDto {
  name?: string
  services?: string[]
  description?: string
  cuisine?: string
  city?: string
  state?: string
  googleMapsUrl?: string
  googleReviewUrl?: string
  zomatoUrl?: string
  logoColor?: string
  ownerPhone?: string
  taxConfig?: TaxConfig
  plan?: 'trial' | 'basic' | 'pro'
  isActive?: boolean
}
