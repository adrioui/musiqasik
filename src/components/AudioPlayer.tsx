import { memo, useCallback, useRef } from 'react'

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

// Format time as M:SS - Moved outside to prevent recreation
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Memoized Album Art Component
const AlbumArt = memo(({ track }: { track: Track }) => (
  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card flex-shrink-0 overflow-hidden shadow-lg relative group">
    {track.albumArt ? (
      <img src={track.albumArt} alt={track.name} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <MaterialIcon name="album" size="lg" className="text-muted-foreground" />
      </div>
    )}
  </div>
))
AlbumArt.displayName = 'AlbumArt'

// Memoized Track Metadata Component
const TrackMetadata = memo(({ track }: { track: Track }) => (
  <h3 className="text-sm font-display font-semibold truncate pr-4">
    {track.name}
    <span className="font-sans font-normal text-xs text-muted-foreground ml-2">{track.artist}</span>
  </h3>
))
TrackMetadata.displayName = 'TrackMetadata'

// Time Display Component
const TimeDisplay = ({ currentTime, duration }: { currentTime: number; duration: number }) => (
  <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap hidden sm:block">
    <span>{formatTime(currentTime)}</span>
    <span className="opacity-50 mx-1">/</span>
    <span className="opacity-50">{formatTime(duration)}</span>
  </div>
)

// Progress Bar Component
const ProgressBar = ({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || duration <= 0) return
      const rect = progressBarRef.current.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * duration
      onSeek(newTime)
    },
    [duration, onSeek],
  )

  return (
    <div
      ref={progressBarRef}
      onClick={handleProgressClick}
      className="w-full h-1 bg-muted rounded-full overflow-hidden cursor-pointer group"
    >
      <div
        className="h-full bg-primary rounded-full transition-all group-hover:bg-primary/80"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

// Memoized Controls Component
const Controls = memo(
  ({
    isPlaying,
    togglePlay,
    onFavorite,
  }: {
    isPlaying: boolean
    togglePlay: () => void
    onFavorite?: () => void
  }) => (
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
  ),
)
Controls.displayName = 'Controls'

export function AudioPlayer({ track, onFavorite }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, togglePlay, seekTo } = useYouTubePlayer({
    videoId: track?.youtubeId ?? null,
  })

  if (!track) {
    return null // Don't render if no track
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
      <div className="glass-panel-pill p-2 pl-3 pr-6 flex items-center gap-4">
        {/* Album Art - Memoized */}
        <AlbumArt track={track} />

        {/* Track Info + Progress */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-baseline justify-between">
            {/* Track Metadata - Memoized */}
            <TrackMetadata track={track} />
            {/* Time Display - Dynamic */}
            <TimeDisplay currentTime={currentTime} duration={duration} />
          </div>

          {/* Progress Bar - Dynamic */}
          <ProgressBar currentTime={currentTime} duration={duration} onSeek={seekTo} />
        </div>

        {/* Controls - Memoized */}
        <Controls isPlaying={isPlaying} togglePlay={togglePlay} onFavorite={onFavorite} />
      </div>
    </div>
  )
}
