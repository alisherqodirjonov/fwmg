import { useState, useEffect } from 'react'
import { Save, Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { Modal } from '../components/Modal'
import type { FirewallConfig, NATRule, CreateNATRulePayload } from '../types'

export function Settings() {
  const [config, setConfig] = useState<FirewallConfig | null>(null)
  const [natRules, setNatRules] = useState<NATRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showNATModal, setShowNATModal] = useState(false)
  const [editingNATRule, setEditingNATRule] = useState<NATRule | null>(null)
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  )
  const [natFormData, setNatFormData] = useState<Partial<CreateNATRulePayload>>({
    name: '',
    type: 'SNAT',
    protocol: 'all',
    inInterface: '',
    outInterface: '',
    sourceIP: '',
    sourcePort: '',
    destIP: '',
    destPort: '',
    nattoIP: '',
    nattoPort: '',
    comment: '',
    enabled: true,
    position: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [cfg, rules] = await Promise.all([api.getConfig(), api.getNATRules()])
      setConfig(cfg)
      setNatRules(rules)
    } catch (error) {
      toast.error(`Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveConfig() {
    if (!config) return
    try {
      const updated = await api.updateConfig(config.ipForwarding, config.natEnabled)
      setConfig(updated)
      toast.success('Configuration saved')
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function handleSaveNATRule() {
    try {
      if (!natFormData.name?.trim()) {
        toast.error('NAT rule name is required')
        return
      }
      if (!natFormData.nattoIP?.trim()) {
        toast.error('NAT IP is required')
        return
      }

      if (editingNATRule) {
        const updated = await api.updateNATRule(editingNATRule.id, natFormData as CreateNATRulePayload)
        setNatRules(natRules.map((r) => (r.id === updated.id ? updated : r)))
        toast.success('NAT rule updated')
      } else {
        const created = await api.createNATRule(natFormData as CreateNATRulePayload)
        setNatRules([...natRules, created])
        toast.success('NAT rule created')
      }
      resetNATForm()
      setShowNATModal(false)
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function handleDeleteNATRule(id: string) {
    if (!window.confirm('Delete this NAT rule?')) return
    try {
      await api.deleteNATRule(id)
      setNatRules(natRules.filter((r) => r.id !== id))
      toast.success('NAT rule deleted')
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  function resetNATForm() {
    setNatFormData({
      name: '',
      type: 'SNAT',
      protocol: 'all',
      inInterface: '',
      outInterface: '',
      sourceIP: '',
      sourcePort: '',
      destIP: '',
      destPort: '',
      nattoIP: '',
      nattoPort: '',
      comment: '',
      enabled: true,
      position: 0,
    })
    setEditingNATRule(null)
  }

  function openEditNATRule(rule: NATRule) {
    setEditingNATRule(rule)
    setNatFormData(rule)
    setShowNATModal(true)
  }

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
  }

  if (loading) {
    return <div className="p-6">Loading settings...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure firewall features and settings</p>
      </div>

      {/* Firewall Configuration */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Firewall Features</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">IP Forwarding</p>
              <p className="text-xs text-gray-400 mt-0.5">Enable routing between network interfaces</p>
            </div>
            <button
              onClick={() => {
                if (config) {
                  setConfig({ ...config, ipForwarding: !config.ipForwarding })
                }
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config?.ipForwarding ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  config?.ipForwarding ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Network Address Translation (NAT)</p>
              <p className="text-xs text-gray-400 mt-0.5">Enable NAT and port forwarding</p>
            </div>
            <button
              onClick={() => {
                if (config) {
                  setConfig({ ...config, natEnabled: !config.natEnabled })
                }
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config?.natEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  config?.natEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleSaveConfig} className="btn-primary inline-flex items-center gap-2">
            <Save size={16} />
            Save Configuration
          </button>
        </div>
      </div>

      {/* NAT Rules Management */}
      {config?.natEnabled && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">NAT Rules</h2>
              <p className="text-xs text-gray-400 mt-1">Configure SNAT and DNAT rules for translation</p>
            </div>
            <button
              onClick={() => {
                resetNATForm()
                setShowNATModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add NAT Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Protocol</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Source → NAT To</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {natRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      No NAT rules defined
                    </td>
                  </tr>
                ) : (
                  natRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                        {rule.comment && (
                          <div className="text-xs text-gray-500">{rule.comment}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${rule.type === 'SNAT' ? 'badge-blue' : 'badge-purple'}`}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge badge-neutral">{rule.protocol}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>{rule.sourceIP || 'Any'} → {rule.nattoIP}</div>
                        {rule.sourcePort && (
                          <div className="text-gray-500">:{rule.sourcePort} → :{rule.nattoPort || '*'}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-warning'}`}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-x-2">
                        <button
                          onClick={() => openEditNATRule(rule)}
                          className="btn-sm btn-secondary inline-flex items-center gap-1"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNATRule(rule.id)}
                          className="btn-sm btn-error inline-flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Appearance */}
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

      {/* About */}
      <div className="card p-6 space-y-2">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">About</h2>
        <p className="text-sm text-gray-500">Firewall Manager v1.0.0</p>
        <p className="text-xs text-gray-400">
          Enterprise firewall control plane for Linux. Supports rules, NAT, interface management, and zones.
          All configurations are applied securely via iptables-restore without shell interpolation.
        </p>
      </div>

      {/* NAT Rule Modal */}
      <Modal
        isOpen={showNATModal}
        onClose={() => {
          setShowNATModal(false)
          resetNATForm()
        }}
        title={editingNATRule ? 'Edit NAT Rule' : 'Add NAT Rule'}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="label">Rule Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Office NAT, Web Server NAT"
              value={natFormData.name || ''}
              onChange={(e) => setNatFormData({ ...natFormData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={natFormData.type || ''}
                onChange={(e) => setNatFormData({ ...natFormData, type: e.target.value as any })}
              >
                <option value="SNAT">SNAT (Source NAT)</option>
                <option value="DNAT">DNAT (Destination NAT)</option>
              </select>
            </div>

            <div>
              <label className="label">Protocol</label>
              <select
                className="input"
                value={natFormData.protocol || ''}
                onChange={(e) => setNatFormData({ ...natFormData, protocol: e.target.value as any })}
              >
                <option value="all">All</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">In Interface</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., eth0"
                value={natFormData.inInterface || ''}
                onChange={(e) => setNatFormData({ ...natFormData, inInterface: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Out Interface</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., eth1"
                value={natFormData.outInterface || ''}
                onChange={(e) => setNatFormData({ ...natFormData, outInterface: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Source/Destination</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Source IP/CIDR</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="e.g., 192.168.1.0/24"
                  value={natFormData.sourceIP || ''}
                  onChange={(e) => setNatFormData({ ...natFormData, sourceIP: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">Source Port</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="e.g., 80 or 80:443"
                  value={natFormData.sourcePort || ''}
                  onChange={(e) => setNatFormData({ ...natFormData, sourcePort: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">Dest IP/CIDR</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="e.g., 10.0.0.5"
                  value={natFormData.destIP || ''}
                  onChange={(e) => setNatFormData({ ...natFormData, destIP: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">Dest Port</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="e.g., 8080"
                  value={natFormData.destPort || ''}
                  onChange={(e) => setNatFormData({ ...natFormData, destPort: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">NAT Target</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">NAT to IP *</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="e.g., 192.168.1.100"
                  value={natFormData.nattoIP || ''}
                  onChange={(e) => setNatFormData({ ...natFormData, nattoIP: e.target.value })}
                />
              </div>

              <div>
                <label className="label text-xs">NAT to Port</label>
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="e.g., 8080"
                  value={natFormData.nattoPort || ''}
                  onChange={(e) => setNatFormData({ ...natFormData, nattoPort: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Comment</label>
            <textarea
              className="input text-sm"
              rows={2}
              placeholder="e.g., NAT for office subnet"
              value={natFormData.comment || ''}
              onChange={(e) => setNatFormData({ ...natFormData, comment: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="natrule-enabled"
              checked={natFormData.enabled !== false}
              onChange={(e) => setNatFormData({ ...natFormData, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="natrule-enabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Enabled
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleSaveNATRule} className="btn-primary flex-1">
              Save NAT Rule
            </button>
            <button
              onClick={() => {
                setShowNATModal(false)
                resetNATForm()
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}