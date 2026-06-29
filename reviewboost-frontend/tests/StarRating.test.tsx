import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StarRating from '@/components/StarRating/StarRating'

describe('StarRating', () => {
  it('renders 5 stars', () => {
    const onRate = vi.fn()
    render(<StarRating onRate={onRate} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('calls onRate with correct value on click', () => {
    const onRate = vi.fn()
    render(<StarRating onRate={onRate} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2])
    expect(onRate).toHaveBeenCalledWith(3)
  })

  it('calls onRate(1) for first star click', () => {
    const onRate = vi.fn()
    render(<StarRating onRate={onRate} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onRate).toHaveBeenCalledWith(1)
  })

  it('calls onRate(5) for last star click', () => {
    const onRate = vi.fn()
    render(<StarRating onRate={onRate} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[4])
    expect(onRate).toHaveBeenCalledWith(5)
  })

  it('does not call onRate when disabled', () => {
    const onRate = vi.fn()
    render(<StarRating onRate={onRate} disabled />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[2])
    expect(onRate).not.toHaveBeenCalled()
  })

  it('has correct aria-labels', () => {
    const onRate = vi.fn()
    render(<StarRating onRate={onRate} />)
    expect(screen.getByLabelText('1 star')).toBeDefined()
    expect(screen.getByLabelText('3 stars')).toBeDefined()
    expect(screen.getByLabelText('5 stars')).toBeDefined()
  })
})
