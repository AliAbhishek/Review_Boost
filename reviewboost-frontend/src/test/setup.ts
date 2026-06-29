import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})
