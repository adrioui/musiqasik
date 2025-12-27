import { Link } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/material-icon';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';

interface FloatingNavProps {
  onSearchClick?: () => void;
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
    </GlassCard>
  );
}
