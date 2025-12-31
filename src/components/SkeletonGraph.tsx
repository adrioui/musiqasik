import { cn } from '@/lib/utils'

interface SkeletonGraphProps {
  className?: string
}

export function SkeletonGraph({ className }: SkeletonGraphProps) {
  // Generate random but stable positions for skeleton nodes
  const skeletonNodes = [
    { cx: '50%', cy: '50%', r: 28, opacity: 0.3 }, // Center
    { cx: '30%', cy: '35%', r: 18, opacity: 0.15 },
    { cx: '70%', cy: '30%', r: 20, opacity: 0.15 },
    { cx: '25%', cy: '60%', r: 16, opacity: 0.15 },
    { cx: '75%', cy: '65%', r: 22, opacity: 0.15 },
    { cx: '45%', cy: '75%', r: 17, opacity: 0.15 },
    { cx: '60%', cy: '40%', r: 19, opacity: 0.15 },
  ]

  const skeletonLinks = [
    { x1: '50%', y1: '50%', x2: '30%', y2: '35%' },
    { x1: '50%', y1: '50%', x2: '70%', y2: '30%' },
    { x1: '50%', y1: '50%', x2: '25%', y2: '60%' },
    { x1: '50%', y1: '50%', x2: '75%', y2: '65%' },
    { x1: '50%', y1: '50%', x2: '45%', y2: '75%' },
    { x1: '50%', y1: '50%', x2: '60%', y2: '40%' },
  ]

  return (
    <div className={cn('flex h-full w-full items-center justify-center', className)}>
      <svg
        className="h-full w-full animate-pulse"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Skeleton links */}
        <g className="stroke-muted-foreground/20">
          {skeletonLinks.map((link, i) => (
            <line key={i} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} strokeWidth="0.3" />
          ))}
        </g>
        {/* Skeleton nodes */}
        <g>
          {skeletonNodes.map((node, i) => (
            <circle
              key={i}
              cx={node.cx}
              cy={node.cy}
              r={node.r / 5}
              className="fill-muted-foreground"
              opacity={node.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
