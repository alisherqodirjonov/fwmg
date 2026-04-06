import { useState, useEffect } from 'react'
import { Trash2, Plus, Edit2, Network, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { Modal } from '../components/Modal'
import type { NetworkInterface, Zone, PolicyType } from '../types'

export function InterfacesPage() {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingInterface, setEditingInterface] = useState<NetworkInterface | null>(null)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    zone: 'public',
    enabled: true,
    notes: '',
    ip: '',
    mask: '',
    gateway: '',
  })
  const [zoneFormData, setZoneFormData] = useState<{
    name: string
    description: string
    target: PolicyType
    inPolicy: PolicyType
    outPolicy: PolicyType
  }>({
    name: '',
    description: '',
    target: 'REJECT',
    inPolicy: 'REJECT',
    outPolicy: 'ACCEPT',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [ifaces, z] = await Promise.all([api.getInterfaces(), api.getZones()])
      setInterfaces(ifaces)
      setZones(z)
    } catch (error) {
      toast.error(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveInterface() {
    try {
      if (!formData.name.trim()) {
        toast.error('Interface name is required')
        return
      }

      if (editingInterface) {
        await api.updateInterface(editingInterface.id, {
          name: formData.name,
          zone: formData.zone,
          enabled: formData.enabled,
          notes: formData.notes,
          ip: formData.ip,
          mask: formData.mask,
          gateway: formData.gateway,
        })
      } else {
        await api.createInterface({
          name: formData.name,
          zone: formData.zone,
          enabled: formData.enabled,
          notes: formData.notes,
          ip: formData.ip,
          mask: formData.mask,
          gateway: formData.gateway,
        })
      }
      // Reload interfaces to show actual applied state from system
      const updated = await api.getInterfaces()
      setInterfaces(updated)
      toast.success(editingInterface ? 'Interface updated and configuration applied' : 'Interface created')
      resetForm()
      setShowModal(false)
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function handleSaveZone() {
    try {
      if (!zoneFormData.name.trim()) {
        toast.error('Zone name is required')
        return
      }

      if (editingZone) {
        const updated = await api.updateZone(editingZone.id, zoneFormData)
        setZones(zones.map((z) => (z.id === updated.id ? updated : z)))
        toast.success('Zone updated')
      } else {
        const created = await api.createZone(zoneFormData)
        setZones([...zones, created])
        toast.success('Zone created')
      }
      resetZoneForm()
      setShowZoneModal(false)
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function handleDeleteZone(id: string) {
    if (!window.confirm('Delete this zone?')) return
    try {
      await api.deleteZone(id)
      setZones(zones.filter((z) => z.id !== id))
      toast.success('Zone deleted')
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      zone: 'public',
      enabled: true,
      notes: '',
      ip: '',
      mask: '',
      gateway: '',
    })
    setEditingInterface(null)
  }

  function resetZoneForm() {
    setZoneFormData({
      name: '',
      description: '',
      target: 'REJECT',
      inPolicy: 'REJECT',
      outPolicy: 'ACCEPT',
    })
    setEditingZone(null)
  }

  function openEditInterface(iface: NetworkInterface) {
    setEditingInterface(iface)
    setFormData({
      name: iface.name,
      zone: iface.zone,
      enabled: iface.enabled,
      notes: iface.notes,
      ip: iface.ip || '',
      mask: iface.mask || '',
      gateway: iface.gateway || '',
    })
    setShowModal(true)
  }

  function openEditZone(zone: Zone) {
    setEditingZone(zone)
    setZoneFormData({
      name: zone.name,
      description: zone.description,
      target: zone.target,
      inPolicy: zone.inPolicy,
      outPolicy: zone.outPolicy,
    })
    setShowZoneModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Network size={32} className="text-blue-600" />
              Interface Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure network interfaces and firewall zones</p>
          </div>
          <button
            onClick={loadData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 space-y-8">
        {/* Zones Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Firewall Zones</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Define zone policies for network segmentation</p>
            </div>
            <button
              onClick={() => {
                resetZoneForm()
                setShowZoneModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add Zone
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Target</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">In Policy</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Out Policy</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No zones defined
                      </td>
                    </tr>
                  ) : (
                    zones.map((zone) => (
                      <tr key={zone.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{zone.name}</div>
                          {zone.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{zone.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {zone.target}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              zone.inPolicy === 'ACCEPT'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {zone.inPolicy}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              zone.outPolicy === 'ACCEPT'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {zone.outPolicy}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => openEditZone(zone)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <Trash2 size={12} />
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
        </div>

        {/* Interfaces Section - Redesigned */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Network Interfaces</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage and assign interfaces to zones</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add Interface
            </button>
          </div>

          {interfaces.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 py-12 text-center">
              <Network size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No interfaces configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interfaces.map((iface) => {
                const zone = zones.find((z) => z.name === iface.zone)
                return (
                  <div
                    key={iface.id}
                    className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{iface.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-mono">
                          {iface.ip ? `${iface.ip}/${iface.mask}` : 'DHCP'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                          iface.enabled
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {iface.enabled ? '●' : '○'} {iface.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="px-4 py-3 space-y-2">
                      {/* Zone Info */}
                      <div className="flex items-start justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Zone:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{iface.zone}</span>
                      </div>

                      {/* Gateway */}
                      {iface.gateway && (
                        <div className="flex items-start justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Gateway:</span>
                          <span className="font-mono text-gray-900 dark:text-gray-100">{iface.gateway}</span>
                        </div>
                      )}

                      {/* Policy */}
                      {zone && (
                        <div className="flex items-start justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Policy:</span>
                          <span className="text-gray-900 dark:text-gray-100">
                            <span className="inline-block mr-1">
                              {zone.inPolicy === 'ACCEPT' ? (
                                <span className="text-green-600 dark:text-green-400">✓</span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">✕</span>
                              )}
                            </span>
                            {zone.inPolicy}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {iface.notes && (
                        <div className="pt-1 border-t border-gray-200 dark:border-gray-800">
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">{iface.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer - Actions */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                      <button
                        onClick={() => openEditInterface(iface)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => openEditInterface(iface)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <RefreshCw size={13} />
                        Status
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interface Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        title={editingInterface ? 'Edit Interface' : 'Add Interface'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Interface Name</label>
            <input
              disabled={!!editingInterface}
              type="text"
              className={`input ${editingInterface ? 'opacity-75 cursor-not-allowed' : ''}`}
              placeholder="e.g., eth0, wlan0"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">IP Address</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 192.168.1.10"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Netmask / CIDR</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 24 or 255.255.255.0"
                value={formData.mask}
                onChange={(e) => setFormData({ ...formData, mask: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Gateway</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., 192.168.1.1"
              value={formData.gateway}
              onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Zone</label>
            <select
              className="input"
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            >
              <option value="">Select a zone</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.name}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g., WAN interface, LAN interface"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="enabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Enabled
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={handleSaveInterface} className="btn-primary flex-1">
              Save Interface
            </button>
            <button
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Zone Modal */}
      <Modal
        isOpen={showZoneModal}
        onClose={() => {
          setShowZoneModal(false)
          resetZoneForm()
        }}
        title={editingZone ? 'Edit Zone' : 'Add Zone'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Zone Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., public, private, dmz"
              value={zoneFormData.name}
              onChange={(e) => setZoneFormData({ ...zoneFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g., Public internet-facing network"
              value={zoneFormData.description}
              onChange={(e) => setZoneFormData({ ...zoneFormData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Target</label>
              <select
                className="input"
                value={zoneFormData.target}
                onChange={(e) => setZoneFormData({ ...zoneFormData, target: e.target.value as any })}
              >
                <option value="ACCEPT">ACCEPT</option>
                <option value="DROP">DROP</option>
                <option value="REJECT">REJECT</option>
              </select>
            </div>

            <div>
              <label className="label">In Policy</label>
              <select
                className="input"
                value={zoneFormData.inPolicy}
                onChange={(e) => setZoneFormData({ ...zoneFormData, inPolicy: e.target.value as any })}
              >
                <option value="ACCEPT">ACCEPT</option>
                <option value="DROP">DROP</option>
                <option value="REJECT">REJECT</option>
              </select>
            </div>

            <div>
              <label className="label">Out Policy</label>
              <select
                className="input"
                value={zoneFormData.outPolicy}
                onChange={(e) => setZoneFormData({ ...zoneFormData, outPolicy: e.target.value as any })}
              >
                <option value="ACCEPT">ACCEPT</option>
                <option value="DROP">DROP</option>
                <option value="REJECT">REJECT</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={handleSaveZone} className="btn-primary flex-1">
              Save Zone
            </button>
            <button
              onClick={() => {
                setShowZoneModal(false)
                resetZoneForm()
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
