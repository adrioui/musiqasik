import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
const mockSeekTo = vi.fn()
const mockTogglePlay = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 10,
    duration: 100,
    togglePlay: mockTogglePlay,
    seekTo: mockSeekTo,
    isDisabled: false,
    error: null,
    isReady: true,
  }),
}))

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'http://example.com/art.jpg',
    youtubeId: 'test-id',
  }

  const mockOnFavorite = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders track info correctly', () => {
    render(<AudioPlayer track={mockTrack} onFavorite={mockOnFavorite} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
    expect(screen.getByText('0:10')).toBeTruthy() // Current time
    expect(screen.getByText('1:40')).toBeTruthy() // Duration
  })

  it('renders album art', () => {
    render(<AudioPlayer track={mockTrack} onFavorite={mockOnFavorite} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('http://example.com/art.jpg')
    expect(img.getAttribute('alt')).toBe('Test Track')
  })

  it('renders controls', () => {
    render(<AudioPlayer track={mockTrack} onFavorite={mockOnFavorite} />)
    expect(screen.getByLabelText('Play')).toBeTruthy()
    expect(screen.getByLabelText('Favorite')).toBeTruthy()
  })

  it('calls onFavorite when favorite button is clicked', () => {
    render(<AudioPlayer track={mockTrack} onFavorite={mockOnFavorite} />)
    fireEvent.click(screen.getByLabelText('Favorite'))
    expect(mockOnFavorite).toHaveBeenCalledTimes(1)
  })

  it('calls togglePlay when play button is clicked', () => {
    render(<AudioPlayer track={mockTrack} onFavorite={mockOnFavorite} />)
    fireEvent.click(screen.getByLabelText('Play'))
    expect(mockTogglePlay).toHaveBeenCalledTimes(1)
  })
})
