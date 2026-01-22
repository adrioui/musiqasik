import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock useYouTubePlayer
const mockSeekTo = vi.fn()
const mockTogglePlay = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(() => ({
    isPlaying: false,
    currentTime: 30,
    duration: 120, // 25% progress
    togglePlay: mockTogglePlay,
    seekTo: mockSeekTo,
  })),
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'http://example.com/art.jpg',
    youtubeId: '12345',
  }

  it('renders track info', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('renders time', () => {
    render(<AudioPlayer track={mockTrack} />)
    // 30s -> 0:30, 120s -> 2:00
    expect(screen.getByText(/0:30/)).toBeDefined()
    expect(screen.getByText(/2:00/)).toBeDefined()
  })

  it('does not render if no track', () => {
    const { container } = render(<AudioPlayer track={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('toggles play on click', () => {
    render(<AudioPlayer track={mockTrack} />)
    const playButton = screen.getByLabelText('Play')
    fireEvent.click(playButton)
    expect(mockTogglePlay).toHaveBeenCalled()
  })

  it('calls onFavorite when clicked', () => {
    const onFavorite = vi.fn()
    render(<AudioPlayer track={mockTrack} onFavorite={onFavorite} />)
    const favButton = screen.getByLabelText('Favorite')
    fireEvent.click(favButton)
    expect(onFavorite).toHaveBeenCalled()
  })
})
