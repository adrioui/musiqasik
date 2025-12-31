import { cn } from '@/lib/utils'

interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string
  filled?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  xs: 'text-[16px]',
  sm: 'text-[20px]',
  md: 'text-[24px]',
  lg: 'text-[32px]',
  xl: 'text-[48px]',
}

export function MaterialIcon({
  name,
  filled = false,
  size = 'md',
  className,
  ...props
}: MaterialIconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', sizeClasses[size], className)}
      style={{
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
      {...props}
    >
      {name}
    </span>
  )
}
