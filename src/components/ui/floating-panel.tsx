import { cn } from '@/lib/utils'

interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center'
}

const positionClasses = {
  'top-left': 'top-6 left-6',
  'top-right': 'top-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-right': 'bottom-6 right-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
}

export function FloatingPanel({
  className,
  children,
  position = 'bottom-left',
  ...props
}: FloatingPanelProps) {
  return (
    <div
      className={cn('pointer-events-auto absolute z-20', positionClasses[position], className)}
      {...props}
    >
      {children}
    </div>
  )
}
