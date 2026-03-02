import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import type { Interface, InterfaceCounters } from '../types'

export interface ChartDataPoint {
  timestamp: string
  in: number
  out: number
  drop: number
}

export interface BytesChartDataPoint {
  timestamp: string
  inBytes: number
  outBytes: number
  dropBytes: number
}

const HISTORY_SIZE = 20 // Keep last 20 data points for chart

export function useInterfaceCounters() {
  const [interfaces, setInterfaces] = useState<Interface[]>([])
  const [selectedInterface, setSelectedInterface] = useState<string>('aggregate')
  const [counters, setCounters] = useState<InterfaceCounters | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [bytesChartData, setBytesChartData] = useState<BytesChartDataPoint[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<ChartDataPoint[]>([])
  const bytesHistoryRef = useRef<BytesChartDataPoint[]>([])

  useEffect(() => {
    async function fetchInterfaces() {
      try {
        const data = await api.getCounterInterfaces()
        setInterfaces(data)
      } catch (err) {
        setError('Failed to fetch interfaces')
      }
    }

    fetchInterfaces()
  }, [])

  useEffect(() => {
    // Reset history when interface changes
    historyRef.current = []
    bytesHistoryRef.current = []
    setChartData([])
    setBytesChartData([])
    
    async function fetchCounters() {
      setLoading(true)
      setError(null)
      try {
        let data
        if (selectedInterface === 'aggregate') {
          data = await api.getAggregatedCounters()
        } else {
          data = await api.getInterfaceCounters(selectedInterface)
        }
        setCounters(data)

        // Add to packets history
        const newDataPoint: ChartDataPoint = {
          timestamp: new Date().toLocaleTimeString(),
          in: data.in.packets,
          out: data.out.packets,
          drop: data.drop.packets,
        }

        // Add to bytes history
        const newBytesDataPoint: BytesChartDataPoint = {
          timestamp: new Date().toLocaleTimeString(),
          inBytes: data.in.bytes,
          outBytes: data.out.bytes,
          dropBytes: data.drop.bytes,
        }

        historyRef.current = [...historyRef.current, newDataPoint].slice(-HISTORY_SIZE)
        bytesHistoryRef.current = [...bytesHistoryRef.current, newBytesDataPoint].slice(-HISTORY_SIZE)
        
        setChartData([...historyRef.current])
        setBytesChartData([...bytesHistoryRef.current])
      } catch (err) {
        setError(`Failed to fetch counters for ${selectedInterface}`)
      } finally {
        setLoading(false)
      }
    }

    fetchCounters()
    const interval = setInterval(fetchCounters, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [selectedInterface])

  return {
    interfaces,
    selectedInterface,
    setSelectedInterface,
    counters,
    chartData,
    bytesChartData,
    loading,
    error,
  }
}
