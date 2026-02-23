
import { useEffect, useState } from 'react'
import { Plus, Play, RotateCcw, Pencil, Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRules } from '../hooks/useRules'
import { AddRuleModal } from '../components/AddRuleModal'
import { EditRuleModal } from '../components/EditRuleModal'
import { ActionBadge } from '../components/ActionBadge'
import type { Rule, CreateRulePayload } from '../types'

interface SortableRowProps {
  rule: Rule
  onEdit: (rule: Rule) => void
  onDelete: (id: string) => void
  onToggle: (rule: Rule) => void
}

function SortableRow({ rule, onEdit, onDelete, onToggle }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <td className="px-4 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-gray-500">{rule.id.slice(0, 8)}</span>
      </td>
      <td className="px-4 py-3 font-medium text-sm">{rule.chain}</td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{rule.protocol}</td>
      <td className="px-4 py-3 font-mono text-xs">{rule.src || '*'}</td>
      <td className="px-4 py-3 font-mono text-xs">{rule.dst || '*'}</td>
      <td className="px-4 py-3 font-mono text-xs">{rule.dstPort || '*'}</td>
      <td className="px-4 py-3">
        <ActionBadge action={rule.action} />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggle(rule)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            rule.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              rule.enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">{rule.comment}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(rule)}
            className="text-gray-400 hover:text-blue-500 transition-colors"
            aria-label="Edit rule"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Delete rule"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function RulesPage() {
  const {
    rules,
    loading,
    applying,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    applyRules,
    rollback,
    setRules,
  } = useRules()

  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Rule | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const filtered = rules.filter((r) => {
    const q = filter.toLowerCase()
    return (
      r.chain.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q) ||
      r.src.includes(q) ||
      r.dst.includes(q)
    )
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = rules.findIndex((r) => r.id === active.id)
    const newIndex = rules.findIndex((r) => r.id === over.id)
    const reordered = arrayMove(rules, oldIndex, newIndex).map((r, i) => ({
      ...r,
      position: i,
    }))
    setRules(reordered)
  }

  async function handleToggle(rule: Rule) {
    await updateRule(rule.id, { ...rule, enabled: !rule.enabled })
  }

  async function handleCreate(payload: CreateRulePayload) {
    await createRule({ ...payload, position: rules.length })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Firewall Rules</h1>
          <p className="text-sm text-gray-500 mt-1">{rules.length} rules configured</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost"
            onClick={rollback}
            disabled={applying}
            title="Rollback to last applied snapshot"
          >
            <RotateCcw size={16} />
            Rollback
          </button>
          <button
            className="btn-success"
            onClick={applyRules}
            disabled={applying}
            title="Atomically apply all rules to kernel via iptables-restore"
          >
            <Play size={16} />
            {applying ? 'Applying...' : 'Apply to Kernel'}
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Rule
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <input
            className="input max-w-sm"
            placeholder="Filter rules…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Chain</th>
                  <th className="px-4 py-3">Proto</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Dest</th>
                  <th className="px-4 py-3">Port</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3">Comment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={filtered.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-16 text-center text-gray-400 text-sm"
                        >
                          {filter ? 'No rules match your filter.' : 'No rules yet. Add one to get started.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((rule) => (
                        <SortableRow
                          key={rule.id}
                          rule={rule}
                          onEdit={setEditTarget}
                          onDelete={deleteRule}
                          onToggle={handleToggle}
                        />
                      ))
                    )}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddRuleModal
          onClose={() => setShowAdd(false)}
          onSubmit={handleCreate}
        />
      )}

      {editTarget && (
        <EditRuleModal
          rule={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(payload) => updateRule(editTarget.id, payload)}
        />
      )}
    </div>
  )
}