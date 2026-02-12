import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(() => ({
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  })),
}))

describe('AudioPlayer', () => {
  it('renders correctly with track data', () => {
    const track = {
      name: 'Test Track',
      artist: 'Test Artist',
      albumArt: 'http://example.com/art.jpg',
      youtubeId: '123',
    }
    render(<AudioPlayer track={track} />)

    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('renders an accessible progress slider', () => {
    const track = {
      name: 'Test Track',
      artist: 'Test Artist',
      youtubeId: '123',
    }
    render(<AudioPlayer track={track} />)

    // This expects an element with role="slider" (like <input type="range"> or ARIA slider)
    // The current implementation uses a div with no role, so this should fail
    const slider = screen.getByRole('slider', { name: /seek/i })
    expect(slider).toBeDefined()
  })
})
