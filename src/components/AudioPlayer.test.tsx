import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(),
}))

import { useYouTubePlayer } from '@/hooks/useYouTubePlayer'

describe('AudioPlayer', () => {
  const mockSeekTo = vi.fn()
  const mockTogglePlay = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useYouTubePlayer as any).mockReturnValue({
      isPlaying: false,
      currentTime: 10,
      duration: 100,
      togglePlay: mockTogglePlay,
      seekTo: mockSeekTo,
      isReady: true,
      isDisabled: false,
      error: null,
      play: vi.fn(),
      pause: vi.fn(),
    })
  })

  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: 'test-id',
    albumArt: 'http://example.com/art.jpg',
  }

  it('renders track information', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
  })

  it('seeks when arrow keys are pressed on the progress bar', () => {
    render(<AudioPlayer track={mockTrack} />)

    // Find the slider - initially this will fail or find nothing if role is missing
    // We use getAllByRole if there are multiple sliders, but here we expect one.
    // However, since we haven't added the role yet, we expect this to fail or we can use a locator that works now to setup the test for failure later.
    // But correct TDD is to write the test as if the feature exists.
    const slider = screen.getByRole('slider')

    // Simulate focus
    slider.focus()
    expect(document.activeElement).toBe(slider)

    // Test ArrowRight
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(mockSeekTo).toHaveBeenCalledWith(15) // 10 + 5

    // Test ArrowLeft
    mockSeekTo.mockClear()
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(mockSeekTo).toHaveBeenCalledWith(5) // 10 - 5

    // Test Home
    mockSeekTo.mockClear()
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(mockSeekTo).toHaveBeenCalledWith(0)

    // Test End
    mockSeekTo.mockClear()
    fireEvent.keyDown(slider, { key: 'End' })
    expect(mockSeekTo).toHaveBeenCalledWith(100)
  })
})
