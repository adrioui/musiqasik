import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock useYouTubePlayer hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 30,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  }),
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'http://example.com/art.jpg',
    youtubeId: 'test-id',
  }

  it('renders track info correctly', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
    // Using simple text matchers as we know the format
    expect(screen.getByText('0:30')).toBeTruthy() // Current time
    expect(screen.getByText('1:40')).toBeTruthy() // Duration (100s)
  })

  it('renders playback controls', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByLabelText('Play')).toBeTruthy()
    expect(screen.getByLabelText('Previous track')).toBeTruthy()
    expect(screen.getByLabelText('Next track')).toBeTruthy()
  })

  // This test anticipates the change to a Slider component
  it('renders accessible slider', () => {
    render(<AudioPlayer track={mockTrack} />)
    // The slider role should be present once we switch to Radix Slider
    const slider = screen.getByRole('slider', { name: 'Seek track' })
    expect(slider).toBeTruthy()
  })
})
