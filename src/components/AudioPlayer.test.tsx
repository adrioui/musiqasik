import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as useYouTubePlayerHook from '@/hooks/useYouTubePlayer'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(),
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'test-art.jpg',
    youtubeId: 'test-id',
  }

  it('renders track info and accessible progress slider', () => {
    // Setup mock return
    vi.mocked(useYouTubePlayerHook.useYouTubePlayer).mockReturnValue({
      isReady: true,
      isPlaying: false,
      isDisabled: false,
      error: null,
      currentTime: 30,
      duration: 120,
      play: vi.fn(),
      pause: vi.fn(),
      togglePlay: vi.fn(),
      seekTo: vi.fn(),
    })

    render(<AudioPlayer track={mockTrack} />)

    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()

    // Check for slider role
    // This expects the accessible improvement to be present
    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
    expect(slider.getAttribute('aria-label')).toBe('Seek')
    expect(slider.getAttribute('min')).toBe('0')
    expect(slider.getAttribute('max')).toBe('120')
    expect(slider.getAttribute('value')).toBe('30')
  })
})
