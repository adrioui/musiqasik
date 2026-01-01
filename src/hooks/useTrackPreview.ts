import { Effect } from 'effect'
import { useEffect, useState } from 'react'

import { searchYouTubeTrack } from '@/services/youtube'

interface TrackPreview {
  name: string
  artist: string
  albumArt?: string
  youtubeId?: string
}

// Helper to get a default track for known artists
function getDefaultTrackForArtist(artistName: string): string {
  const knownTracks: Record<string, string> = {
    'miles davis': 'So What',
    'john coltrane': 'Giant Steps',
    'thelonious monk': 'Round Midnight',
    'charles mingus': 'Goodbye Pork Pie Hat',
    'herbie hancock': 'Watermelon Man',
    'bill evans': 'Waltz for Debby',
    'dave brubeck': 'Take Five',
    'art blakey': 'Moanin',
    'wayne shorter': 'Footprints',
    'chick corea': 'Spain',
  }

  const lowerName = artistName.toLowerCase()
  return knownTracks[lowerName] || `${artistName} official`
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

    // Use artist-specific iconic track or generic search
    const trackName = getDefaultTrackForArtist(artistName)

    Effect.runPromise(searchYouTubeTrack(artistName, trackName))
      .then((result) => {
        if (result) {
          setTrack({
            name: trackName,
            artist: artistName,
            albumArt: result.thumbnail,
            youtubeId: result.videoId,
          })
        } else {
          // Fallback without YouTube (no API key or search failed)
          setTrack({
            name: trackName,
            artist: artistName,
          })
        }
      })
      .catch(() => {
        setTrack({
          name: trackName,
          artist: artistName,
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [artistName])

  return { track, isLoading }
}
