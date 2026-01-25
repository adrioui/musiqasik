import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
  }),
}))

describe('AudioPlayer', () => {
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

  it('renders an accessible range input for seeking', () => {
    render(<AudioPlayer track={mockTrack} />)
    // This is expected to fail before the fix
    const rangeInput = screen.getByRole('slider')
    expect(rangeInput).toBeDefined()
  })
})
