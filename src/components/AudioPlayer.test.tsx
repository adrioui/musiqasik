import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as useYouTubePlayerHook from '@/hooks/useYouTubePlayer'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(),
}))

describe('AudioPlayer', () => {
  const mockSeekTo = vi.fn()
  const mockTogglePlay = vi.fn()
  const mockOnFavorite = vi.fn()

  const defaultTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: '123',
    albumArt: 'http://example.com/art.jpg',
  }

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
    // @ts-expect-error
    useYouTubePlayerHook.useYouTubePlayer.mockReturnValue(defaultHookReturn)
  })

  it('renders track info correctly', () => {
    render(<AudioPlayer track={defaultTrack} onFavorite={mockOnFavorite} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
  })

  it('progress bar is accessible via keyboard', () => {
    render(<AudioPlayer track={defaultTrack} onFavorite={mockOnFavorite} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
    expect(slider.getAttribute('aria-label')).toBe('Seek time')
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuemax')).toBe('100')
    expect(slider.getAttribute('aria-valuenow')).toBe('10')
    expect(slider.getAttribute('tabindex')).toBe('0')
  })

  it('Arrow keys seek the video', () => {
    render(<AudioPlayer track={defaultTrack} onFavorite={mockOnFavorite} />)
    const slider = screen.getByRole('slider')

    // Focus the slider
    slider.focus()

    // Right Arrow (+5s)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(mockSeekTo).toHaveBeenCalledWith(15)

    // Left Arrow (-5s)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(mockSeekTo).toHaveBeenCalledWith(5) // from original 10
  })
})
