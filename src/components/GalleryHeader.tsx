import { MaterialIcon } from './ui/material-icon'

export function GalleryHeader() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <span className="text-primary text-2xl font-light rotate-90">
          <MaterialIcon name="all_inclusive" size="lg" />
        </span>
        <span className="font-display italic text-xl tracking-wide">The Living Gallery</span>
      </div>

      {/* Future nav links - hidden for MVP */}
      <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"></div>

      {/* Search + Menu buttons - decorative for MVP */}
      <div className="flex items-center gap-3">
        <button
          className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors bg-background/20 backdrop-blur-sm opacity-50 cursor-not-allowed"
          disabled
        >
          <MaterialIcon name="search" size="sm" />
        </button>
        <button
          className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors bg-background/20 backdrop-blur-sm opacity-50 cursor-not-allowed"
          disabled
        >
          <MaterialIcon name="menu" size="sm" />
        </button>
      </div>
    </nav>
  )
}
