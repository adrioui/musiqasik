import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as useYouTubePlayerModule from '@/hooks/useYouTubePlayer'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(),
}))

describe('AudioPlayer', () => {
  const mockSeekTo = vi.fn()
  const mockTogglePlay = vi.fn()

  const defaultHookValues = {
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
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useYouTubePlayerModule.useYouTubePlayer).mockReturnValue(defaultHookValues)
  })

  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: 'test-id',
  }

  it('renders track info', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('renders a slider for progress', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
    expect(slider.getAttribute('min')).toBe('0')
    expect(slider.getAttribute('max')).toBe('100')
    expect(slider.getAttribute('value')).toBe('10')
  })

  it('calls seekTo when slider changes via pointer', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider')

    // Simulate pointer down to start dragging
    fireEvent.pointerDown(slider)

    // Change value
    fireEvent.change(slider, { target: { value: '50' } })

    // Value should be updated locally, but seekTo NOT called yet
    expect(mockSeekTo).not.toHaveBeenCalled()

    // Simulate pointer up to commit
    fireEvent.pointerUp(slider)

    expect(mockSeekTo).toHaveBeenCalledWith(50)
  })

  it('calls seekTo when slider changes via keyboard (ArrowRight)', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider')

    // Simulate key down (ArrowRight)
    fireEvent.keyDown(slider, { key: 'ArrowRight' })

    // Change value (native behavior of input)
    fireEvent.change(slider, { target: { value: '50' } })

    // seekTo NOT called yet
    expect(mockSeekTo).not.toHaveBeenCalled()

    // Simulate key up
    fireEvent.keyUp(slider, { key: 'ArrowRight' })

    expect(mockSeekTo).toHaveBeenCalledWith(50)
  })

  it('calls seekTo when slider changes via keyboard (PageUp)', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider')

    // Simulate key down
    fireEvent.keyDown(slider, { key: 'PageUp' })

    // Change value
    fireEvent.change(slider, { target: { value: '75' } })

    // seekTo NOT called yet
    expect(mockSeekTo).not.toHaveBeenCalled()

    // Simulate key up
    fireEvent.keyUp(slider, { key: 'PageUp' })

    expect(mockSeekTo).toHaveBeenCalledWith(75)
  })
})
