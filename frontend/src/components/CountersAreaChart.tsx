import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PpsChartDataPoint {
  timestamp: string
  in: number
  out: number
  drop: number
}

interface BpsChartDataPoint {
  timestamp: string
  inBytes: number
  outBytes: number
  dropBytes: number
}

type ChartDataPoint = PpsChartDataPoint | BpsChartDataPoint

interface CountersAreaChartProps {
  data: ChartDataPoint[]
  title: string
  type: 'pps' | 'bps'
  isLoading?: boolean
  error?: string | null
}

function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) {
    return `${(bps / 1_000_000_000).toFixed(2)} Gb/s`
  }
  if (bps >= 1_000_000) {
    return `${(bps / 1_000_000).toFixed(2)} Mb/s`
  }
  if (bps >= 1_000) {
    return `${(bps / 1_000).toFixed(2)} Kb/s`
  }
  return `${bps.toFixed(2)} b/s`
}

function formatPps(pps: number): string {
  if (pps >= 1_000_000) {
    return `${(pps / 1_000_000).toFixed(2)} Mpps`
  }
  if (pps >= 1_000) {
    return `${(pps / 1_000).toFixed(2)} Kpps`
  }
  return `${pps.toFixed(2)} pps`
}

export function CountersAreaChart({
  data,
  title,
  type,
  isLoading = false,
  error = null,
}: CountersAreaChartProps) {
  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">Loading {title}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    )
  }

  const isBps = type === 'bps'

  // Transform data for chart based on type
  const chartData = data.map((d: any) => {
    if (isBps) {
      // Convert bytes to bits
      return {
        timestamp: d.timestamp,
        in: (d.inBytes ?? 0) * 8,
        out: (d.outBytes ?? 0) * 8,
        drop: (d.dropBytes ?? 0) * 8,
      }
    }
    return d
  })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dropGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12 }}
            className="dark:text-gray-400"
          />
          <YAxis
            label={{ value: isBps ? 'Bits/s' : 'Packets/s', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            tick={{ fontSize: 12 }}
            className="dark:text-gray-400"
            tickFormatter={(value: number | undefined) => {
              if (value === undefined) return ''
              return isBps ? formatBps(value) : formatPps(value)
            }}
          />
          <Tooltip
            formatter={(value: number | undefined) => {
              if (value === undefined) return 'N/A'
              return isBps ? formatBps(value) : formatPps(value)
            }}
            contentStyle={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="in"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#inGradient)"
            name="Inbound"
          />
          <Area
            type="monotone"
            dataKey="out"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#outGradient)"
            name="Outbound"
          />
          <Area
            type="monotone"
            dataKey="drop"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#dropGradient)"
            name="Dropped"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
