const UK = 'Europe/London'

const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: UK, day: 'numeric', month: 'short' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: UK, hour: '2-digit', minute: '2-digit' })
const fullFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

export const formatDay = (ms: number) => dayFormat.format(ms)
export const formatTime = (ms: number) => timeFormat.format(ms)
export const formatDateTime = (value: number | string) => fullFormat.format(new Date(value))

export function formatMW(value: number | null | undefined): string {
  return value == null ? '—' : `${numberFormat.format(value)} MW`
}

export function formatSignedMW(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${numberFormat.format(Math.abs(value))} MW`
}

export function formatGW(value: number): string {
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} GW`
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`
}

export function niceTicks(max: number, target = 5): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0]
  const magnitude = 10 ** Math.floor(Math.log10(max / target))
  const step = [1, 2, 2.5, 5, 10, 20].map((m) => m * magnitude).find((s) => Math.ceil(max / s) <= target) ?? max
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}

export function dayTicks(startMs: number, endMs: number, maxTicks = 10): number[] {
  const DAY = 86_400_000
  const first = Math.ceil(startMs / DAY) * DAY
  const days = Math.floor((endMs - first) / DAY) + 1
  const step = Math.max(1, Math.ceil(days / maxTicks))
  return Array.from({ length: Math.ceil(days / step) }, (_, i) => first + i * step * DAY).filter((t) => t <= endMs)
}
