// Adapted from shadcn/ui Card (new-york, MIT).
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section data-slot="card" className={cn('rounded-2xl border border-border bg-card p-5 sm:p-7', className)} {...props} />
}
