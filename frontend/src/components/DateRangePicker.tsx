import { useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  start: string
  end: string
  min: string
  max: string
  onChange: (start: string, end: string) => void
}

const DAY = 86_400_000
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

function label(start: string, end: string): string {
  if (start === end) return dayMonthYear.format(toMs(start))
  return `${dayMonth.format(toMs(start))} – ${dayMonthYear.format(toMs(end))}`
}

function gridDays(min: string, max: string): number[] {
  const first = toMs(min)
  const offset = (new Date(first).getUTCDay() + 6) % 7
  const gridStart = first - offset * DAY
  const last = toMs(max)
  const trailing = 6 - ((new Date(last).getUTCDay() + 6) % 7)
  const count = Math.round((last - gridStart) / DAY) + 1 + trailing
  return Array.from({ length: count }, (_, i) => gridStart + i * DAY)
}

export default function DateRangePicker({ start, end, min, max, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const days = useMemo(() => gridDays(min, max), [min, max])
  const minMs = toMs(min)
  const maxMs = toMs(max)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setAnchor(null)
    setHover(null)
  }

  function pick(ms: number) {
    if (anchor == null) {
      setAnchor(ms)
      return
    }
    const [a, b] = ms < anchor ? [ms, anchor] : [anchor, ms]
    onChange(toIso(a), toIso(b))
    close()
  }

  const rangeStart = anchor != null ? Math.min(anchor, hover ?? anchor) : toMs(start)
  const rangeEnd = anchor != null ? Math.max(anchor, hover ?? anchor) : toMs(end)

  return (
    <div className="drp" ref={rootRef}>
      <button
        type="button"
        className="drp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span>{label(start, end)}</span>
        <svg className="drp-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="drp-popover" role="dialog" aria-label="Choose delivery period">
          <div className="drp-head">
            <span className="drp-month">{monthYear.format(minMs)}</span>
            <span className="drp-hint">{anchor == null ? 'Pick a start day' : 'Now pick an end day'}</span>
          </div>
          <div className="drp-grid" role="grid" onPointerLeave={() => setHover(null)}>
            {WEEKDAYS.map((d) => (
              <span key={d} className="drp-weekday" role="columnheader">
                {d}
              </span>
            ))}
            {days.map((ms) => {
              const disabled = ms < minMs || ms > maxMs
              const inRange = ms >= rangeStart && ms <= rangeEnd
              const isStart = ms === rangeStart
              const isEnd = ms === rangeEnd
              const classes = ['drp-day']
              if (inRange) classes.push('in-range')
              if (isStart) classes.push('range-start')
              if (isEnd) classes.push('range-end')
              if (new Date(ms).getUTCMonth() !== new Date(minMs).getUTCMonth()) classes.push('other-month')
              return (
                <button
                  key={ms}
                  type="button"
                  role="gridcell"
                  className={classes.join(' ')}
                  disabled={disabled}
                  aria-selected={inRange}
                  aria-label={fullDate.format(ms)}
                  onClick={() => pick(ms)}
                  onPointerEnter={() => anchor != null && setHover(ms)}
                  onFocus={() => anchor != null && setHover(ms)}
                >
                  <span>{new Date(ms).getUTCDate()}</span>
                </button>
              )
            })}
          </div>
          <div className="drp-foot">
            <button type="button" className="drp-link" onClick={() => { onChange(min, max); close() }}>
              Whole period
            </button>
            <button type="button" className="drp-link muted" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
