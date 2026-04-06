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
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gb/s`
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mb/s`
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kb/s`
  return `${bps.toFixed(2)} b/s`
}

function formatPps(pps: number): string {
  if (pps >= 1_000_000) return `${(pps / 1_000_000).toFixed(2)} Mpps`
  if (pps >= 1_000) return `${(pps / 1_000).toFixed(2)} Kpps`
  return `${pps.toFixed(2)} pps`
}

const SERIES = [
  {
    key: 'in',
    label: 'Inbound',
    color: '#38bdf8',
    gradientId: 'inGradient',
    gradientStart: '#38bdf8',
    gradientEnd: '#0ea5e9',
    dotColor: '#7dd3fc',
  },
  {
    key: 'out',
    label: 'Outbound',
    color: '#34d399',
    gradientId: 'outGradient',
    gradientStart: '#34d399',
    gradientEnd: '#10b981',
    dotColor: '#6ee7b7',
  },
  {
    key: 'drop',
    label: 'Dropped',
    color: '#f87171',
    gradientId: 'dropGradient',
    gradientStart: '#f87171',
    gradientEnd: '#ef4444',
    dotColor: '#fca5a5',
  },
]

const CustomTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  formatter: (v: number) => string
}) => {
  if (!active || !payload?.length) return null

  return (
    <div
      style={{
        background: 'rgba(10, 15, 30, 0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        minWidth: '160px',
      }}
    >
      <p
        style={{
          color: 'rgba(148,163,184,0.8)',
          fontSize: '11px',
          marginBottom: '8px',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      {payload.map((entry: any) => {
        const series = SERIES.find((s) => s.key === entry.dataKey)
        return (
          <div
            key={entry.dataKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: series?.color ?? entry.color,
                boxShadow: `0 0 6px ${series?.color ?? entry.color}`,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'rgba(203,213,225,0.7)', fontSize: '11px', flex: 1 }}>
              {entry.name}
            </span>
            <span
              style={{
                color: series?.color ?? entry.color,
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {formatter(entry.value ?? 0)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const CustomLegend = ({ payload }: { payload?: any[] }) => {
  if (!payload) return null
  return (
    <div
      style={{
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        paddingTop: '8px',
      }}
    >
      {payload.map((entry: any) => {
        const series = SERIES.find((s) => s.label === entry.value)
        return (
          <div
            key={entry.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '11px',
              color: 'rgba(148,163,184,0.8)',
              letterSpacing: '0.04em',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: '24px',
                  height: '2px',
                  background: series?.color ?? entry.color,
                  borderRadius: '2px',
                  boxShadow: `0 0 6px ${series?.color ?? entry.color}80`,
                }}
              />
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: series?.color ?? entry.color,
                  boxShadow: `0 0 6px ${series?.color ?? entry.color}`,
                }}
              />
            </span>
            {entry.value}
          </div>
        )
      })}
    </div>
  )
}

export function CountersAreaChart({
  data,
  title,
  type,
  isLoading = false,
  error = null,
}: CountersAreaChartProps) {
  const isBps = type === 'bps'
  const formatter = isBps ? formatBps : formatPps
  const unitLabel = isBps ? 'bits/s' : 'pkts/s'

  if (isLoading && (!data || data.length <= 1)) {
    return (
      <div
        style={{
          height: '384px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(14,20,40,0.95) 0%, rgba(10,15,30,0.98) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          gap: '12px',
        }}
      >
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes spin-slow {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ position: 'relative', width: '40px', height: '40px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid #38bdf840',
              animation: 'pulse-ring 1.5s ease-out infinite',
            }}
          />
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '2px solid rgba(56,189,248,0.15)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin-slow 0.9s linear infinite',
            }}
          />
        </div>
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            color: 'rgba(148,163,184,0.7)',
            fontSize: '13px',
            letterSpacing: '0.05em',
          }}
        >
          Initializing {title.toLowerCase()}…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          height: '384px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(20,10,10,0.95) 0%, rgba(10,15,30,0.98) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(248,113,113,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <p
            style={{
              color: '#f87171',
              fontSize: '13px',
              fontFamily: '"JetBrains Mono", monospace',
              marginBottom: '6px',
            }}
          >
            ⚠ {error}
          </p>
          <p
            style={{
              color: 'rgba(148,163,184,0.5)',
              fontSize: '11px',
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: '0.04em',
            }}
          >
            Check browser console or backend logs
          </p>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: '384px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: 'rgba(148,163,184,0.5)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px',
          }}
        >
          No data available
        </p>
      </div>
    )
  }

  const chartData = data.map((d: any) => {
    if (isBps) {
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(160deg, rgba(14,22,45,0.97) 0%, rgba(8,12,28,0.99) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '3px',
              height: '18px',
              borderRadius: '2px',
              background: 'linear-gradient(180deg, #38bdf8, #818cf8)',
              boxShadow: '0 0 8px #38bdf880',
            }}
          />
          <h3
            style={{
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(226,232,240,0.9)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            color: 'rgba(100,116,139,0.7)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.04)',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {unitLabel}
        </span>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0, padding: '12px 8px 8px 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.gradientStart} stopOpacity={0.35} />
                  <stop offset="60%" stopColor={s.gradientEnd} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={s.gradientEnd} stopOpacity={0} />
                </linearGradient>
              ))}
              <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="1 6"
              stroke="rgba(148,163,184,0.06)"
              vertical={false}
            />

            <XAxis
              dataKey="timestamp"
              tick={{
                fontSize: 10,
                fill: 'rgba(100,116,139,0.6)',
                fontFamily: '"JetBrains Mono", monospace',
              }}
              axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{
                fontSize: 10,
                fill: 'rgba(100,116,139,0.6)',
                fontFamily: '"JetBrains Mono", monospace',
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (v === undefined ? '' : formatter(v))}
              width={72}
            />

            <Tooltip
              content={<CustomTooltip formatter={formatter} />}
              cursor={{
                stroke: 'rgba(148,163,184,0.15)',
                strokeWidth: 1,
                strokeDasharray: '3 3',
              }}
            />

            <Legend content={<CustomLegend />} />

            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotoneX"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={1.5}
                fill={`url(#${s.gradientId})`}
                fillOpacity={1}
                name={s.label}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: s.color,
                  stroke: s.dotColor,
                  strokeWidth: 1.5,
                  style: { filter: `drop-shadow(0 0 6px ${s.color})` },
                }}
                isAnimationActive={false}
                animationDuration={0}
                animationEasing="ease-out"
                style={{ filter: 'url(#lineGlow)' }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}