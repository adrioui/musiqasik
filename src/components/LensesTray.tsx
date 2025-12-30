import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Label } from "@/components/ui/label";
import { MaterialIcon } from "@/components/ui/material-icon";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface LensesTrayProps {
  depth: number;
  onDepthChange: (value: number) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
}

export function LensesTray({
  depth,
  onDepthChange,
  threshold,
  onThresholdChange,
  showLabels,
  onShowLabelsChange,
  onZoomIn,
  onZoomOut,
  onReset,
  isLoading,
  className,
}: LensesTrayProps) {
  return (
    <GlassCard className={cn("w-72 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <MaterialIcon name="tune" size="sm" className="text-primary" />
        <span>Lenses</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span className="text-[10px] uppercase tracking-wide text-primary">
            Live
          </span>
        </span>
      </div>

      {/* Depth Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <MaterialIcon name="layers" size="xs" />
            Depth
          </Label>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
            {depth} hops
          </span>
        </div>
        <Slider
          value={[depth]}
          onValueChange={([v]) => onDepthChange(v)}
          min={1}
          max={3}
          step={1}
          disabled={isLoading}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Close</span>
          <span>Deeper</span>
        </div>
      </div>

      {/* Similarity Threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <MaterialIcon name="tune" size="xs" />
            Similarity
          </Label>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">
            {Math.round(threshold * 100)}%
          </span>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={([v]) => onThresholdChange(v)}
          min={0}
          max={1}
          step={0.05}
          disabled={isLoading}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Tighter</span>
          <span>Broader</span>
        </div>
      </div>

      {/* Labels Toggle */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <MaterialIcon
            name={showLabels ? "visibility" : "visibility_off"}
            size="xs"
          />
          Show Labels
        </Label>
        <Switch checked={showLabels} onCheckedChange={onShowLabelsChange} />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <div className="flex flex-col rounded-lg border border-border bg-background/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-8 w-8 rounded-b-none border-b border-border"
            aria-label="Zoom in"
          >
            <MaterialIcon name="add" size="sm" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="h-8 w-8 rounded-t-none"
            aria-label="Zoom out"
          >
            <MaterialIcon name="remove" size="sm" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          className="h-8 w-8"
          aria-label="Reset view"
        >
          <MaterialIcon name="my_location" size="sm" />
        </Button>
      </div>
    </GlassCard>
  );
}
