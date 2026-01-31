import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
const mockTogglePlay = vi.fn()
const mockSeekTo = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
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
  }),
}))

// Mock ResizeObserver for Radix UI or other components if needed
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'test-art.jpg',
    youtubeId: 'test-id',
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders nothing when track is null', () => {
    const { container } = render(<AudioPlayer track={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders track info when track is provided', () => {
    render(<AudioPlayer track={mockTrack} />)

    // Check for track name and artist using regex for flexibility or exact match
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()

    // Check for time (10s = 0:10, 100s = 1:40)
    // Note: The component renders them in separate spans
    expect(screen.getByText('0:10')).toBeDefined()
    expect(screen.getByText('1:40')).toBeDefined()
  })
})
