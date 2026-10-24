export type Mode = 'horizon' | 'day_ahead'

export interface Filters {
  startDate: string
  endDate: string
  mode: Mode
  horizonHours: number
  cutoff: string
}

export interface Meta {
  target_start: string
  target_end: string
  min_horizon_hours: number
  max_horizon_hours: number
  default_horizon_hours: number
  default_day_ahead_cutoff: string
  actual_count: number
  forecast_count: number
}

export interface SeriesPoint {
  start_time: string
  actual: number
  forecast: number | null
  publish_time: string | null
  error: number | null
}

export interface Stats {
  count: number
  mean_actual: number
  mae: number
  rmse: number
  bias: number
  median_abs_error: number
  p90_abs_error: number
  p95_abs_error: number
  p99_abs_error: number
  max_abs_error: number
  normalised_mae: number
}

export interface SeriesResponse {
  mode: Mode
  horizon_hours: number | null
  cutoff: string | null
  points: SeriesPoint[]
  stats: Stats | null
  coverage: { forecast_slots: number; matched: number }
}

export interface HorizonPoint {
  horizon_hours: number
  count: number
  mae: number | null
  rmse: number | null
  bias: number | null
  p90_abs_error: number | null
}

export interface AnalysisResponse {
  mode: Mode
  horizon_hours: number | null
  cutoff: string | null
  horizon_curve: HorizonPoint[]
  histogram: { lower: number; upper: number; count: number }[]
  by_hour: { hour: number; mae: number; bias: number; count: number }[]
  generation: { p10: number; p50: number; p90: number; minimum: number; maximum: number } | null
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function toQuery(filters: Filters): string {
  const params = new URLSearchParams({
    start: `${filters.startDate}T00:00:00Z`,
    end: `${addDays(filters.endDate, 1)}T00:00:00Z`,
    mode: filters.mode,
  })
  if (filters.mode === 'horizon') params.set('horizon_hours', String(filters.horizonHours))
  else params.set('cutoff', filters.cutoff)
  return params.toString()
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : response.statusText
    throw new Error(`${response.status}: ${detail}`)
  }
  return response.json() as Promise<T>
}

export const api = {
  meta: (signal?: AbortSignal) => getJson<Meta>('/api/meta', signal),
  series: (filters: Filters, signal?: AbortSignal) => getJson<SeriesResponse>(`/api/series?${toQuery(filters)}`, signal),
  analysis: (filters: Filters, signal?: AbortSignal) =>
    getJson<AnalysisResponse>(`/api/analysis?${toQuery(filters)}`, signal),
}
