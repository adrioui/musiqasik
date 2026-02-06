import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import * as useYouTubePlayerHook from '@/hooks/useYouTubePlayer'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(),
}))

// Mock MaterialIcon to avoid issues
vi.mock('./ui/material-icon', () => ({
  MaterialIcon: ({ name }: { name: string }) => <div data-testid={`icon-${name}`}>{name}</div>,
}))

describe('AudioPlayer', () => {
  const mockTogglePlay = vi.fn()
  const mockSeekTo = vi.fn()

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

  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'http://example.com/art.jpg',
    youtubeId: '12345',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useYouTubePlayerHook.useYouTubePlayer).mockReturnValue(defaultHookReturn)
  })

  it('renders track info correctly', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
    expect(screen.getByAltText('Test Track')).toBeTruthy()
  })

  it('renders progress time correctly', () => {
    render(<AudioPlayer track={mockTrack} />)
    // 10 seconds = 0:10
    // 100 seconds = 1:40
    expect(screen.getByText('0:10')).toBeTruthy()
    expect(screen.getByText('1:40')).toBeTruthy()
  })

  it('calls togglePlay when play button clicked', () => {
    render(<AudioPlayer track={mockTrack} />)
    const playButton = screen.getByLabelText('Play')
    fireEvent.click(playButton)
    expect(mockTogglePlay).toHaveBeenCalled()
  })

  it('does not render if track is null', () => {
    const { container } = render(<AudioPlayer track={null} />)
    expect(container.firstChild).toBeNull()
  })
})
