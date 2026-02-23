import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { Rule, CreateRulePayload, UpdateRulePayload } from '../types'
import { api } from '../services/api'

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getRules()
      setRules(data)
    } catch (err) {
      toast.error(`Failed to fetch rules: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const createRule = useCallback(async (payload: CreateRulePayload) => {
    const rule = await api.createRule(payload)
    setRules((prev) => [...prev, rule].sort((a, b) => a.position - b.position))
    toast.success('Rule created')
    return rule
  }, [])

  const updateRule = useCallback(async (id: string, payload: UpdateRulePayload) => {
    const rule = await api.updateRule(id, payload)
    setRules((prev) => prev.map((r) => (r.id === id ? rule : r)))
    toast.success('Rule updated')
    return rule
  }, [])

  const deleteRule = useCallback(async (id: string) => {
    await api.deleteRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
    toast.success('Rule deleted')
  }, [])

  const applyRules = useCallback(async () => {
    setApplying(true)
    try {
      await api.applyRules()
      toast.success('Ruleset applied to kernel ✓')
    } catch (err) {
      toast.error(`Apply failed: ${(err as Error).message}`)
      throw err
    } finally {
      setApplying(false)
    }
  }, [])

  const rollback = useCallback(async () => {
    setApplying(true)
    try {
      await api.rollback()
      toast.success('Rolled back to previous snapshot')
    } catch (err) {
      toast.error(`Rollback failed: ${(err as Error).message}`)
      throw err
    } finally {
      setApplying(false)
    }
  }, [])

  return {
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
  }
}