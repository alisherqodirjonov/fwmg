import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { Modal } from '../components/Modal'
import type { FirewallConfig, NATRule, CreateNATRulePayload, NetworkInterface } from '../types'

export function Settings() {
  const [config, setConfig] = useState<FirewallConfig | null>(null)
  const [natRules, setNatRules] = useState<NATRule[]>([])
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
  const [loading, setLoading] = useState(true)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
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
      const [cfg, rules, ifaces] = await Promise.all([api.getConfig(), api.getNATRules(), api.getInterfaces()])
      setConfig(cfg)
      setNatRules(rules)
      setInterfaces(ifaces)
    } catch (error) {
      toast.error(`Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfigChange(key: 'ipForwarding' | 'natEnabled', value: boolean) {
    if (!config || isSavingConfig) return

    setIsSavingConfig(true)
    const oldConfig = config
    const newConfig = { ...config, [key]: value }

    // Optimistic UI update
    setConfig(newConfig)

    try {
      const updated = await api.updateConfig(newConfig.ipForwarding, newConfig.natEnabled)
      setConfig(updated) // Sync with server state
      toast.success('Configuration saved')
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setConfig(oldConfig) // Revert on failure
    } finally {
      setIsSavingConfig(false)
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
        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Firewall Core Features</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Configure essential firewall capabilities required for routing and traffic translation</p>
        
        <div className="space-y-4">
          <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">IP Forwarding</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enable packet forwarding between network interfaces. Required for the firewall to act as a router and for NAT to function properly.</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Status: {config?.ipForwarding ? '✓ Enabled' : '○ Disabled'}</p>
            </div>
            <button
              onClick={() => config && handleConfigChange('ipForwarding', !config.ipForwarding)}
              disabled={isSavingConfig || !config}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
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

          <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Network Address Translation (NAT)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure SNAT (Source NAT) and DNAT (Destination NAT) rules. SNAT modifies source IPs of outgoing packets; DNAT modifies destination IPs of incoming packets. Requires IP Forwarding.</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Status: {config?.natEnabled ? '✓ Enabled' : '○ Disabled'}</p>
            </div>
            <button
              onClick={() => config && handleConfigChange('natEnabled', !config.natEnabled)}
              disabled={isSavingConfig || !config}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-4 ${
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
          
          {config?.natEnabled && !config?.ipForwarding && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">⚠ Warning: NAT requires IP Forwarding to be enabled to function correctly.</p>
            </div>
          )}
        </div>
      </div>

      {/* SNAT Rules Management */}
      {config?.natEnabled && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">SNAT Rules (Source NAT)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Modify source IP of outgoing packets. Example: Internal traffic appears to come from firewall's external IP.</p>
            </div>
            <button
              onClick={() => {
                resetNATForm()
                setNatFormData({ ...natFormData, type: 'SNAT' })
                setShowNATModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add SNAT Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Protocol</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Source IP → NAT To</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {natRules.filter((r) => r.type === 'SNAT').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No SNAT rules defined
                    </td>
                  </tr>
                ) : (
                  natRules.filter((r) => r.type === 'SNAT').map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                        {rule.comment && (
                          <div className="text-xs text-gray-500">{rule.comment}</div>
                        )}
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

      {/* DNAT Rules Management */}
      {config?.natEnabled && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">DNAT Rules (Destination NAT)</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Modify destination IP of incoming packets. Example: External traffic to firewall IP gets redirected to internal server.</p>
            </div>
            <button
              onClick={() => {
                resetNATForm()
                setNatFormData({ ...natFormData, type: 'DNAT' })
                setShowNATModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add DNAT Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Protocol</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Destination IP → Redirect To</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {natRules.filter((r) => r.type === 'DNAT').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No DNAT rules defined
                    </td>
                  </tr>
                ) : (
                  natRules.filter((r) => r.type === 'DNAT').map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                        {rule.comment && (
                          <div className="text-xs text-gray-500">{rule.comment}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge badge-neutral">{rule.protocol}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div>{rule.destIP || 'Any'} → {rule.nattoIP}</div>
                        {rule.destPort && (
                          <div className="text-gray-500">:{rule.destPort} → :{rule.nattoPort || '*'}</div>
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
        title={editingNATRule ? `Edit ${natFormData.type} Rule` : `Add ${natFormData.type} Rule`}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Rule Type Info */}
          <div className={`p-3 rounded-lg ${natFormData.type === 'SNAT' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'}`}>
            <p className={`text-xs font-medium ${natFormData.type === 'SNAT' ? 'text-blue-800 dark:text-blue-200' : 'text-purple-800 dark:text-purple-200'}`}>
              {natFormData.type === 'SNAT' 
                ? '📤 SNAT: Modify the SOURCE IP of outgoing packets. Use to make internal traffic appear to come from the firewall.'
                : '📥 DNAT: Modify the DESTINATION IP of incoming packets. Use to redirect external traffic to internal servers.'}
            </p>
          </div>

          <div>
            <label className="label">Rule Name</label>
            <input
              type="text"
              className="input"
              placeholder={natFormData.type === 'SNAT' ? 'e.g., Internal to External NAT' : 'e.g., Web Server Port Forward'}
              value={natFormData.name || ''}
              onChange={(e) => setNatFormData({ ...natFormData, name: e.target.value })}
            />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">In Interface</label>
              <select
                className="input"
                value={natFormData.inInterface || ''}
                onChange={(e) => setNatFormData({ ...natFormData, inInterface: e.target.value })}
              >
                <option value="">Any</option>
                {interfaces.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Out Interface</label>
              <select
                className="input"
                value={natFormData.outInterface || ''}
                onChange={(e) => setNatFormData({ ...natFormData, outInterface: e.target.value })}
              >
                <option value="">Any</option>
                {interfaces.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
            </div>
          </div>

          {natFormData.type === 'SNAT' ? (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Traffic to Translate (Source)</p>
                
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
                    <label className="label text-xs">Source Port (optional)</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., 80 or 5000:6000"
                      value={natFormData.sourcePort || ''}
                      onChange={(e) => setNatFormData({ ...natFormData, sourcePort: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Translate To (New Source)</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">New Source IP *</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., 203.0.113.5"
                      value={natFormData.nattoIP || ''}
                      onChange={(e) => setNatFormData({ ...natFormData, nattoIP: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label text-xs">New Source Port (optional)</label>
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
            </>
          ) : (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Incoming Traffic (Destination)</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Destination IP/CIDR</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., 203.0.113.5"
                      value={natFormData.destIP || ''}
                      onChange={(e) => setNatFormData({ ...natFormData, destIP: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label text-xs">Destination Port (optional)</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., 80 or 8000:9000"
                      value={natFormData.destPort || ''}
                      onChange={(e) => setNatFormData({ ...natFormData, destPort: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Redirect To (Internal Server)</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Internal IP *</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g., 192.168.1.100"
                      value={natFormData.nattoIP || ''}
                      onChange={(e) => setNatFormData({ ...natFormData, nattoIP: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label text-xs">Internal Port (optional)</label>
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
            </>
          )}

          <div>
            <label className="label">Comment</label>
            <textarea
              className="input text-sm"
              rows={2}
              placeholder={natFormData.type === 'SNAT' ? 'e.g., NAT for office subnet' : 'e.g., Port forward for web server'}
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
              Save {natFormData.type} Rule
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