import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    YT: YTApi
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTApi {
  Player: new (element: HTMLElement | string, config: YTPlayerConfig) => YTPlayer
  PlayerState: {
    UNSTARTED: number
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

interface YTPlayerConfig {
  videoId: string
  height: string
  width: string
  playerVars?: YTPlayerVars
  events?: YTPlayerEvents
}

interface YTPlayerVars {
  autoplay: number
  controls: number
  disablekb: number
  fs: number
  modestbranding: number
  rel: number
}

interface YTPlayerEvents {
  onReady?: (event: YTPlayerEvent) => void
  onStateChange?: (event: YTPlayerStateEvent) => void
  onError?: (event: YTPlayerErrorEvent) => void
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

interface YTPlayerEvent {
  target: YTPlayer
}

interface YTPlayerStateEvent {
  data: number
}

interface YTPlayerErrorEvent {
  data: number
}

interface UseYouTubePlayerProps {
  videoId: string | null
  onStateChange?: (state: number) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

interface UseYouTubePlayerReturn {
  isReady: boolean
  isPlaying: boolean
  isDisabled: boolean
  error: string | null
  currentTime: number
  duration: number
  play: () => void
  pause: () => void
  togglePlay: () => void
  seekTo: (seconds: number) => void
}

export function useYouTubePlayer({
  videoId,
  onStateChange,
  onTimeUpdate,
}: UseYouTubePlayerProps): UseYouTubePlayerReturn {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<string>(`yt-player-${Date.now()}`)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDisabled, setIsDisabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const timeUpdateIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (window.YT) {
      setIsReady(true)
      return
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (existingScript) {
      const checkReady = setInterval(() => {
        if (window.YT) {
          setIsReady(true)
          clearInterval(checkReady)
        }
      }, 100)
      return () => clearInterval(checkReady)
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isReady || !videoId) {
      setIsDisabled(!videoId)
      return
    }

    setIsDisabled(false)
    setError(null)

    let container = document.getElementById(containerRef.current)
    if (!container) {
      container = document.createElement('div')
      container.id = containerRef.current
      container.style.display = 'none'
      document.body.appendChild(container)
    }

    if (playerRef.current) {
      playerRef.current.destroy()
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      height: '0',
      width: '0',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event: YTPlayerEvent) => {
          setDuration(event.target.getDuration())
        },
        onStateChange: (event: YTPlayerStateEvent) => {
          const state = event.data
          setIsPlaying(state === window.YT.PlayerState.PLAYING)
          onStateChange?.(state)

          if (state === window.YT.PlayerState.PLAYING) {
            timeUpdateIntervalRef.current = window.setInterval(() => {
              if (playerRef.current) {
                const time = playerRef.current.getCurrentTime()
                const dur = playerRef.current.getDuration()
                setCurrentTime(time)
                setDuration(dur)
                onTimeUpdate?.(time, dur)
              }
            }, 250)
          } else {
            if (timeUpdateIntervalRef.current) {
              clearInterval(timeUpdateIntervalRef.current)
              timeUpdateIntervalRef.current = null
            }
          }
        },
        onError: (event: YTPlayerErrorEvent) => {
          const errorCode = event.data
          if (errorCode === 2) setError('video_unavailable')
          else if (errorCode === 100) setError('video_unavailable')
          else if (errorCode === 101 || errorCode === 150) setError('embed_restricted')
          else setError('playback_error')
        },
      },
    })

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current)
        timeUpdateIntervalRef.current = null
      }
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
      const containerEl = document.getElementById(containerRef.current)
      if (containerEl) {
        containerEl.remove()
      }
    }
  }, [isReady, videoId, onStateChange, onTimeUpdate])

  const play = useCallback(() => {
    playerRef.current?.playVideo()
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo()
  }, [])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true)
  }, [])

  return {
    isReady,
    isPlaying,
    isDisabled,
    error,
    currentTime,
    duration,
    play,
    pause,
    togglePlay,
    seekTo,
  }
}
