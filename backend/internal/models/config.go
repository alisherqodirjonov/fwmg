package models

import "time"

// FirewallConfig holds global firewall settings
type FirewallConfig struct {
	ID           string    `json:"id" db:"id"`
	IPForwarding bool      `json:"ipForwarding" db:"ip_forwarding"`
	NATEnabled   bool      `json:"natEnabled" db:"nat_enabled"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

// NetworkInterface represents a network interface
type NetworkInterface struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"` // e.g., eth0, wlan0
	Zone      string    `json:"zone" db:"zone"` // e.g., public, private, dmz
	Enabled   bool      `json:"enabled" db:"enabled"`
	Notes     string    `json:"notes" db:"notes"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// Zone represents a network zone/mastery (like firewalld)
type Zone struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"` // e.g., public, private, dmz
	Description string    `json:"description" db:"description"`
	Target      string    `json:"target" db:"target"`        // ACCEPT, DROP, REJECT
	InPolicy    string    `json:"inPolicy" db:"in_policy"`   // ACCEPT, DROP, REJECT
	OutPolicy   string    `json:"outPolicy" db:"out_policy"` // ACCEPT, DROP, REJECT
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

// NATRule represents a Network Address Translation rule
type NATRule struct {
	ID           string    `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Type         string    `json:"type" db:"type"`         // SNAT, DNAT
	Protocol     Protocol  `json:"protocol" db:"protocol"` // tcp, udp, all
	InInterface  string    `json:"inInterface" db:"in_interface"`
	OutInterface string    `json:"outInterface" db:"out_interface"`
	SourceIP     string    `json:"sourceIP" db:"source_ip"`     // Source IP or CIDR
	SourcePort   string    `json:"sourcePort" db:"source_port"` // Port or range
	DestIP       string    `json:"destIP" db:"dest_ip"`         // Dest IP or CIDR
	DestPort     string    `json:"destPort" db:"dest_port"`     // Port or range
	NATtoIP      string    `json:"nattoIP" db:"natto_ip"`       // IP to NAT to
	NATtoPort    string    `json:"nattoPort" db:"natto_port"`   // Port to NAT to
	Comment      string    `json:"comment" db:"comment"`
	Enabled      bool      `json:"enabled" db:"enabled"`
	Position     int       `json:"position" db:"position"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

// PortForwarding represents port forwarding configuration
type PortForwarding struct {
	ID           string    `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Protocol     Protocol  `json:"protocol" db:"protocol"`
	InInterface  string    `json:"inInterface" db:"in_interface"`
	ExternalIP   string    `json:"externalIP" db:"external_ip"`
	ExternalPort string    `json:"externalPort" db:"external_port"`
	InternalIP   string    `json:"internalIP" db:"internal_ip"`
	InternalPort string    `json:"internalPort" db:"internal_port"`
	Comment      string    `json:"comment" db:"comment"`
	Enabled      bool      `json:"enabled" db:"enabled"`
	Position     int       `json:"position" db:"position"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}
