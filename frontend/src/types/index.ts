export type Chain = 'INPUT' | 'OUTPUT' | 'FORWARD'
export type Protocol = 'tcp' | 'udp' | 'icmp' | 'all'
export type Action = 'ACCEPT' | 'DROP' | 'REJECT' | 'LOG'
export type NATType = 'SNAT' | 'DNAT'
export type PolicyType = 'ACCEPT' | 'DROP' | 'REJECT'

export interface Rule {
  id: string
  chain: Chain
  protocol: Protocol
  src: string
  dst: string
  srcPort: string
  dstPort: string
  action: Action
  enabled: boolean
  comment: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateRulePayload {
  chain: Chain
  protocol: Protocol
  src: string
  dst: string
  srcPort: string
  dstPort: string
  action: Action
  enabled: boolean
  comment: string
  position: number
}

export type UpdateRulePayload = CreateRulePayload

export interface Counter {
  chain: Chain
  rule: string
  packets: number
  bytes: number
}

export interface FirewallConfig {
  id: string
  ipForwarding: boolean
  natEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface NetworkInterface {
  id: string
  name: string
  zone: string
  enabled: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Zone {
  id: string
  name: string
  description: string
  target: PolicyType
  inPolicy: PolicyType
  outPolicy: PolicyType
  createdAt: string
  updatedAt: string
}

export interface NATRule {
  id: string
  name: string
  type: NATType
  protocol: Protocol
  inInterface: string
  outInterface: string
  sourceIP: string
  sourcePort: string
  destIP: string
  destPort: string
  nattoIP: string
  nattoPort: string
  comment: string
  enabled: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateNATRulePayload {
  name: string
  type: NATType
  protocol: Protocol
  inInterface: string
  outInterface: string
  sourceIP: string
  sourcePort: string
  destIP: string
  destPort: string
  nattoIP: string
  nattoPort: string
  comment: string
  enabled: boolean
  position: number
}

export type UpdateNATRulePayload = CreateNATRulePayload

export interface CreateInterfacePayload {
  name: string
  zone: string
  enabled: boolean
  notes: string
}

export interface UpdateInterfacePayload {
  name: string
  zone: string
  enabled: boolean
  notes: string
}

export interface CreateZonePayload {
  name: string
  description: string
  target: PolicyType
  inPolicy: PolicyType
  outPolicy: PolicyType
}

export interface UpdateZonePayload {
  name: string
  description: string
  target: PolicyType
  inPolicy: PolicyType
  outPolicy: PolicyType
}

export interface ApiResponse<T> {
  data: T
  error?: string
}