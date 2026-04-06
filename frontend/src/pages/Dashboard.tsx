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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time firewall control plane overview
            </p>
          </div>
          <select
            value={selectedInterface}
            onChange={(e) => setSelectedInterface(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:text-gray-100 font-medium"
          >
            <option value="aggregate">Aggregate</option>
            {interfaces.map((iface) => (
              <option key={iface.name} value={iface.name}>
                {iface.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 space-y-6 flex flex-col">
        {/* Charts Section - Full Width Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden h-96">
            <CountersAreaChart
              data={chartData}
              title="Packets Per Second (PPS)"
              type="pps"
              isLoading={loading}
              error={error}
            />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden h-96">
            <CountersAreaChart
              data={bytesChartData}
              title="Bits Per Second (BPS)"
              type="bps"
              isLoading={loading}
              error={error}
            />
          </div>
        </div>

        {/* Stats Section */}
        {counters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Inbound Stats */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Inbound
                </h3>
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Packets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {counters.in.packets.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data</p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {(counters.in.bytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>

            {/* Outbound Stats */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Outbound
                </h3>
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Packets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {counters.out.packets.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data</p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {(counters.out.bytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>

            {/* Dropped Stats */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Dropped
                </h3>
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Packets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {counters.drop.packets.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data</p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {(counters.drop.bytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}