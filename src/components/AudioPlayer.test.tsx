import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the useYouTubePlayer hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 10,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  }),
}))

describe('AudioPlayer', () => {
  it('renders progress slider with correct accessibility role', () => {
    const track = {
      name: 'Test Track',
      artist: 'Test Artist',
      youtubeId: 'test-id',
    }

    render(<AudioPlayer track={track} />)

    // Verify track info is rendered
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()

    // Verify slider is accessible
    // This expects role="slider" which comes from input type="range" or proper ARIA role
    // Initially this will fail because it's a div
    expect(screen.getByRole('slider')).toBeDefined()
  })
})
