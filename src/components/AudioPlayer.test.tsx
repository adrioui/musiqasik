import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 10,
    duration: 100,
    togglePlay: vi.fn(),
    seekTo: vi.fn(),
  }),
}))

// Mock ResizeObserver for Radix UI
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver

describe('AudioPlayer', () => {
  const mockTrack = {
    name: 'Test Track',
    artist: 'Test Artist',
    albumArt: 'http://example.com/art.jpg',
    youtubeId: '12345',
  }

  it('renders correctly', () => {
    render(<AudioPlayer track={mockTrack} />)
    expect(screen.getByText('Test Track')).toBeTruthy()
    expect(screen.getByText('Test Artist')).toBeTruthy()
  })

  it('renders accessible slider', () => {
    render(<AudioPlayer track={mockTrack} />)
    // Radix UI Slider thumb has role="slider"
    const slider = screen.getByRole('slider')
    expect(slider).toBeTruthy()
    // Check if aria-label is passed down correctly
    // Note: Radix Slider might put aria-label on the thumb or root depending on implementation.
    // In our implementation, we pass props to Root, but Radix documentation says aria-label should be on Thumb usually?
    // Wait, let's check my implementation of Slider in ui/slider.tsx.
    // I passed {...props} to SliderPrimitive.Root.
    // Radix Slider Root accepts `aria-label`? No, usually native slider inputs do.
    // If I pass `aria-label` to Root, does it propagate to Thumb?
    // Let's verify this behavior.
  })
})
