import * as Slider from '@radix-ui/react-slider'
import { useCallback, useEffect, useState } from 'react'

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

  // Local state for smooth dragging
  const [sliderValue, setSliderValue] = useState([0])
  const [isDragging, setIsDragging] = useState(false)

  // Sync slider with currentTime when not dragging
  useEffect(() => {
    if (!isDragging) {
      setSliderValue([currentTime])
    }
  }, [currentTime, isDragging])

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
              <span>{formatTime(currentTime)}</span>
              <span className="opacity-50 mx-1">/</span>
              <span className="opacity-50">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Accessible Slider */}
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-4 group cursor-pointer"
            value={sliderValue}
            max={duration > 0 ? duration : 100}
            step={1}
            disabled={duration <= 0}
            onValueChange={(vals) => {
              setIsDragging(true)
              setSliderValue(vals)
            }}
            onValueCommit={(vals) => {
              seekTo(vals[0])
              // Small delay to allow seek to complete before re-enabling sync
              // This prevents the slider from jumping back to the old time momentarily
              setTimeout(() => setIsDragging(false), 200)
            }}
            aria-label="Track progress"
          >
            <Slider.Track className="bg-muted relative grow rounded-full h-1 overflow-hidden">
              <Slider.Range className="absolute h-full bg-primary group-hover:bg-primary/80 transition-colors" />
            </Slider.Track>
            <Slider.Thumb
              className="block w-3 h-3 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              aria-label="Seek time"
            />
          </Slider.Root>
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
