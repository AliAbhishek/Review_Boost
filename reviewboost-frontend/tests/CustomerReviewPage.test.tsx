import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CustomerReviewPage from '@/pages/review/CustomerReviewPage'
import * as reviewApi from '@/api/reviewApi'
import type { Restaurant } from '@/types/restaurant'
import type { GenerateReviewsResponse } from '@/types/review'

const mockReviewLog = { _id: 'log1', restaurantId: '1', stars: 4, reviewText: 'Great!', wasEdited: false, submittedTo: 'google' as const, timestamp: new Date().toISOString() }

const mockRestaurant: Restaurant = {
  _id: '1',
  name: 'The Test Kitchen',
  slug: 'test-kitchen',
  businessType: 'restaurant',
  services: ['Pizza', 'Pasta'],
  city: 'Mumbai',
  googleMapsUrl: 'https://maps.google.com/test',
  logoColor: '#6366f1',
  plan: 'pro',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const mockReviews: GenerateReviewsResponse = {
  reviews: [
    { style: 'casual', text: 'Great place, loved the vibes!' },
    { style: 'detailed', text: 'Absolutely wonderful dining experience with exceptional service.' },
    { style: 'short', text: 'Excellent food!' },
  ],
}

function renderPage(slug = 'test-kitchen') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/r/${slug}`]}>
        <Routes>
          <Route path="/r/:slug" element={<CustomerReviewPage />} />
          <Route path="/404" element={<div>Not Found</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CustomerReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(reviewApi.reviewApi, 'getRestaurant').mockResolvedValue(mockRestaurant)
    vi.spyOn(reviewApi.reviewApi, 'generateReviews').mockResolvedValue(mockReviews)
    vi.spyOn(reviewApi.reviewApi, 'logReview').mockResolvedValue({ reviewLog: mockReviewLog, voucher: null, redemptionCode: null })
    vi.spyOn(reviewApi.reviewApi, 'submitPrivateFeedback').mockResolvedValue({ reviewLog: mockReviewLog, voucher: null, redemptionCode: null })
  })

  it('renders restaurant name after loading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('The Test Kitchen')).toBeDefined())
  })

  it('shows star rating on initial load', async () => {
    renderPage()
    await waitFor(() => screen.getByText('How was your experience?'))
    const stars = screen.getAllByRole('button')
    expect(stars).toHaveLength(5)
  })

  it('triggers AI generation on high star click (4 stars)', async () => {
    renderPage()
    await waitFor(() => screen.getAllByRole('button'))
    const stars = screen.getAllByRole('button')
    fireEvent.click(stars[3])
    expect(reviewApi.reviewApi.generateReviews).toHaveBeenCalledWith('test-kitchen', 4)
  })

  it('shows 3 review cards after generation', async () => {
    renderPage()
    await waitFor(() => screen.getAllByRole('button'))
    const stars = screen.getAllByRole('button')
    fireEvent.click(stars[4])
    await waitFor(() => screen.getByText('casual', { exact: false }), { timeout: 3000 })
    expect(screen.getByText(/casual/i)).toBeDefined()
    expect(screen.getByText(/detailed/i)).toBeDefined()
    expect(screen.getByText(/short/i)).toBeDefined()
  })

  it('shows private feedback form for 1-2 stars', async () => {
    renderPage()
    await waitFor(() => screen.getAllByRole('button'))
    const stars = screen.getAllByRole('button')
    fireEvent.click(stars[1]) // 2 stars
    await waitFor(() => screen.getByText(/sorry/i))
    expect(screen.getByPlaceholderText(/Tell us what happened/i)).toBeDefined()
  })

  it('shows private form for 1 star rating', async () => {
    renderPage()
    await waitFor(() => screen.getAllByRole('button'))
    const stars = screen.getAllByRole('button')
    fireEvent.click(stars[0])
    await waitFor(() => screen.getByText(/sorry/i))
    expect(screen.getByText(/Submit feedback/i)).toBeDefined()
  })

  it('calls generateReviews for 3 stars (now routes to AI, not private)', async () => {
    renderPage()
    await waitFor(() => screen.getAllByRole('button'))
    const stars = screen.getAllByRole('button')
    fireEvent.click(stars[2]) // 3 stars
    expect(reviewApi.reviewApi.generateReviews).toHaveBeenCalledWith('test-kitchen', 3)
  })
})
