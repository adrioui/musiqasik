import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-card/75 p-4 shadow-lg backdrop-blur-xl',
        'dark:bg-[rgba(16,29,34,0.75)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
