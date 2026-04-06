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

const HISTORY_SIZE = 60 // Keep 60 data points = 60 seconds at 1-second intervals
const POLL_INTERVAL = 1000 // Poll every 1 second for per-second rates
const SMOOTHING_FACTOR = 0.4 // EMA smoothing factor (lower = more smoothing, range 0-1)
const MIN_TIME_DELTA = 0.5 // Minimum 0.5 seconds to account for timing drift

interface PreviousCounters {
  in: number
  out: number
  drop: number
  inBytes: number
  outBytes: number
  dropBytes: number
  timestamp: number
}

interface SmoothedRates {
  ppsIn: number
  ppsOut: number
  ppsDrop: number
  bpsIn: number
  bpsOut: number
  bpsDrop: number
}

export function useInterfaceCounters() {
  const [interfaces, setInterfaces] = useState<Interface[]>([])
  const [selectedInterface, setSelectedInterface] = useState<string>('aggregate')
  const [counters, setCounters] = useState<InterfaceCounters | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([
    { timestamp: '00:00:00', in: 0, out: 0, drop: 0 },
  ]) // Pre-populate with initial data point
  const [bytesChartData, setBytesChartData] = useState<BytesChartDataPoint[]>([
    { timestamp: '00:00:00', inBytes: 0, outBytes: 0, dropBytes: 0 },
  ]) // Pre-populate with initial data point
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<ChartDataPoint[]>([
    { timestamp: '00:00:00', in: 0, out: 0, drop: 0 },
  ])
  const bytesHistoryRef = useRef<BytesChartDataPoint[]>([
    { timestamp: '00:00:00', inBytes: 0, outBytes: 0, dropBytes: 0 },
  ])
  const previousCountersRef = useRef<PreviousCounters | null>(null)
  const smoothedRatesRef = useRef<SmoothedRates>({
    ppsIn: 0,
    ppsOut: 0,
    ppsDrop: 0,
    bpsIn: 0,
    bpsOut: 0,
    bpsDrop: 0,
  })
  const lastFetchTimeRef = useRef<number>(0)

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
    const initialPoint = { timestamp: new Date(Date.now()).toLocaleTimeString(), in: 0, out: 0, drop: 0 }
    historyRef.current = [initialPoint]
    bytesHistoryRef.current = [{ ...initialPoint, inBytes: 0, outBytes: 0, dropBytes: 0 }]
    previousCountersRef.current = null
    smoothedRatesRef.current = {
      ppsIn: 0,
      ppsOut: 0,
      ppsDrop: 0,
      bpsIn: 0,
      bpsOut: 0,
      bpsDrop: 0,
    }
    setChartData([initialPoint])
    setBytesChartData([{ ...initialPoint, inBytes: 0, outBytes: 0, dropBytes: 0 }])
    setLoading(true)
    lastFetchTimeRef.current = 0
    
    async function fetchAndCalculateDelta() {
      const now = Date.now()
      
      try {
        let data
        if (selectedInterface === 'aggregate') {
          data = await api.getAggregatedCounters()
        } else {
          data = await api.getInterfaceCounters(selectedInterface)
        }
        
        if (!data) {
          setError('No data received from server')
          return
        }
                
        setCounters(data)
        setError(null)
        
        const timeStr = new Date(now).toLocaleTimeString()
        
        // Calculate delta (rate) from previous reading with smoothing
        let rawPpsIn = 0,
          rawPpsOut = 0,
          rawPpsDrop = 0
        let rawBpsIn = 0,
          rawBpsOut = 0,
          rawBpsDrop = 0

        if (previousCountersRef.current && lastFetchTimeRef.current > 0) {
          let timeDelta = (now - lastFetchTimeRef.current) / 1000 // seconds
          
          // Clamp timeDelta to reasonable values to handle timing drift
          // Expect ~1 second, but accept 0.5-1.5 seconds
          timeDelta = Math.max(MIN_TIME_DELTA, Math.min(timeDelta, 2))
          
          if (timeDelta > 0) {
            // Calculate raw rates
            rawPpsIn = Math.max(0, (data.in.packets - previousCountersRef.current.in) / timeDelta)
            rawPpsOut = Math.max(0, (data.out.packets - previousCountersRef.current.out) / timeDelta)
            rawPpsDrop = Math.max(0, (data.drop.packets - previousCountersRef.current.drop) / timeDelta)
            rawBpsIn = Math.max(0, ((data.in.bytes - previousCountersRef.current.inBytes) * 8) / timeDelta)
            rawBpsOut = Math.max(0, ((data.out.bytes - previousCountersRef.current.outBytes) * 8) / timeDelta)
            rawBpsDrop = Math.max(0, ((data.drop.bytes - previousCountersRef.current.dropBytes) * 8) / timeDelta)
            
            // Apply exponential moving average (EMA) smoothing
            smoothedRatesRef.current.ppsIn = smoothedRatesRef.current.ppsIn === 0 
              ? rawPpsIn 
              : smoothedRatesRef.current.ppsIn * (1 - SMOOTHING_FACTOR) + rawPpsIn * SMOOTHING_FACTOR
              
            smoothedRatesRef.current.ppsOut = smoothedRatesRef.current.ppsOut === 0
              ? rawPpsOut
              : smoothedRatesRef.current.ppsOut * (1 - SMOOTHING_FACTOR) + rawPpsOut * SMOOTHING_FACTOR
              
            smoothedRatesRef.current.ppsDrop = smoothedRatesRef.current.ppsDrop === 0
              ? rawPpsDrop
              : smoothedRatesRef.current.ppsDrop * (1 - SMOOTHING_FACTOR) + rawPpsDrop * SMOOTHING_FACTOR
              
            smoothedRatesRef.current.bpsIn = smoothedRatesRef.current.bpsIn === 0
              ? rawBpsIn
              : smoothedRatesRef.current.bpsIn * (1 - SMOOTHING_FACTOR) + rawBpsIn * SMOOTHING_FACTOR
              
            smoothedRatesRef.current.bpsOut = smoothedRatesRef.current.bpsOut === 0
              ? rawBpsOut
              : smoothedRatesRef.current.bpsOut * (1 - SMOOTHING_FACTOR) + rawBpsOut * SMOOTHING_FACTOR
              
            smoothedRatesRef.current.bpsDrop = smoothedRatesRef.current.bpsDrop === 0
              ? rawBpsDrop
              : smoothedRatesRef.current.bpsDrop * (1 - SMOOTHING_FACTOR) + rawBpsDrop * SMOOTHING_FACTOR
          }
        }

        // Store current counters for next delta calculation
        previousCountersRef.current = {
          in: data.in.packets,
          out: data.out.packets,
          drop: data.drop.packets,
          inBytes: data.in.bytes,
          outBytes: data.out.bytes,
          dropBytes: data.drop.bytes,
          timestamp: now,
        }
        lastFetchTimeRef.current = now

        // Add to packets history with smoothed values
        const newDataPoint: ChartDataPoint = {
          timestamp: timeStr,
          in: Math.round(smoothedRatesRef.current.ppsIn * 100) / 100,
          out: Math.round(smoothedRatesRef.current.ppsOut * 100) / 100,
          drop: Math.round(smoothedRatesRef.current.ppsDrop * 100) / 100,
        }

        // Add to bytes history with smoothed values
        const newBytesDataPoint: BytesChartDataPoint = {
          timestamp: timeStr,
          inBytes: Math.round(smoothedRatesRef.current.bpsIn * 100) / 100,
          outBytes: Math.round(smoothedRatesRef.current.bpsOut * 100) / 100,
          dropBytes: Math.round(smoothedRatesRef.current.bpsDrop * 100) / 100,
        }

        historyRef.current = [...historyRef.current, newDataPoint].slice(-HISTORY_SIZE)
        bytesHistoryRef.current = [...bytesHistoryRef.current, newBytesDataPoint].slice(-HISTORY_SIZE)

        setChartData([...historyRef.current])
        setBytesChartData([...bytesHistoryRef.current])
        setLoading(false)
      } catch (err) {
        console.error('Counter fetch error:', err)
        setError(`Failed to fetch counters: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    // Fetch immediately on first load
    fetchAndCalculateDelta()
    const interval = setInterval(fetchAndCalculateDelta, POLL_INTERVAL)

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
