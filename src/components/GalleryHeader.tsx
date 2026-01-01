import { useTheme } from './ThemeProvider'
import { MaterialIcon } from './ui/material-icon'

export function GalleryHeader() {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-8">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <span className="text-primary text-2xl font-light rotate-90">
          <MaterialIcon name="all_inclusive" size="lg" />
        </span>
        <span className="font-display italic text-xl tracking-wide">The Living Gallery</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Search button - decorative */}
        <button
          className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors bg-background/20 backdrop-blur-sm"
          aria-label="Search"
        >
          <MaterialIcon name="search" size="sm" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors bg-background/20 backdrop-blur-sm"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <MaterialIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size="sm" />
        </button>

        {/* Menu button - decorative */}
        <button
          className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors bg-background/20 backdrop-blur-sm"
          aria-label="Menu"
        >
          <MaterialIcon name="menu" size="sm" />
        </button>
      </div>
    </nav>
  )
}
