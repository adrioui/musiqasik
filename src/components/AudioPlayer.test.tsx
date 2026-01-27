import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
const seekToMock = vi.fn()
const togglePlayMock = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 30,
    duration: 100,
    togglePlay: togglePlayMock,
    seekTo: seekToMock,
  }),
}))

const mockTrack = {
  name: 'Test Song',
  artist: 'Test Artist',
  albumArt: 'http://example.com/art.jpg',
  youtubeId: 'test-id',
}

describe('AudioPlayer', () => {
  it('renders nothing when track is null', () => {
    const { container } = render(<AudioPlayer track={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders track info when track is provided', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Song')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('renders an accessible slider', () => {
    render(<AudioPlayer track={mockTrack} />)
    // This expects the new implementation
    // Using getAllByRole just in case, but getByRole is better for uniqueness
    // Note: The current implementation has NO slider, so this will fail.
    const slider = screen.getByRole('slider', { name: /seek/i })
    expect(slider).toBeDefined()
  })

  it('calls seekTo when slider is committed', () => {
    render(<AudioPlayer track={mockTrack} />)
    const slider = screen.getByRole('slider', { name: /seek/i })

    // Simulate drag and commit
    fireEvent.change(slider, { target: { value: '50' } })
    fireEvent.pointerUp(slider, { target: { value: '50' } })

    expect(seekToMock).toHaveBeenCalledWith(50)
  })
})
