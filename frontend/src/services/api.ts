import axios from 'axios'
import type {
  Rule,
  CreateRulePayload,
  UpdateRulePayload,
  Counter,
  FirewallConfig,
  NetworkInterface,
  Zone,
  NATRule,
  CreateNATRulePayload,
  UpdateNATRulePayload,
  CreateInterfacePayload,
  UpdateInterfacePayload,
  CreateZonePayload,
  UpdateZonePayload,
} from '../types'

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

  // Configuration
  getConfig: async (): Promise<FirewallConfig> => {
    const res = await client.get<{ config: FirewallConfig }>('/config')
    return res.data.config
  },

  updateConfig: async (ipForwarding: boolean, natEnabled: boolean): Promise<FirewallConfig> => {
    const res = await client.post<{ config: FirewallConfig }>('/config', {
      ipForwarding,
      natEnabled,
    })
    return res.data.config
  },

  // Interfaces
  getInterfaces: async (): Promise<NetworkInterface[]> => {
    const res = await client.get<{ interfaces: NetworkInterface[] }>('/interfaces')
    return res.data.interfaces ?? []
  },

  createInterface: async (payload: CreateInterfacePayload): Promise<NetworkInterface> => {
    const res = await client.post<{ interface: NetworkInterface }>('/interfaces', payload)
    return res.data.interface
  },

  updateInterface: async (id: string, payload: UpdateInterfacePayload): Promise<NetworkInterface> => {
    const res = await client.put<{ interface: NetworkInterface }>(`/interfaces/${id}`, payload)
    return res.data.interface
  },

  deleteInterface: async (id: string): Promise<void> => {
    await client.delete(`/interfaces/${id}`)
  },

  // Zones
  getZones: async (): Promise<Zone[]> => {
    const res = await client.get<{ zones: Zone[] }>('/zones')
    return res.data.zones ?? []
  },

  createZone: async (payload: CreateZonePayload): Promise<Zone> => {
    const res = await client.post<{ zone: Zone }>('/zones', payload)
    return res.data.zone
  },

  updateZone: async (id: string, payload: UpdateZonePayload): Promise<Zone> => {
    const res = await client.put<{ zone: Zone }>(`/zones/${id}`, payload)
    return res.data.zone
  },

  deleteZone: async (id: string): Promise<void> => {
    await client.delete(`/zones/${id}`)
  },

  // NAT Rules
  getNATRules: async (): Promise<NATRule[]> => {
    const res = await client.get<{ natRules: NATRule[] }>('/nat-rules')
    return res.data.natRules ?? []
  },

  createNATRule: async (payload: CreateNATRulePayload): Promise<NATRule> => {
    const res = await client.post<{ natRule: NATRule }>('/nat-rules', payload)
    return res.data.natRule
  },

  updateNATRule: async (id: string, payload: UpdateNATRulePayload): Promise<NATRule> => {
    const res = await client.put<{ natRule: NATRule }>(`/nat-rules/${id}`, payload)
    return res.data.natRule
  },

  deleteNATRule: async (id: string): Promise<void> => {
    await client.delete(`/nat-rules/${id}`)
  },

  health: async (): Promise<{ status: string }> => {
    const res = await client.get<{ status: string }>('/health')
    return res.data
  },
}