import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock useYouTubePlayer
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: vi.fn(() => ({
    isPlaying: false,
    currentTime: 30,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  })),
}))

describe('AudioPlayer', () => {
  const track = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: 'test-id',
  }

  it('renders track info', () => {
    render(<AudioPlayer track={track} />)
    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
  })

  it('has an accessible slider', () => {
    render(<AudioPlayer track={track} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeDefined()
    expect(slider.getAttribute('aria-label')).toBe('Seek')
  })
})
