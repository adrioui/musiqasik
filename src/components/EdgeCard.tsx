import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { MaterialIcon } from "@/components/ui/material-icon";

interface EdgeCardProps {
  sourceArtist: string;
  targetArtist: string;
  weight: number;
  position: { x: number; y: number };
  sharedTags?: string[];
  onClose: () => void;
  onArtistClick: (name: string) => void;
}

export function EdgeCard({
  sourceArtist,
  targetArtist,
  weight,
  position,
  sharedTags = [],
  onClose,
  onArtistClick,
}: EdgeCardProps) {
  const matchPercentage = Math.round(weight * 100);

  return (
    <div
      className="pointer-events-auto absolute z-30 animate-fade-in"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, calc(-100% - 12px))",
      }}
    >
      <GlassCard className="w-64 p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Connection
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <MaterialIcon name="close" size="xs" />
          </Button>
        </div>

        {/* Match Score */}
        <div className="mb-3 flex items-end justify-between">
          <span className="text-xs text-muted-foreground">Similarity</span>
          <span className="text-lg font-bold text-primary">
            {matchPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(19,182,236,0.6)]"
            style={{ width: `${matchPercentage}%` }}
          />
        </div>

        {/* Artists */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            onClick={() => onArtistClick(sourceArtist)}
            className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {sourceArtist}
          </button>
          <MaterialIcon
            name="sync_alt"
            size="sm"
            className="shrink-0 text-muted-foreground"
          />
          <button
            onClick={() => onArtistClick(targetArtist)}
            className="flex-1 truncate rounded-lg bg-secondary/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {targetArtist}
          </button>
        </div>

        {/* Shared Tags */}
        {sharedTags.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-start gap-2">
              <MaterialIcon
                name="sell"
                size="xs"
                className="mt-0.5 text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Shared: </span>
                {sharedTags.slice(0, 3).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Arrow pointer */}
        <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-card/95" />
      </GlassCard>
    </div>
  );
}
