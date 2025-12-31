import { Link } from 'react-router-dom'
import { ConnectLastFmButton } from '@/components/ConnectLastFmButton'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { MaterialIcon } from '@/components/ui/material-icon'

interface FloatingNavProps {
  onSearchClick?: () => void
}

export function FloatingNav({ onSearchClick }: FloatingNavProps) {
  return (
    <GlassCard className="flex items-center gap-2 p-2">
      <div className="flex items-center gap-3 px-2">
        <MaterialIcon name="hub" size="lg" className="text-primary" />
        <span className="text-lg font-bold tracking-tight">MusiqasiQ</span>
      </div>
      <div className="h-6 w-px bg-border" />
      <Button variant="ghost" size="icon" asChild>
        <Link to="/">
          <MaterialIcon name="home" size="sm" />
          <span className="sr-only">Home</span>
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={onSearchClick}>
        <MaterialIcon name="search" size="sm" />
        <span className="sr-only">Search</span>
      </Button>
      <div className="h-6 w-px bg-border" />
      <ConnectLastFmButton variant="outline" className="bg-card/50 backdrop-blur-sm" />
    </GlassCard>
  )
}
