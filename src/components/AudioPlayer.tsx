import { useCallback, useEffect, useState } from 'react'
import { MaterialIcon } from '@/components/ui/material-icon'
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer'

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

  // Local state for dragging to prevent jitter
  const [isDragging, setIsDragging] = useState(false)
  const [localTime, setLocalTime] = useState(0)

  // Sync local time with player time when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalTime(currentTime)
    }
  }, [currentTime, isDragging])

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDragging(true)
    setLocalTime(Number(e.target.value))
  }, [])

  const handleSeekCommit = useCallback(
    (
      e:
        | React.MouseEvent<HTMLInputElement>
        | React.TouchEvent<HTMLInputElement>
        | React.KeyboardEvent<HTMLInputElement>,
    ) => {
      setIsDragging(false)
      // For keyboard/mouse up, we commit the value
      seekTo(Number(e.currentTarget.value))
    },
    [seekTo],
  )

  // Also handle keyboard interaction specifically for better accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Whitelist keys that should trigger interaction
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      // Let the default behavior happen (updating value), but mark as dragging?
      // Actually native range input handles keyboard updates automatically.
      // We just need to commit on key up or change.
      // The onChange handler updates local state.
    }
  }, [])

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        setIsDragging(false)
        seekTo(Number(e.currentTarget.value))
      }
    },
    [seekTo],
  )

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage for background gradient
  const progressPercent = duration > 0 ? (localTime / duration) * 100 : 0

  if (!track) {
    return null
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
      <div className="glass-panel-pill p-3 pr-6 flex items-center gap-4">
        {/* Album Art */}
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card flex-shrink-0 overflow-hidden shadow-lg relative group border border-border/10">
          {track.albumArt ? (
            <img src={track.albumArt} alt={track.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MaterialIcon name="album" size="lg" className="text-muted-foreground/50" />
            </div>
          )}
          {/* Rotating animation when playing */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin-slow" />
          )}
        </div>

        {/* Track Info + Controls */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 justify-center">
          <div className="flex items-center justify-between mb-1">
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-display font-bold truncate text-foreground">
                {track.name}
                <span className="font-sans font-normal text-xs text-muted-foreground ml-2">
                  {track.artist}
                </span>
              </h3>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <span>{formatTime(localTime)}</span>
              <span className="opacity-30">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="relative w-full h-4 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="1"
              value={localTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              onKeyUp={handleKeyUp}
              onKeyDown={handleKeyDown}
              aria-label="Seek track"
              className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${progressPercent}%, hsl(var(--muted)) ${progressPercent}%)`,
              }}
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1 pl-2">
          <button
            className="p-2 text-muted-foreground/70 hover:text-foreground transition-colors hover:bg-muted/50 rounded-full"
            aria-label="Previous track"
          >
            <MaterialIcon name="skip_previous" size="sm" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-primary/25"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <MaterialIcon name={isPlaying ? 'pause' : 'play_arrow'} size="md" />
          </button>

          <button
            className="p-2 text-muted-foreground/70 hover:text-foreground transition-colors hover:bg-muted/50 rounded-full"
            aria-label="Next track"
          >
            <MaterialIcon name="skip_next" size="sm" />
          </button>

          <div className="w-px h-4 bg-border/50 mx-1" />

          <button
            onClick={onFavorite}
            className="p-2 text-muted-foreground/70 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-full group"
            aria-label="Favorite track"
          >
            <MaterialIcon
              name="favorite"
              size="sm"
              className="group-hover:scale-110 transition-transform"
            />
          </button>
        </div>
      </div>
    </div>
  )
}
