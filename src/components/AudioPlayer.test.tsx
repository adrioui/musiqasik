import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the useYouTubePlayer hook
const mockUseYouTubePlayer = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: (props: any) => mockUseYouTubePlayer(props),
}))

// Mock MaterialIcon to avoid rendering issues if it uses external resources or context
vi.mock('./ui/material-icon', () => ({
  MaterialIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'test-art.jpg',
    youtubeId: 'test-id',
  }

  const defaultHookReturn = {
    isReady: true,
    isPlaying: false,
    isDisabled: false,
    error: null,
    currentTime: 30, // 30 seconds
    duration: 300, // 5 minutes
    play: vi.fn(),
    pause: vi.fn(),
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  }

  it('renders track info correctly', () => {
    mockUseYouTubePlayer.mockReturnValue(defaultHookReturn)

    render(<AudioPlayer track={mockTrack} />)

    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
    // 30s is 0:30, 300s is 5:00
    expect(screen.getByText('0:30')).toBeDefined()
    expect(screen.getByText('5:00')).toBeDefined()
  })

  it('has accessible progress bar', () => {
    mockUseYouTubePlayer.mockReturnValue(defaultHookReturn)
    render(<AudioPlayer track={mockTrack} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
    // Use getAttribute instead of toHaveAttribute as per memory instructions
    expect(slider.getAttribute('aria-label')).toBe('Seek slider')
    expect(slider.getAttribute('min')).toBe('0')
    expect(slider.getAttribute('max')).toBe('300')
    expect(slider.getAttribute('value')).toBe('30')
  })

  it('updates seek position on change', () => {
    const seekToMock = vi.fn()
    mockUseYouTubePlayer.mockReturnValue({
      ...defaultHookReturn,
      seekTo: seekToMock,
    })

    render(<AudioPlayer track={mockTrack} />)

    const slider = screen.getByRole('slider')

    // Simulate changing the value (e.g., keyboard interaction or direct jump)
    fireEvent.change(slider, { target: { value: '150' } })

    // Since we are not dragging, it should call seekTo immediately
    expect(seekToMock).toHaveBeenCalledWith(150)
  })

  it('handles drag interactions correctly', () => {
    const seekToMock = vi.fn()
    mockUseYouTubePlayer.mockReturnValue({
      ...defaultHookReturn,
      seekTo: seekToMock,
    })

    render(<AudioPlayer track={mockTrack} />)

    const slider = screen.getByRole('slider')

    // Start dragging
    fireEvent.pointerDown(slider)

    // Drag to new position
    fireEvent.change(slider, { target: { value: '200' } })

    // Should NOT call seekTo yet (prevent stutter/API spam)
    expect(seekToMock).not.toHaveBeenCalledWith(200)

    // Stop dragging
    fireEvent.pointerUp(slider)

    // NOW it should seek
    expect(seekToMock).toHaveBeenCalledWith(200)
  })
})
