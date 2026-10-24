import { useEffect, useRef, useState } from 'react'

export interface ApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

interface Settled<T> {
  key: string | null
  data: T | null
  error: string | null
}

export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, key: string): ApiState<T> {
  const [settled, setSettled] = useState<Settled<T>>({ key: null, data: null, error: null })
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    const controller = new AbortController()
    loadRef.current(controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setSettled((prev) => ({ key, data: prev.data, error: error instanceof Error ? error.message : String(error) }))
      })
    return () => controller.abort()
  }, [key])

  return { data: settled.data, error: settled.error, loading: settled.key !== key }
}
