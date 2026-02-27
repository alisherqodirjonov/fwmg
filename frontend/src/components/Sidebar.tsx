import { NavLink } from 'react-router-dom'
import { Shield, LayoutDashboard, List, Activity, Settings, Network } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/rules', icon: List, label: 'Rules' },
  { to: '/interfaces', icon: Network, label: 'Interfaces' },
  { to: '/counters', icon: Activity, label: 'Counters' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <Shield className="text-blue-400" size={26} />
        <div>
          <div className="font-bold text-white leading-tight">Firewall</div>
          <div className="text-xs text-gray-400">Manager</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">Kernel: Linux iptables</p>
      </div>
    </aside>
  )
}