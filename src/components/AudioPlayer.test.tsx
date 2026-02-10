import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock useYouTubePlayer
const mockSeekTo = vi.fn()
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 10,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: mockSeekTo,
  }),
}))

describe('AudioPlayer', () => {
  const track = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'test-art.jpg',
    youtubeId: 'test-id',
  }

  it('renders correctly', () => {
    render(<AudioPlayer track={track} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
  })

  it('renders accessible slider', () => {
    render(<AudioPlayer track={track} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
    expect(slider.getAttribute('aria-label')).toBe('Seek')
  })
})
