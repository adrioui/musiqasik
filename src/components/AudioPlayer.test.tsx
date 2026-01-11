import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the useYouTubePlayer hook
const mockSeekTo = vi.fn()
const mockTogglePlay = vi.fn()

vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 30, // 30 seconds
    duration: 120, // 2 minutes
    togglePlay: mockTogglePlay,
    seekTo: mockSeekTo,
  }),
}))

describe('AudioPlayer', () => {
  const track = {
    name: 'Test Track',
    artist: 'Test Artist',
    youtubeId: 'test-id',
  }

  it('renders progress bar correctly', () => {
    render(<AudioPlayer track={track} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
  })

  it('progress bar has accessible role and attributes', () => {
    render(<AudioPlayer track={track} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
    expect(slider.getAttribute('aria-label')).toBe('Seek time')
    expect(slider.getAttribute('aria-valuemin')).toBe('0')
    expect(slider.getAttribute('aria-valuemax')).toBe('100')
    // progress = (30 / 120) * 100 = 25
    expect(slider.getAttribute('aria-valuenow')).toBe('25')
    expect(slider.getAttribute('tabIndex')).toBe('0')
  })

  it('handles arrow keys for seeking', () => {
    render(<AudioPlayer track={track} />)

    const slider = screen.getByRole('slider')

    // Press ArrowRight
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    // Current time is 30, + 5 = 35
    expect(mockSeekTo).toHaveBeenCalledWith(35)

    // Press ArrowLeft
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    // Current time is 30, - 5 = 25
    expect(mockSeekTo).toHaveBeenCalledWith(25)
  })
})
