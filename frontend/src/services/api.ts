import axios from 'axios'
import type { Rule, CreateRulePayload, UpdateRulePayload, Counter } from '../types'

const API_KEY = import.meta.env.VITE_API_KEY ?? 'dev-insecure-key-change-in-production'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 15_000,
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message: string =
      err.response?.data?.error ?? err.message ?? 'Unknown error'
    return Promise.reject(new Error(message))
  }
)

export const api = {
  // Rules
  getRules: async (): Promise<Rule[]> => {
    const res = await client.get<{ rules: Rule[] }>('/rules')
    return res.data.rules ?? []
  },

  createRule: async (payload: CreateRulePayload): Promise<Rule> => {
    const res = await client.post<{ rule: Rule }>('/rules', payload)
    return res.data.rule
  },

  updateRule: async (id: string, payload: UpdateRulePayload): Promise<Rule> => {
    const res = await client.put<{ rule: Rule }>(`/rules/${id}`, payload)
    return res.data.rule
  },

  deleteRule: async (id: string): Promise<void> => {
    await client.delete(`/rules/${id}`)
  },

  // Firewall control
  applyRules: async (): Promise<void> => {
    await client.post('/apply')
  },

  rollback: async (): Promise<void> => {
    await client.post('/rollback')
  },

  getCounters: async (): Promise<Counter[]> => {
    const res = await client.get<{ counters: Counter[] }>('/counters')
    return res.data.counters ?? []
  },

  health: async (): Promise<{ status: string }> => {
    const res = await client.get<{ status: string }>('/health')
    return res.data
  },
}