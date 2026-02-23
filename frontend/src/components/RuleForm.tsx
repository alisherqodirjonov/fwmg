import { useState } from 'react'
import type { Rule, CreateRulePayload, Chain, Protocol, Action } from '../types'

const CHAINS: Chain[] = ['INPUT', 'OUTPUT', 'FORWARD']
const PROTOCOLS: Protocol[] = ['tcp', 'udp', 'icmp', 'all']
const ACTIONS: Action[] = ['ACCEPT', 'DROP', 'REJECT', 'LOG']

interface Props {
  initial?: Partial<Rule>
  onSubmit: (payload: CreateRulePayload) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function emptyForm(): CreateRulePayload {
  return {
    chain: 'INPUT',
    protocol: 'tcp',
    src: '',
    dst: '',
    srcPort: '',
    dstPort: '',
    action: 'ACCEPT',
    enabled: true,
    comment: '',
    position: 0,
  }
}

export function RuleForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const [form, setForm] = useState<CreateRulePayload>({
    ...emptyForm(),
    ...initial,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof CreateRulePayload>(key: K, value: CreateRulePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Chain</label>
          <select
            className="input"
            value={form.chain}
            onChange={(e) => set('chain', e.target.value as Chain)}
          >
            {CHAINS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Protocol</label>
          <select
            className="input"
            value={form.protocol}
            onChange={(e) => set('protocol', e.target.value as Protocol)}
          >
            {PROTOCOLS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Source IP / CIDR</label>
          <input
            className="input"
            placeholder="0.0.0.0/0"
            value={form.src}
            onChange={(e) => set('src', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Destination IP / CIDR</label>
          <input
            className="input"
            placeholder="0.0.0.0/0"
            value={form.dst}
            onChange={(e) => set('dst', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Source Port</label>
          <input
            className="input"
            placeholder="e.g. 80 or 1024:65535"
            value={form.srcPort}
            onChange={(e) => set('srcPort', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Destination Port</label>
          <input
            className="input"
            placeholder="e.g. 443"
            value={form.dstPort}
            onChange={(e) => set('dstPort', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Action</label>
          <select
            className="input"
            value={form.action}
            onChange={(e) => set('action', e.target.value as Action)}
          >
            {ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Position</label>
          <input
            type="number"
            className="input"
            value={form.position}
            onChange={(e) => set('position', parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      <div>
        <label className="label">Comment</label>
        <input
          className="input"
          placeholder="Optional description"
          maxLength={128}
          value={form.comment}
          onChange={(e) => set('comment', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="enabled"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={form.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">
          Enabled
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}