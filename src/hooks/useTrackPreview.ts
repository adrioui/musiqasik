import { Effect } from 'effect'
import { useEffect, useState } from 'react'

import { searchYouTubeTrack } from '@/services/youtube'

interface TrackPreview {
  name: string
  artist: string
  albumArt?: string
  youtubeId?: string
}

export function useTrackPreview(artistName: string | null) {
  const [track, setTrack] = useState<TrackPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!artistName) {
      setTrack(null)
      return
    }

    setIsLoading(true)

    // For MVP, use a popular track name pattern
    // In future, fetch from Last.fm top tracks API
    const mockTrackName = 'Blue in Green' // Placeholder for Miles Davis

    Effect.runPromise(searchYouTubeTrack(artistName, mockTrackName))
      .then((result) => {
        if (result) {
          setTrack({
            name: mockTrackName,
            artist: artistName,
            albumArt: result.thumbnail,
            youtubeId: result.videoId,
          })
        } else {
          // Fallback without YouTube
          setTrack({
            name: mockTrackName,
            artist: artistName,
          })
        }
      })
      .catch(() => {
        setTrack({
          name: mockTrackName,
          artist: artistName,
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [artistName])

  return { track, isLoading }
}
