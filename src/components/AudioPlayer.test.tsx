import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

// Mock MaterialIcon
vi.mock('./ui/material-icon', () => ({
  MaterialIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'http://example.com/art.jpg',
    youtubeId: 'test-id',
  }

  it('renders track info', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('renders accessible slider', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider', { name: /seek track/i })
    expect(slider).toBeDefined()
    // Verify max value matches duration (120)
    expect(slider.getAttribute('aria-valuemax')).toBe('120')
    // Verify current value matches currentTime (30)
    expect(slider.getAttribute('aria-valuenow')).toBe('30')
  })
})
