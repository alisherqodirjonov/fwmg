package models

import "time"

// Chain represents an iptables chain
type Chain string

const (
	ChainINPUT   Chain = "INPUT"
	ChainOUTPUT  Chain = "OUTPUT"
	ChainFORWARD Chain = "FORWARD"
)

// Protocol represents a network protocol
type Protocol string

const (
	ProtocolTCP  Protocol = "tcp"
	ProtocolUDP  Protocol = "udp"
	ProtocolICMP Protocol = "icmp"
	ProtocolAll  Protocol = "all"
)

// Action represents what to do with a matching packet
type Action string

const (
	ActionACCEPT Action = "ACCEPT"
	ActionDROP   Action = "DROP"
	ActionREJECT Action = "REJECT"
	ActionLOG    Action = "LOG"
)

// Rule is the abstract firewall rule — never exposes raw iptables syntax
type Rule struct {
	ID       string    `json:"id" db:"id"`
	Chain    Chain     `json:"chain" db:"chain"`
	Protocol Protocol  `json:"protocol" db:"protocol"`
	Src      string    `json:"src" db:"src"`           // CIDR or empty
	Dst      string    `json:"dst" db:"dst"`           // CIDR or empty
	SrcPort  string    `json:"srcPort" db:"src_port"`  // single port or range "80:90"
	DstPort  string    `json:"dstPort" db:"dst_port"`  // single port or range
	Action   Action    `json:"action" db:"action"`
	Enabled  bool      `json:"enabled" db:"enabled"`
	Comment  string    `json:"comment" db:"comment"`
	Position int       `json:"position" db:"position"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// HistoryEntry records a snapshot of applied rules for rollback
type HistoryEntry struct {
	ID          string    `json:"id" db:"id"`
	Snapshot    string    `json:"snapshot" db:"snapshot"` // iptables-save output
	AppliedAt   time.Time `json:"appliedAt" db:"applied_at"`
	Description string    `json:"description" db:"description"`
}

// Counter holds traffic counter data for a rule or chain
type Counter struct {
	Chain    Chain  `json:"chain"`
	Rule     string `json:"rule"`
	Packets  uint64 `json:"packets"`
	Bytes    uint64 `json:"bytes"`
}