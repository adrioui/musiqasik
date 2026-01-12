import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the useYouTubePlayer hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isReady: true,
    isPlaying: false,
    isDisabled: false,
    error: null,
    currentTime: 30,
    duration: 180,
    play: vi.fn(),
    pause: vi.fn(),
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  }),
}))

describe('AudioPlayer', () => {
  it('renders nothing when no track is provided', () => {
    const { container } = render(<AudioPlayer track={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders track info and native slider when track is provided', () => {
    const track = {
      name: 'Test Track',
      artist: 'Test Artist',
      youtubeId: 'test-id',
    }

    render(<AudioPlayer track={track} />)

    expect(screen.getByText('Test Track')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()

    // Check for the accessible slider
    // "Seek time" is the aria-label
    // Use getByLabelText for native inputs with aria-label
    const slider = screen.getByLabelText('Seek time')
    expect(slider).toBeDefined()
    expect(slider.tagName).toBe('INPUT')
    expect(slider.getAttribute('type')).toBe('range')
    expect(slider.getAttribute('value')).toBe('30')
  })
})
