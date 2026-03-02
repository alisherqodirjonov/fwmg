import { useInterfaceCounters } from '../hooks/useInterfaceCounters'
import { CountersAreaChart } from '../components/CountersAreaChart'

export function Dashboard() {
  const {
    interfaces,
    selectedInterface,
    setSelectedInterface,
    counters,
    chartData,
    bytesChartData,
    loading,
    error,
  } = useInterfaceCounters()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Firewall control plane overview
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Traffic Counters
          </h2>
          <select
            value={selectedInterface}
            onChange={(e) => setSelectedInterface(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="aggregate">Aggregate</option>
            {interfaces.map((iface) => (
              <option key={iface.name} value={iface.name}>
                {iface.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CountersAreaChart
            data={chartData}
            title="Packets Per Second (PPS)"
            type="pps"
            isLoading={loading}
            error={error}
          />
          <CountersAreaChart
            data={bytesChartData}
            title="Bits Per Second (BPS)"
            type="bps"
            isLoading={loading}
            error={error}
          />
        </div>

        {counters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Inbound</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-semibold">{counters.in.packets.toLocaleString()}</span> packets
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(counters.in.bytes / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Outbound</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-semibold">{counters.out.packets.toLocaleString()}</span> packets
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(counters.out.bytes / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Dropped</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                <span className="font-semibold">{counters.drop.packets.toLocaleString()}</span> packets
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(counters.drop.bytes / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}