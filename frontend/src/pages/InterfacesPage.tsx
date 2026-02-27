import { useState, useEffect } from 'react'
import { Trash2, Plus, Edit2, Network } from 'lucide-react'
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
        const updated = await api.updateInterface(editingInterface.id, {
          name: formData.name,
          zone: formData.zone,
          enabled: formData.enabled,
          notes: formData.notes,
        })
        setInterfaces(interfaces.map((i) => (i.id === updated.id ? updated : i)))
        toast.success('Interface updated')
      } else {
        const created = await api.createInterface({
          name: formData.name,
          zone: formData.zone,
          enabled: formData.enabled,
          notes: formData.notes,
        })
        setInterfaces([...interfaces, created])
        toast.success('Interface created')
      }
      resetForm()
      setShowModal(false)
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function handleDeleteInterface(id: string) {
    if (!window.confirm('Delete this interface?')) return
    try {
      await api.deleteInterface(id)
      setInterfaces(interfaces.filter((i) => i.id !== id))
      toast.success('Interface deleted')
    } catch (error) {
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Network size={32} className="text-blue-600" />
          Interface Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure network interfaces and firewall zones</p>
      </div>

      {/* Zones Section */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Firewall Zones</h2>
            <p className="text-sm text-gray-500 mt-1">Define zone policies for network segmentation</p>
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Target</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">In Policy</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Out Policy</th>
                <th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    No zones defined
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{zone.name}</div>
                      {zone.description && (
                        <div className="text-xs text-gray-500">{zone.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge badge-info">{zone.target}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${zone.inPolicy === 'ACCEPT' ? 'badge-success' : 'badge-error'}`}>
                        {zone.inPolicy}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${zone.outPolicy === 'ACCEPT' ? 'badge-success' : 'badge-error'}`}>
                        {zone.outPolicy}
                      </span>
                    </td>
                    <td className="py-3 px-4 space-x-2">
                      <button
                        onClick={() => openEditZone(zone)}
                        className="btn-sm btn-secondary inline-flex items-center gap-1"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
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

      {/* Interfaces Section */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Network Interfaces</h2>
            <p className="text-sm text-gray-500 mt-1">Manage and assign interfaces to zones</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interfaces.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No interfaces configured
            </div>
          ) : (
            interfaces.map((iface) => {
              const zone = zones.find((z) => z.name === iface.zone)
              return (
                <div key={iface.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{iface.name}</h3>
                        {iface.notes && (
                          <p className="text-xs text-gray-500 mt-1">{iface.notes}</p>
                        )}
                      </div>
                      <span className={`badge ${iface.enabled ? 'badge-success' : 'badge-warning'}`}>
                        {iface.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Zone:</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{iface.zone}</div>
                      {zone && (
                        <div className="text-xs text-gray-500 mt-1">
                          Policy: {zone.inPolicy} (in) / {zone.outPolicy} (out)
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => openEditInterface(iface)}
                        className="btn-sm btn-secondary flex-1 inline-flex items-center justify-center gap-1"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInterface(iface.id)}
                        className="btn-sm btn-error flex-1 inline-flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
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
              type="text"
              className="input"
              placeholder="e.g., eth0, wlan0"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
