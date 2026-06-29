export interface ReviewOption {
  style: 'casual' | 'detailed' | 'short'
  text: string
}

export interface ReviewLog {
  _id: string
  stars: number
  reviewText: string
  wasEdited: boolean
  submittedTo: 'google' | 'zomato' | 'private'
  timestamp: string
}

export interface ReviewLogPayload {
  slug: string
  stars: number
  reviewText: string
  wasEdited: boolean
}

export interface GenerateReviewsResponse {
  reviews: ReviewOption[]
}
