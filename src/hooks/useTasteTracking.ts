import { useCallback, useState } from 'react'

interface AnchorClick {
  artistName: string
  timestamp: number
}

export function useTasteTracking() {
  const [anchorsClicked, setAnchorsClicked] = useState<AnchorClick[]>([])

  const trackAnchorClick = useCallback((artistName: string) => {
    setAnchorsClicked((prev) => [...prev, { artistName, timestamp: Date.now() }])
  }, [])

  const getPreferredArtists = useCallback(() => {
    const scores = new Map<string, number>()

    anchorsClicked.forEach(({ artistName }) => {
      scores.set(artistName, (scores.get(artistName) || 0) + 1)
    })

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
  }, [anchorsClicked])

  return {
    trackAnchorClick,
    getPreferredArtists,
    anchorsClicked,
  }
}
