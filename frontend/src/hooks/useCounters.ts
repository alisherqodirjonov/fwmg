import { useState, useEffect, useCallback } from 'react'
import type { Counter } from '../types'
import { api } from '../services/api'

export function useCounters(refreshInterval = 5000) {
  const [counters, setCounters] = useState<Counter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCounters()
      setCounters(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const timer = setInterval(fetch, refreshInterval)
    return () => clearInterval(timer)
  }, [fetch, refreshInterval])

  return { counters, loading, error, refresh: fetch }
}