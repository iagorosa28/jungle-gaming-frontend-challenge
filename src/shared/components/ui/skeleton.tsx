import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('skeleton rounded-md bg-secondary', className)} {...props} />
}
