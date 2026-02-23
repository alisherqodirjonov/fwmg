import { useEffect, useState } from 'react'
import { Shield, List, Activity, CheckCircle } from 'lucide-react'
import { api } from '../services/api'

interface Stats {
  ruleCount: number
  healthy: boolean
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({ ruleCount: 0, healthy: false })

  useEffect(() => {
    async function load() {
      try {
        const [rules, health] = await Promise.allSettled([
          api.getRules(),
          api.health(),
        ])
        setStats({
          ruleCount: rules.status === 'fulfilled' ? rules.value.length : 0,
          healthy: health.status === 'fulfilled',
        })
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Firewall control plane overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          label="Backend Status"
          value={stats.healthy ? 'Healthy' : 'Offline'}
          color={stats.healthy ? 'bg-emerald-500' : 'bg-red-500'}
        />
        <StatCard
          icon={List}
          label="Configured Rules"
          value={stats.ruleCount}
          color="bg-blue-600"
        />
        <StatCard
          icon={Activity}
          label="Engine"
          value="iptables"
          color="bg-violet-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Apply Method"
          value="Atomic"
          color="bg-amber-500"
        />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Architecture Notes</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>✓ Rules are applied atomically via <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs">iptables-restore</code> — never one-by-one</li>
          <li>✓ User input is never interpolated into shell commands</li>
          <li>✓ All fields are allowlist-validated before reaching the kernel</li>
          <li>✓ Previous rulesets are snapshot-saved for instant rollback</li>
          <li>✓ Backend persists rules to SQLite with full history</li>
        </ul>
      </div>
    </div>
  )
}