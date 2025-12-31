import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MaterialIcon } from '@/components/ui/material-icon'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface GraphControlsProps {
  depth: number
  onDepthChange: (depth: number) => void
  threshold: number
  onThresholdChange: (threshold: number) => void
  showLabels: boolean
  onShowLabelsChange: (show: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  isLoading?: boolean
  className?: string
}

export function GraphControls({
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
}: GraphControlsProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm',
        className,
      )}
    >
      {/* Depth Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="layers" size="xs" className="text-primary" />
            <Label className="text-sm font-medium">Depth</Label>
          </div>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-sm">
            {depth} {depth === 1 ? 'hop' : 'hops'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDepthChange(Math.max(1, depth - 1))}
            disabled={depth <= 1 || isLoading}
            aria-label="Decrease depth"
          >
            <MaterialIcon name="remove" size="xs" />
          </Button>
          <Slider
            value={[depth]}
            onValueChange={([value]) => onDepthChange(value)}
            min={1}
            max={3}
            step={1}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDepthChange(Math.min(3, depth + 1))}
            disabled={depth >= 3 || isLoading}
            aria-label="Increase depth"
          >
            <MaterialIcon name="add" size="xs" />
          </Button>
        </div>
      </div>

      {/* Threshold Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="sell" size="xs" className="text-accent" />
            <Label className="text-sm font-medium">Min Match</Label>
          </div>
          <span className="rounded bg-secondary px-2 py-0.5 font-mono text-sm">
            {Math.round(threshold * 100)}%
          </span>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={([value]) => onThresholdChange(value)}
          min={0}
          max={1}
          step={0.05}
          disabled={isLoading}
        />
      </div>

      {/* Labels Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="show-labels" className="cursor-pointer text-sm font-medium">
          Show Labels
        </Label>
        <Switch id="show-labels" checked={showLabels} onCheckedChange={onShowLabelsChange} />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onZoomIn}>
          <MaterialIcon name="zoom_in" size="xs" className="mr-1" />
          Zoom In
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={onZoomOut}>
          <MaterialIcon name="zoom_out" size="xs" className="mr-1" />
          Zoom Out
        </Button>
      </div>

      {/* Reset Button */}
      <Button variant="secondary" size="sm" onClick={onReset} className="w-full">
        <MaterialIcon name="refresh" size="xs" className="mr-2" />
        Reset View
      </Button>
    </div>
  )
}
