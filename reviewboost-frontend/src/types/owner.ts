export interface Owner {
  id: string
  email: string
  name: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  owner: Owner
}

export interface DashboardStats {
  totalScans: number
  reviewsGenerated: number
  averageRating: number
  thisMonth: number
  lastMonth: number
}
