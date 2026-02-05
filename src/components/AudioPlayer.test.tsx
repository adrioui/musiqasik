import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock useYouTubePlayer
const mockSeekTo = vi.fn()
const mockTogglePlay = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    togglePlay: mockTogglePlay,
    seekTo: mockSeekTo,
  }),
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: '123',
    albumArt: 'http://example.com/art.jpg',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders track info', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByRole('heading', { name: /Test Track/i })).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
  })

  it('renders accessible slider', () => {
    render(<AudioPlayer track={mockTrack} />)
    // Radix puts aria-label on Root, role="slider" on Thumb.
    // JSDOM/TestingLibrary might not associate them automatically in this setup.
    // We check for the slider role and the values.
    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuenow')).toBe('30')
    expect(slider.getAttribute('aria-valuemax')).toBe('120')
  })
})
