import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Slider } from './slider'

test('Slider renders correctly', () => {
  render(<Slider defaultValue={[50]} max={100} step={1} aria-label="Test Slider" />)
  const slider = screen.getByRole('slider', { name: 'Test Slider' })
  expect(slider).toBeTruthy()
  expect(slider.getAttribute('aria-valuenow')).toBe('50')
  expect(slider.getAttribute('aria-valuemax')).toBe('100')
})
