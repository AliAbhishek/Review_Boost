import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import * as adminApiModule from '@/api/adminApi'
import type { Restaurant } from '@/types/restaurant'

const mockRestaurants: Restaurant[] = [
  {
    _id: '1',
    name: 'Spice Garden',
    slug: 'spice-garden',
    businessType: 'restaurant',
    services: ['Biryani'],
    city: 'Delhi',
    googleMapsUrl: 'https://maps.google.com/1',
    logoColor: '#f59e0b',
    plan: 'pro',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '2',
    name: 'Pizza Hut Local',
    slug: 'pizza-hut-local',
    businessType: 'restaurant',
    services: ['Margherita'],
    city: 'Mumbai',
    googleMapsUrl: 'https://maps.google.com/2',
    logoColor: '#ef4444',
    plan: 'basic',
    isActive: false,
    createdAt: '2024-02-01T00:00:00.000Z',
  },
]

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.spyOn(adminApiModule.adminApi, 'getRestaurants').mockResolvedValue(mockRestaurants)
    vi.spyOn(adminApiModule.adminApi, 'getStats').mockResolvedValue({
      totalRestaurants: 2,
      totalReviews: 100,
      totalOrders: 50,
      activePlans: 1,
      revenue: 5000,
    })
    vi.spyOn(adminApiModule.adminApi, 'createRestaurant').mockResolvedValue(mockRestaurants[0])
    vi.spyOn(adminApiModule.adminApi, 'updateRestaurant').mockResolvedValue(mockRestaurants[0])
    vi.spyOn(adminApiModule.adminApi, 'deleteRestaurant').mockResolvedValue(undefined)
  })

  it('renders restaurant table with names', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Spice Garden'))
    expect(screen.getByText('Spice Garden')).toBeDefined()
    expect(screen.getByText('Pizza Hut Local')).toBeDefined()
  })

  it('renders plan badges correctly', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Pro'))
    expect(screen.getByText('Pro')).toBeDefined()
    expect(screen.getByText('Basic')).toBeDefined()
  })

  it('Add Restaurant button opens the slide-over form', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Add Restaurant'))
    const btn = screen.getAllByText('Add Restaurant')[0]
    fireEvent.click(btn)
    await waitFor(() => screen.getByText('New Restaurant'))
    expect(screen.getByPlaceholderText('The Grand Kitchen')).toBeDefined()
  })

  it('search filters restaurants by name', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Spice Garden'))
    const searchInput = screen.getByPlaceholderText(/search restaurants/i)
    fireEvent.change(searchInput, { target: { value: 'Spice' } })
    await waitFor(() => {
      expect(screen.getByText('Spice Garden')).toBeDefined()
      expect(screen.queryByText('Pizza Hut Local')).toBeNull()
    })
  })

  it('search filters restaurants by city', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Spice Garden'))
    const searchInput = screen.getByPlaceholderText(/search restaurants/i)
    fireEvent.change(searchInput, { target: { value: 'Mumbai' } })
    await waitFor(() => {
      expect(screen.queryByText('Spice Garden')).toBeNull()
      expect(screen.getByText('Pizza Hut Local')).toBeDefined()
    })
  })

  it('copy QR button copies correct URL', async () => {
    renderDashboard()
    await waitFor(() => screen.getByText('Spice Garden'))
    const copyButtons = screen.getAllByTitle('Copy link')
    fireEvent.click(copyButtons[0])
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/r/spice-garden'),
      )
    })
  })
})
