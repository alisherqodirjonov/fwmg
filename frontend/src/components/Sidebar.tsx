import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, LayoutDashboard, List, Settings, Network, ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/interfaces', icon: Network, label: 'Interfaces' },
  { to: '/rules', icon: List, label: 'Rules' },  
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isDark, toggleDarkMode } = useDarkMode()

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } min-h-screen bg-gray-900 text-gray-100 flex flex-col transition-all duration-300 ease-in-out`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-5 border-b border-gray-700`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 flex-1">
            <Shield className="text-blue-400 flex-shrink-0" size={26} />
            <div>
              <div className="font-bold text-white leading-tight">Firewall</div>
              <div className="text-xs text-gray-400">Manager</div>
            </div>
          </div>
        )}
        {isCollapsed && <Shield className="text-blue-400 mx-auto" size={28} />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!isCollapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Footer with Controls */}
      <div className={`px-3 py-4 border-t border-gray-700 space-y-2`}>
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          title={isDark ? 'Light mode' : 'Dark mode'}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          {isDark ? (
            <Sun size={20} className="flex-shrink-0" />
          ) : (
            <Moon size={20} className="flex-shrink-0" />
          )}
          {!isCollapsed && <span className="flex-1 text-left">{isDark ? 'Light' : 'Dark'}</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          {isCollapsed ? (
            <ChevronRight size={20} className="flex-shrink-0" />
          ) : (
            <ChevronLeft size={20} className="flex-shrink-0" />
          )}
          {!isCollapsed && <span className="flex-1 text-left">{isCollapsed ? 'Expand' : 'Collapse'}</span>}
        </button>

        {!isCollapsed && (
          <p className="text-xs text-gray-500 px-3 py-2">Kernel: Linux iptables</p>
        )}
      </div>
    </aside>
  )
}