import { useEffect, useState } from 'react'
import type { Filters, Mode } from '../api'

export const WINDOW_START = '2026-01-01'
export const WINDOW_END = '2026-02-01'

export const DEFAULT_FILTERS: Filters = {
  startDate: WINDOW_START,
  endDate: WINDOW_END,
  mode: 'horizon',
  horizonHours: 4,
  cutoff: '09:00',
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

function clampDate(value: string | null, fallback: string): string {
  if (!value || !DATE.test(value)) return fallback
  if (value < WINDOW_START) return WINDOW_START
  if (value > WINDOW_END) return WINDOW_END
  return value
}

function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search)
  const startDate = clampDate(params.get('from'), DEFAULT_FILTERS.startDate)
  const endDate = clampDate(params.get('to'), DEFAULT_FILTERS.endDate)
  const horizon = Number(params.get('h'))
  const cutoff = params.get('cutoff')
  return {
    startDate: startDate <= endDate ? startDate : endDate,
    endDate,
    mode: (params.get('mode') as Mode) === 'day_ahead' ? 'day_ahead' : 'horizon',
    horizonHours: Number.isFinite(horizon) && horizon >= 0 && horizon <= 48 && params.has('h') ? horizon : DEFAULT_FILTERS.horizonHours,
    cutoff: cutoff && TIME.test(cutoff) ? cutoff : DEFAULT_FILTERS.cutoff,
  }
}

function writeFilters(filters: Filters) {
  const params = new URLSearchParams({ from: filters.startDate, to: filters.endDate, mode: filters.mode })
  if (filters.mode === 'horizon') params.set('h', String(filters.horizonHours))
  else params.set('cutoff', filters.cutoff)
  window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
}

export function useUrlFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const [filters, setFilters] = useState<Filters>(readFilters)

  useEffect(() => writeFilters(filters), [filters])

  return [filters, (patch) => setFilters((prev) => ({ ...prev, ...patch }))]
}
