import { Minus, Plus, RotateCcw, ZoomIn, ZoomOut, Layers, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface GraphControlsProps {
  depth: number;
  onDepthChange: (depth: number) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isLoading?: boolean;
  className?: string;
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
    <div className={cn("flex flex-col gap-6 p-4 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg", className)}>
      {/* Depth Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Depth</Label>
          </div>
          <span className="text-sm font-mono bg-secondary px-2 py-0.5 rounded">
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
          >
            <Minus className="h-4 w-4" />
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
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Threshold Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" />
            <Label className="text-sm font-medium">Min Match</Label>
          </div>
          <span className="text-sm font-mono bg-secondary px-2 py-0.5 rounded">
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
        <Label htmlFor="show-labels" className="text-sm font-medium cursor-pointer">
          Show Labels
        </Label>
        <Switch
          id="show-labels"
          checked={showLabels}
          onCheckedChange={onShowLabelsChange}
        />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onZoomIn}
        >
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onZoomOut}
        >
          <ZoomOut className="h-4 w-4 mr-1" />
          Zoom Out
        </Button>
      </div>

      {/* Reset Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onReset}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset View
      </Button>
    </div>
  );
}