import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

// Mock the hook
const mockSeekTo = vi.fn()
vi.mock('@/hooks/useYouTubePlayer', () => ({
  useYouTubePlayer: () => ({
    isPlaying: false,
    currentTime: 65, // 1:05
    duration: 120, // 2:00
    togglePlay: vi.fn(),
    seekTo: mockSeekTo,
  }),
}))

test('AudioPlayer renders accessible slider', () => {
  render(
    <AudioPlayer
      track={{ name: 'Test Track', artist: 'Test Artist', youtubeId: '123' }}
      onFavorite={() => {}}
    />,
  )

  // Should find an input with role slider (implicit for input type="range")
  // or explicitly role="slider"
  const slider = screen.getByLabelText(/seek/i)

  expect(slider).toBeTruthy()
  expect(slider.tagName).toBe('INPUT')
  expect(slider.getAttribute('type')).toBe('range')
  expect(slider.getAttribute('min')).toBe('0')
  expect(slider.getAttribute('max')).toBe('120')

  // Value should match currentTime
  expect((slider as HTMLInputElement).value).toBe('65')

  // Simulate change
  fireEvent.change(slider, { target: { value: '90' } })

  // Note: Depending on implementation, seekTo might be called on change or on mouseUp.
  // We'll verify interaction in the next steps if needed, but existence is key here.
})
