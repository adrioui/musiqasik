import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { cn } from "@/lib/utils";

interface GraphLegendProps {
  colorMap: Map<string, string>;
  className?: string;
}

export function GraphLegend({ colorMap, className }: GraphLegendProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (colorMap.size === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-background/80 p-2 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MaterialIcon name="palette" size="xs" />
          <span>Genres</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <MaterialIcon name="expand_more" size="xs" />
          ) : (
            <MaterialIcon name="expand_less" size="xs" />
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {Array.from(colorMap.entries()).map(([genre, color]) => (
            <div key={genre} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full ring-1 ring-border/50"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize text-foreground/90">{genre}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
