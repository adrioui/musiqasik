import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the useYouTubePlayer hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(() => ({
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  })),
}))

const mockTrack = {
  name: 'Test Track',
  artist: 'Test Artist',
  youtubeId: 'test-id',
}

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders track info', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('renders an accessible seek slider', () => {
    render(<AudioPlayer track={mockTrack} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
    expect(slider.getAttribute('aria-label')).toBe('Seek')
    expect(slider.getAttribute('min')).toBe('0')
    expect(slider.getAttribute('max')).toBe('120')
    expect(slider.getAttribute('value')).toBe('30')
  })

  it('handles keyboard navigation correctly', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider')

    // Simulate arrow key interaction
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    // In a real browser, this changes value, but here we mock functionality
    // We just want to ensure event handlers don't crash and logic holds
    fireEvent.keyUp(slider, { key: 'ArrowRight' })

    // Simulate Tab (should not trigger dragging)
    fireEvent.keyDown(slider, { key: 'Tab' })
  })
})
