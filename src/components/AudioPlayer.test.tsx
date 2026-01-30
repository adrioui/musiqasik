import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock useYouTubePlayer hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(() => ({
    isPlaying: false,
    currentTime: 30,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  })),
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: 'test-id',
  }

  it('renders slider for seeking', () => {
    render(<AudioPlayer track={mockTrack} />)

    // This should fail initially because the current implementation uses divs
    // Once we implement Radix Slider, this should pass
    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
    expect(slider.getAttribute('aria-label')).toBe('Seek time')
  })
})
