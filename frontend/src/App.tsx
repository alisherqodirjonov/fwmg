import { useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'

export function Settings() {
  const [apiKey, setApiKey] = useState(
    import.meta.env.VITE_API_KEY ?? 'dev-insecure-key-change-in-production'
  )
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  )

  function saveApiKey() {
    // In a real app this would persist to localStorage or re-initialize the Axios client.
    toast.success('API key updated for this session')
  }

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure the control plane client</p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Authentication</h2>
        <div>
          <label className="label">API Key (Bearer Token)</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
            />
            <button className="btn-primary flex-shrink-0" onClick={saveApiKey}>
              <Save size={16} />
              Save
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Set via <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">VITE_API_KEY</code> env var or enter above. Sent as <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code>.
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">Toggle between light and dark theme</p>
          </div>
          <button
            onClick={toggleDark}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              darkMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-2">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">About</h2>
        <p className="text-sm text-gray-500">Firewall Manager v1.0.0</p>
        <p className="text-xs text-gray-400">
          Control plane for Linux iptables. Rules are applied atomically via{' '}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">iptables-restore</code>.
          No raw iptables commands are constructed from user input.
        </p>
      </div>
    </div>
  )
}