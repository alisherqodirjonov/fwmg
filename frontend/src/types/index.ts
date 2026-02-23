export type Chain = 'INPUT' | 'OUTPUT' | 'FORWARD'
export type Protocol = 'tcp' | 'udp' | 'icmp' | 'all'
export type Action = 'ACCEPT' | 'DROP' | 'REJECT' | 'LOG'

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

export interface ApiResponse<T> {
  data: T
  error?: string
}