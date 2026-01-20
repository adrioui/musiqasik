import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AudioPlayer } from './AudioPlayer'
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer'

// Mock the useYouTubePlayer hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(),
}))

// Mock MaterialIcon to avoid issues
vi.mock('./ui/material-icon', () => ({
  MaterialIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

describe('AudioPlayer Accessibility', () => {
  const mockSeekTo = vi.fn()
  const mockTogglePlay = vi.fn()

  const defaultHookReturn = {
    isReady: true,
    isPlaying: false,
    isDisabled: false,
    error: null,
    currentTime: 10,
    duration: 100,
    play: vi.fn(),
    pause: vi.fn(),
    togglePlay: mockTogglePlay,
    seekTo: mockSeekTo,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useYouTubePlayer).mockReturnValue(defaultHookReturn)
  })

  it('renders a slider for progress control', () => {
    render(
      <AudioPlayer
        track={{ name: 'Test Track', artist: 'Test Artist', youtubeId: '123' }}
      />
    )

    // Check for slider role (accessible name is also good practice)
    // This expects <input type="range"> or element with role="slider"
    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()

    // Check values using standard DOM methods instead of jest-dom matchers
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuemax')).toBe('100')
    expect(slider.getAttribute('aria-valuenow')).toBe('10')
  })

  it('allows seeking via slider', () => {
    render(
      <AudioPlayer
        track={{ name: 'Test Track', artist: 'Test Artist', youtubeId: '123' }}
      />
    )

    const slider = screen.getByRole('slider')

    // Simulate changing the value
    fireEvent.change(slider, { target: { value: '50' } })

    // Should call seekTo with the new value
    expect(mockSeekTo).toHaveBeenCalledWith(50)
  })
})
