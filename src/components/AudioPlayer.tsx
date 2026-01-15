import { useEffect, useState } from 'react'

import { useYouTubePlayer } from '@/hooks/useYouTubePlayer'
import { MaterialIcon } from './ui/material-icon'

interface Track {
  name: string
  artist: string
  albumArt?: string
  youtubeId?: string
}

interface AudioPlayerProps {
  track: Track | null
  onFavorite?: () => void
}

export function AudioPlayer({ track, onFavorite }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, togglePlay, seekTo } = useYouTubePlayer({
    videoId: track?.youtubeId ?? null,
  })

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Local state for dragging the slider
  const [isDragging, setIsDragging] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)

  // Sync slider with player time when not dragging
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(currentTime)
    }
  }, [currentTime, isDragging])

  // Progress percentage for visual bar
  // Use sliderValue if dragging to provide immediate feedback
  const displayTime = isDragging ? sliderValue : currentTime
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0

  // Handle seek action
  const handleSeek = (time: number) => {
    setSliderValue(time)
    seekTo(time)
  }

  if (!track) {
    return null // Don't render if no track
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
      <div className="glass-panel-pill p-2 pl-3 pr-6 flex items-center gap-4">
        {/* Album Art */}
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card flex-shrink-0 overflow-hidden shadow-lg relative group">
          {track.albumArt ? (
            <img src={track.albumArt} alt={track.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MaterialIcon name="album" size="lg" className="text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Track Info + Progress */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-display font-semibold truncate pr-4">
              {track.name}
              <span className="font-sans font-normal text-xs text-muted-foreground ml-2">
                {track.artist}
              </span>
            </h3>
            <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap hidden sm:block">
              <span>{formatTime(isDragging ? sliderValue : currentTime)}</span>
              <span className="opacity-50 mx-1">/</span>
              <span className="opacity-50">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative h-4 flex items-center group">
            {/* Visual Progress Bar */}
            <div className="absolute w-full h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all group-hover:bg-primary/80"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Accessible Range Input Overlay */}
            <input
              type="range"
              min={0}
              max={duration || 100} // Prevent 0 max
              step="any"
              value={sliderValue}
              disabled={duration <= 0}
              aria-label="Seek"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                const newValue = Number(e.target.value)
                setSliderValue(newValue)
              }}
              onPointerDown={() => setIsDragging(true)}
              onPointerUp={(e) => {
                setIsDragging(false)
                handleSeek(Number(e.currentTarget.value))
              }}
              onKeyDown={(e) => {
                // Only treat as dragging if using arrow keys to adjust
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  setIsDragging(true)
                }
              }}
              onKeyUp={(e) => {
                // Commit seek when arrow keys are released
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  setIsDragging(false)
                  handleSeek(Number(e.currentTarget.value))
                }
              }}
              onBlur={() => setIsDragging(false)}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 pl-2">
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous"
          >
            <MaterialIcon name="skip_previous" size="md" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform play-button-glow"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <MaterialIcon name={isPlaying ? 'pause' : 'play_arrow'} size="md" />
          </button>

          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next"
          >
            <MaterialIcon name="skip_next" size="md" />
          </button>

          <button
            onClick={onFavorite}
            className="text-muted-foreground hover:text-red-500 transition-colors ml-2"
            aria-label="Favorite"
          >
            <MaterialIcon name="favorite" size="sm" />
          </button>
        </div>
      </div>
    </div>
  )
}
