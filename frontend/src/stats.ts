import type { SeriesPoint } from './api'

export interface Buffers {
  p50: number
  p90: number
  p95: number
}

export function percentile(values: number[], q: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const position = ((sorted.length - 1) * q) / 100
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export function buffers(points: SeriesPoint[]): Buffers | null {
  const errors = points.flatMap((p) => (p.error == null ? [] : [p.error]))
  if (!errors.length) return null
  return {
    p50: percentile(errors, 50)!,
    p90: percentile(errors, 90)!,
    p95: percentile(errors, 95)!,
  }
}
