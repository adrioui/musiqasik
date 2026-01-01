import { Effect } from 'effect'

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

interface YouTubeSearchResult {
  videoId: string
  title: string
  thumbnail: string
}

export const searchYouTubeTrack = (
  artistName: string,
  trackName: string,
): Effect.Effect<YouTubeSearchResult | null, Error> =>
  Effect.tryPromise({
    try: async () => {
      if (!YOUTUBE_API_KEY) {
        console.warn('YouTube API key not configured')
        return null
      }

      const query = encodeURIComponent(`${artistName} ${trackName} official audio`)
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`

      const response = await fetch(url)
      if (!response.ok) throw new Error('YouTube search failed')

      const data = await response.json()
      const item = data.items?.[0]

      if (!item) return null

      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
      }
    },
    catch: (error) => new Error(`YouTube search error: ${error}`),
  })

// Fallback: construct search URL for manual lookup
export const getYouTubeSearchUrl = (artistName: string, trackName: string): string => {
  const query = encodeURIComponent(`${artistName} ${trackName}`)
  return `https://www.youtube.com/results?search_query=${query}`
}
