import { RefreshCw } from 'lucide-react'
import { useCounters } from '../hooks/useCounters'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function CountersPage() {
  const { counters, loading, error, refresh } = useCounters(5000)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Live Counters</h1>
          <p className="text-sm text-gray-500 mt-1">Auto-refreshes every 5 seconds</p>
        </div>
        <button className="btn-ghost" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3">Chain</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Packets</th>
                <th className="px-4 py-3">Bytes</th>
              </tr>
            </thead>
            <tbody>
              {counters.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-gray-400 text-sm">
                    No counter data. Ensure the backend has access to iptables.
                  </td>
                </tr>
              ) : (
                counters.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-sm">{c.chain}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {c.rule}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums">{c.packets.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{formatBytes(c.bytes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}