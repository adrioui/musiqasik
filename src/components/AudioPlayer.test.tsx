import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 30,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  }),
}))

describe('AudioPlayer', () => {
  it('renders a slider for progress control', () => {
    const track = {
      name: 'Test Track',
      artist: 'Test Artist',
      youtubeId: 'test-id',
    }
    render(<AudioPlayer track={track} />)

    // This checks for accessible slider role
    // It should fail if we are using a div
    expect(screen.getByRole('slider')).toBeDefined()
  })
})
