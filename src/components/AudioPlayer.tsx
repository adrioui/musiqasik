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

// Optimization: Memoized components to prevent unnecessary re-renders during time updates

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

const TrackInfo = memo(({ name, artist }: { name: string; artist: string }) => (
  <h3 className="text-sm font-display font-semibold truncate pr-4">
    {name}
    <span className="font-sans font-normal text-xs text-muted-foreground ml-2">{artist}</span>
  </h3>
))
TrackInfo.displayName = 'TrackInfo'

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const TimeDisplay = ({ currentTime, duration }: { currentTime: number; duration: number }) => (
  <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap hidden sm:block">
    <span>{formatTime(currentTime)}</span>
    <span className="opacity-50 mx-1">/</span>
    <span className="opacity-50">{formatTime(duration)}</span>
  </div>
)

const ProgressBar = ({
  progress,
  duration,
  onSeek,
}: {
  progress: number
  duration: number
  onSeek: (seconds: number) => void
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null)

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
      className="w-full h-1 bg-muted rounded-full overflow-hidden cursor-pointer group transform-gpu"
    >
      {/* Optimization: Use transform for smooth, compositor-only animations instead of width changes which trigger layout */}
      <div
        className="h-full bg-primary rounded-full group-hover:bg-primary/80 origin-left will-change-transform transition-colors transition-transform duration-200 ease-linear"
        style={{
          width: '100%',
          transform: `translateX(-${100 - progress}%)`,
        }}
      />
    </div>
  )
}

const PlayerControls = memo(
  ({
    isPlaying,
    onTogglePlay,
    onFavorite,
  }: {
    isPlaying: boolean
    onTogglePlay: () => void
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
        onClick={onTogglePlay}
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
PlayerControls.displayName = 'PlayerControls'

export function AudioPlayer({ track, onFavorite }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, togglePlay, seekTo } = useYouTubePlayer({
    videoId: track?.youtubeId ?? null,
  })

  // Progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!track) {
    return null // Don't render if no track
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg">
      <div className="glass-panel-pill p-2 pl-3 pr-6 flex items-center gap-4">
        <AlbumArt track={track} />

        {/* Track Info + Progress */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <TrackInfo name={track.name} artist={track.artist} />
            <TimeDisplay currentTime={currentTime} duration={duration} />
          </div>

          <ProgressBar progress={progress} duration={duration} onSeek={seekTo} />
        </div>

        <PlayerControls isPlaying={isPlaying} onTogglePlay={togglePlay} onFavorite={onFavorite} />
      </div>
    </div>
  )
}
